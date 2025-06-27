/*
  # Callback User Endpoint

  1. Callback Functionality
    - Uses Twilio to call the user when human picks up
    - Triggered by webhook events or manual request
    - Connects user to the ongoing call
  2. Call Management
    - Updates call status and metadata
    - Handles call bridging and transfer
*/

import { corsHeaders } from '../_shared/cors.ts'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface CallbackRequest {
  callId: string
  userPhone: string
  originalCallSid?: string
}

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

    const { callId, userPhone, originalCallSid }: CallbackRequest = await req.json()

    if (!callId || !userPhone) {
      throw new Error('Missing required parameters')
    }

    // Update call status to callback in progress
    await fetch(`${SUPABASE_URL}/rest/v1/calls?id=eq.${callId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({
        status: 'callback_in_progress',
        callback_requested: true,
      }),
    })

    // Initiate callback to user
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`
    const callbackHandlerUrl = `${SUPABASE_URL}/functions/v1/callback-handler?callId=${callId}&originalCallSid=${originalCallSid || ''}`

    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
    
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: userPhone,
        From: TWILIO_PHONE_NUMBER!,
        Url: callbackHandlerUrl,
        StatusCallback: `${SUPABASE_URL}/functions/v1/call-status-webhook`,
        StatusCallbackEvent: 'initiated,ringing,answered,completed',
        StatusCallbackMethod: 'POST',
      }),
    })

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text()
      throw new Error(`Twilio API error: ${error}`)
    }

    const twilioCall = await twilioResponse.json()

    // Log callback initiation
    await addTranscription(callId, 'ai', 'Callback initiated - calling user now')

    return new Response(
      JSON.stringify({
        success: true,
        callbackSid: twilioCall.sid,
        status: twilioCall.status,
        message: 'Callback initiated successfully',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  } catch (error) {
    console.error('Error initiating callback:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
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