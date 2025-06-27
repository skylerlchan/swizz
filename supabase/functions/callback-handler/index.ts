/*
  # Callback Handler TwiML

  1. TwiML Generation
    - Handles callback call flow
    - Connects user to ongoing call or representative
    - Provides instructions and call bridging
*/

import { corsHeaders } from '../_shared/cors.ts'

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
    const originalCallSid = url.searchParams.get('originalCallSid')

    if (!callId) {
      throw new Error('Missing callId parameter')
    }

    // Generate TwiML for callback
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Hello! This is Swizz calling you back. A human representative is now available to speak with you about your request.</Say>
    <Pause length="1" />
    <Say voice="alice">I'm now connecting you to the representative. Please hold for a moment.</Say>
    ${originalCallSid ? `<Dial><Conference>${originalCallSid}</Conference></Dial>` : '<Say voice="alice">The representative will be with you shortly.</Say>'}
    <Say voice="alice">Thank you for using Swizz. Have a great day!</Say>
</Response>`

    return new Response(twiml, {
      headers: {
        'Content-Type': 'text/xml',
        ...corsHeaders,
      },
    })
  } catch (error) {
    console.error('Error generating callback TwiML:', error)
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">I'm sorry, there was an error with your callback. Please try calling back directly.</Say>
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