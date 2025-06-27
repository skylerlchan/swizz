/*
  # Audio Stream WebSocket Server

  1. WebSocket Server
    - Accepts incoming audio from Twilio
    - Manages bidirectional audio streaming
    - Handles real-time audio processing
  2. AI Integration
    - Uses Whisper (STT) to transcribe audio
    - Feeds transcript to GPT-4 for responses
    - Uses ElevenLabs for voice synthesis
  3. Database Logging
    - Logs transcripts and call metadata
    - Updates call status in real-time
*/

import { corsHeaders } from '../_shared/cors.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface StreamMessage {
  event: string
  sequenceNumber?: string
  media?: {
    track: string
    chunk: string
    timestamp: string
    payload: string
  }
  start?: {
    streamSid: string
    accountSid: string
    callSid: string
  }
}

interface CallContext {
  callId: string
  userPhone: string
  callReason: string
  conversationHistory: Array<{ role: string; content: string }>
  isHumanDetected: boolean
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const url = new URL(req.url)
    const callId = url.searchParams.get('callId')
    const userPhone = url.searchParams.get('userPhone')
    const callReason = url.searchParams.get('callReason')

    if (!callId || !userPhone || !callReason) {
      throw new Error('Missing required parameters')
    }

    const { socket, response } = Deno.upgradeWebSocket(req)

    const callContext: CallContext = {
      callId,
      userPhone: decodeURIComponent(userPhone),
      callReason: decodeURIComponent(callReason),
      conversationHistory: [
        {
          role: 'system',
          content: `You are Swizz, an AI phone assistant. You are calling on behalf of a user about: "${callReason}". 
          
          Your goals:
          1. Navigate phone menus and wait on hold
          2. Explain the user's issue clearly to human representatives
          3. Detect when a human answers (vs automated systems)
          4. Be polite, professional, and helpful
          5. If you detect a human representative, immediately notify the system
          
          Keep responses concise and natural. If you hear hold music or automated messages, acknowledge briefly and wait.`
        }
      ],
      isHumanDetected: false,
    }

    let audioBuffer: Uint8Array[] = []
    let streamSid: string | null = null

    socket.onopen = () => {
      console.log('WebSocket connection opened for call:', callId)
    }

    socket.onmessage = async (event) => {
      try {
        const message: StreamMessage = JSON.parse(event.data)
        
        switch (message.event) {
          case 'connected':
            console.log('Twilio stream connected')
            break
            
          case 'start':
            streamSid = message.start?.streamSid || null
            console.log('Stream started:', streamSid)
            await updateCallStatus(callId, 'calling')
            break
            
          case 'media':
            if (message.media?.payload) {
              // Decode base64 audio payload
              const audioChunk = Uint8Array.from(atob(message.media.payload), c => c.charCodeAt(0))
              audioBuffer.push(audioChunk)
              
              // Process audio in chunks (every ~2 seconds)
              if (audioBuffer.length >= 20) {
                await processAudioChunk(audioBuffer, callContext, streamSid)
                audioBuffer = []
              }
            }
            break
            
          case 'stop':
            console.log('Stream stopped')
            await updateCallStatus(callId, 'completed')
            break
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error)
      }
    }

    socket.onclose = () => {
      console.log('WebSocket connection closed for call:', callId)
    }

    socket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return response
  } catch (error) {
    console.error('Error setting up WebSocket:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
})

async function processAudioChunk(
  audioBuffer: Uint8Array[],
  callContext: CallContext,
  streamSid: string | null
) {
  try {
    // Combine audio chunks
    const totalLength = audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0)
    const combinedAudio = new Uint8Array(totalLength)
    let offset = 0
    
    for (const chunk of audioBuffer) {
      combinedAudio.set(chunk, offset)
      offset += chunk.length
    }

    // Convert to WAV format for Whisper
    const wavAudio = await convertToWav(combinedAudio)
    
    // Transcribe with Whisper
    const transcript = await transcribeAudio(wavAudio)
    
    if (transcript && transcript.trim().length > 0) {
      console.log('Transcribed:', transcript)
      
      // Log transcription
      await addTranscription(callContext.callId, 'human', transcript)
      
      // Detect if human is speaking (vs automated system)
      const isHuman = await detectHuman(transcript)
      
      if (isHuman && !callContext.isHumanDetected) {
        callContext.isHumanDetected = true
        await updateCallStatus(callContext.callId, 'connected_to_human')
        
        // Notify user that human is available
        await notifyUserHumanAvailable(callContext.callId, callContext.userPhone)
      }
      
      // Generate AI response
      callContext.conversationHistory.push({ role: 'user', content: transcript })
      const aiResponse = await generateAIResponse(callContext)
      
      if (aiResponse) {
        // Log AI response
        await addTranscription(callContext.callId, 'ai', aiResponse)
        
        // Convert to speech and send back
        const audioResponse = await textToSpeech(aiResponse)
        if (audioResponse && streamSid) {
          await sendAudioToTwilio(audioResponse, streamSid)
        }
      }
    }
  } catch (error) {
    console.error('Error processing audio chunk:', error)
  }
}

