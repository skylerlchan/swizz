/*
  # Add Twilio Integration Fields

  1. New Columns
    - `twilio_call_sid` (text) - Twilio call identifier
    - `call_duration` (integer) - Call duration in seconds
    - `ai_responses_count` (integer) - Number of AI responses
    - `human_detected_at` (timestamp) - When human was first detected
  2. Indexes
    - Add index on twilio_call_sid for webhook lookups
  3. Security
    - Update RLS policies to include new fields
*/

-- Add new columns for Twilio integration
ALTER TABLE calls ADD COLUMN IF NOT EXISTS twilio_call_sid text;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_duration integer DEFAULT 0;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS ai_responses_count integer DEFAULT 0;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS human_detected_at timestamptz;

-- Add index for Twilio SID lookups
CREATE INDEX IF NOT EXISTS calls_twilio_call_sid_idx ON calls (twilio_call_sid);

-- Update RLS policies to include new fields (policies already exist, just ensuring they work with new columns)
-- The existing policies will automatically cover the new columns since they use user_id filtering