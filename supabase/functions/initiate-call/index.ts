/*
  # Initiate Call Endpoint

  1. New Edge Function
    - `initiate-call` endpoint that accepts POST requests
    - Takes userPhone, targetPhone, and callReason parameters
    - Uses Twilio Programmable Voice to dial targetPhone
    - Returns call SID and status
  2. Integration
    - Creates call record in Supabase database
    - Initiates Twilio call with TwiML webhook
*/

import { corsHeaders } from '../_shared/cors.ts'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface CallRequest {
  userPhone: string
  targetPhone: string
  callReason: string
  userId: string
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

    const { userPhone, targetPhone, callReason, userId }: CallRequest = await req.json()

    if (!userPhone || !targetPhone || !callReason || !userId) {
      throw new Error('Missing required parameters')
    }

    // Create call record in Supabase
    const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/calls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({
        user_id: userId,
        phone_number: targetPhone,
        issue_description: callReason,
        status: 'calling',
        transcription: [],
        started_at: new Date().toISOString(),
        callback_requested: false,
      }),
    })

    if (!supabaseResponse.ok) {
      throw new Error('Failed to create call record')
    }

    const callRecord = await supabaseResponse.json()
    const callId = callRecord[0]?.id

    // Initiate Twilio call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`
    const voiceHandlerUrl = `${SUPABASE_URL}/functions/v1/voice-handler?callId=${callId}&userPhone=${encodeURIComponent(userPhone)}&callReason=${encodeURIComponent(callReason)}`

    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
    
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: targetPhone,
        From: TWILIO_PHONE_NUMBER!,
        Url: voiceHandlerUrl,
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

    // Update call record with Twilio SID
    await fetch(`${SUPABASE_URL}/rest/v1/calls?id=eq.${callId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({
        twilio_call_sid: twilioCall.sid,
      }),
    })

    return new Response(
      JSON.stringify({
        success: true,
        callSid: twilioCall.sid,
        status: twilioCall.status,
        callId: callId,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  } catch (error) {
    console.error('Error initiating call:', error)
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