async function convertToWav(audioData: Uint8Array): Promise<Blob> {
  // Simple WAV header creation for 8kHz, 16-bit, mono
  const sampleRate = 8000
  const numChannels = 1
  const bitsPerSample = 16
  
  const header = new ArrayBuffer(44)
  const view = new DataView(header)
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
  
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + audioData.length, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true)
  view.setUint16(32, numChannels * bitsPerSample / 8, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(36, 'data')
  view.setUint32(40, audioData.length, true)
  
  const wavData = new Uint8Array(header.byteLength + audioData.length)
  wavData.set(new Uint8Array(header), 0)
  wavData.set(audioData, header.byteLength)
  
  return new Blob([wavData], { type: 'audio/wav' })
}

async function transcribeAudio(audioBlob: Blob): Promise<string | null> {
  try {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.wav')
    formData.append('model', 'whisper-1')
    formData.append('language', 'en')
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.text || null
  } catch (error) {
    console.error('Error transcribing audio:', error)
    return null
  }
}

async function detectHuman(transcript: string): Promise<boolean> {
  // Simple heuristics to detect human vs automated system
  const humanIndicators = [
    'hello', 'hi', 'how can i help', 'speaking', 'this is', 'my name is',
    'what can i do for you', 'how may i assist', 'good morning', 'good afternoon'
  ]
  
  const automatedIndicators = [
    'press', 'dial', 'enter', 'menu', 'option', 'please hold', 'your call is important',
    'estimated wait time', 'all representatives are busy', 'thank you for calling'
  ]
  
  const lowerTranscript = transcript.toLowerCase()
  
  const humanScore = humanIndicators.filter(indicator => 
    lowerTranscript.includes(indicator)
  ).length
  
  const automatedScore = automatedIndicators.filter(indicator => 
    lowerTranscript.includes(indicator)
  ).length
  
  return humanScore > automatedScore && humanScore > 0
}

async function generateAIResponse(callContext: CallContext): Promise<string | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: callContext.conversationHistory,
        max_tokens: 150,
        temperature: 0.7,
      }),
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }
    
    const result = await response.json()
    const aiResponse = result.choices[0]?.message?.content
    
    if (aiResponse) {
      callContext.conversationHistory.push({ role: 'assistant', content: aiResponse })
    }
    
    return aiResponse || null
  } catch (error) {
    console.error('Error generating AI response:', error)
    return null
  }
}

async function textToSpeech(text: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ELEVENLABS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    })
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`)
    }
    
    return await response.arrayBuffer()
  } catch (error) {
    console.error('Error generating speech:', error)
    return null
  }
}

async function sendAudioToTwilio(audioData: ArrayBuffer, streamSid: string) {
  // Convert audio to base64 and send to Twilio
  const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioData)))
  
  const message = {
    event: 'media',
    streamSid,
    media: {
      payload: base64Audio,
    },
  }
  
  // This would be sent back through the WebSocket to Twilio
  // In a real implementation, you'd send this through the socket connection
  console.log('Sending audio to Twilio:', message)
}

async function updateCallStatus(callId: string, status: string) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/calls?id=eq.${callId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({ status }),
    })
  } catch (error) {
    console.error('Error updating call status:', error)
  }
}

async function addTranscription(callId: string, speaker: string, text: string) {
  try {
    // Get current transcription
    const response = await fetch(`${SUPABASE_URL}/rest/v1/calls?id=eq.${callId}&select=transcription`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
      },
    })
    
    const calls = await response.json()
    const currentTranscription = calls[0]?.transcription || []
    
    const newEntry = {
      timestamp: new Date().toISOString(),
      speaker,
      text,
    }
    
    const updatedTranscription = [...currentTranscription, newEntry]
    
    await fetch(`${SUPABASE_URL}/rest/v1/calls?id=eq.${callId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({ transcription: updatedTranscription }),
    })
  } catch (error) {
    console.error('Error adding transcription:', error)
  }
}

async function notifyUserHumanAvailable(callId: string, userPhone: string) {
  try {
    // Update call status to indicate human is available
    await updateCallStatus(callId, 'connected_to_human')
    
    // In a real implementation, you might send a push notification or SMS
    console.log(`Human available for call ${callId}, user phone: ${userPhone}`)
  } catch (error) {
    console.error('Error notifying user:', error)
  }
}