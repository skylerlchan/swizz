# Swizz - AI Phone Agent

This project is a demo phone assistant that uses Supabase Edge Functions and Twilio Programmable Voice. The front-end is built with React and communicates with serverless functions to place calls, stream audio, and manage call history.

## Setup

1. Install dependencies

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in the required credentials.

```bash
cp .env.example .env
```

The following variables are required:

- `VITE_SUPABASE_URL` – your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` – the anon key for your Supabase project
- `VITE_OPENAI_API_KEY` – OpenAI key used by the audio streaming function
- `VITE_ELEVENLABS_API_KEY` – ElevenLabs API key for text‑to‑speech
- `TWILIO_ACCOUNT_SID` – Twilio account identifier
- `TWILIO_AUTH_TOKEN` – Twilio auth token
- `TWILIO_PHONE_NUMBER` – phone number configured in Twilio

3. Run the development server

```bash
npm run dev
```

This starts the Vite dev server for the front‑end. Supabase Edge Functions can be deployed separately using the Supabase CLI.

## Connecting Twilio

The edge functions under `supabase/functions` handle all Twilio interactions. After setting your Twilio credentials in `.env`, deploy these functions to your Supabase project. Twilio webhooks should be pointed at the deployed `voice-handler` and `call-status-webhook` endpoints.

Refer to the code in `initiate-call`, `callback-user`, and `callback-handler` for details on how calls are initiated and callbacks are triggered.
