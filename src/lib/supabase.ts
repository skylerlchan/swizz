import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Call = {
  id: string
  user_id: string
  phone_number: string
  issue_description: string
  status: 'calling' | 'on_hold' | 'connected_to_human' | 'callback_in_progress' | 'completed' | 'failed'
  transcription: Array<{
    timestamp: string
    speaker: 'ai' | 'human' | 'user'
    text: string
  }>
  started_at: string
  completed_at?: string
  callback_requested: boolean
  human_connected_at?: string
  twilio_call_sid?: string
  call_duration?: number
  ai_responses_count?: number
  human_detected_at?: string
}