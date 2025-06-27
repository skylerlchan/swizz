/*
  # Voice Handler TwiML Endpoint

  1. TwiML Response
    - Generates TwiML to connect call to WebSocket stream
    - Uses Twilio <Stream> to send live audio
    - Handles call flow and audio streaming
  2. WebSocket Integration
    - Connects to audio-stream WebSocket server
    - Manages bidirectional audio streaming
*/

import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')

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

    // Generate WebSocket URL for audio streaming
    const wsUrl = `wss://${url.host}/functions/v1/audio-stream?callId=${callId}&userPhone=${encodeURIComponent(userPhone)}&callReason=${encodeURIComponent(callReason)}`

    // Generate TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Hello, I'm Swizz, your AI assistant. I'm calling on behalf of my user regarding ${callReason.replace(/[<>&"']/g, '')}. Please hold while I connect you.</Say>
    <Start>
        <Stream url="${wsUrl}" />
    </Start>
    <Say voice="alice">Thank you for your patience. I'm now ready to assist you with this matter.</Say>
    <Pause length="300" />
</Response>`

    return new Response(twiml, {
      headers: {
        'Content-Type': 'text/xml',
        ...corsHeaders,
      },
    })
  } catch (error) {
    console.error('Error generating TwiML:', error)
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">I'm sorry, there was an error connecting the call. Please try again later.</Say>
    <Hangup />
</Response>`

    return new Response(errorTwiml, {
      status: 500,
      headers: {
        'Content-Type': 'text/xml',
        ...corsHeaders,
      },
    })
  }
})