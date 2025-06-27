/*
  # Call Status Webhook

  1. Webhook Handler
    - Receives Twilio call status updates
    - Updates call records in database
    - Triggers appropriate actions based on status
*/

import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const formData = await req.formData()
    const callSid = formData.get('CallSid') as string
    const callStatus = formData.get('CallStatus') as string
    const duration = formData.get('CallDuration') as string

    if (!callSid || !callStatus) {
      throw new Error('Missing required webhook parameters')
    }

    console.log(`Call ${callSid} status: ${callStatus}`)

    // Find call by Twilio SID
    const response = await fetch(`${SUPABASE_URL}/rest/v1/calls?twilio_call_sid=eq.${callSid}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
      },
    })

    const calls = await response.json()
    const call = calls[0]

    if (!call) {
      console.log(`No call found for SID: ${callSid}`)
      return new Response('OK', { status: 200 })
    }

    // Map Twilio status to our status
    let newStatus = call.status
    let updateData: any = {}

    switch (callStatus) {
      case 'ringing':
        newStatus = 'calling'
        break
      case 'in-progress':
        newStatus = 'calling'
        break
      case 'completed':
        newStatus = 'completed'
        updateData.completed_at = new Date().toISOString()
        if (duration) {
          updateData.call_duration = parseInt(duration)
        }
        break
      case 'failed':
      case 'busy':
      case 'no-answer':
        newStatus = 'failed'
        updateData.completed_at = new Date().toISOString()
        break
    }

    // Update call status
    updateData.status = newStatus
    
    await fetch(`${SUPABASE_URL}/rest/v1/calls?id=eq.${call.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify(updateData),
    })

    // Add status update to transcription
    await addTranscription(call.id, 'ai', `Call status updated: ${callStatus}`)

    return new Response('OK', {
      status: 200,
      headers: corsHeaders,
    })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Error', {
      status: 500,
      headers: corsHeaders,
    })
  }
})

async function addTranscription(callId: string, speaker: string, text: string) {
  try {
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