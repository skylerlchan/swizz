/*
  # Create calls table for Swizz AI Phone Agent

  1. New Tables
    - `calls`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `phone_number` (text)
      - `issue_description` (text)
      - `status` (text) - calling, on_hold, connected_to_human, callback_in_progress, completed, failed
      - `transcription` (jsonb) - array of transcription entries
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz, optional)
      - `callback_requested` (boolean)
      - `human_connected_at` (timestamptz, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `calls` table
    - Add policy for users to read/write their own calls only
*/

CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  phone_number text NOT NULL,
  issue_description text NOT NULL,
  status text NOT NULL DEFAULT 'calling' CHECK (status IN ('calling', 'on_hold', 'connected_to_human', 'callback_in_progress', 'completed', 'failed')),
  transcription jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  callback_requested boolean DEFAULT false,
  human_connected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own calls"
  ON calls
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calls"
  ON calls
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calls"
  ON calls
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS calls_user_id_idx ON calls(user_id);
CREATE INDEX IF NOT EXISTS calls_status_idx ON calls(status);
CREATE INDEX IF NOT EXISTS calls_started_at_idx ON calls(started_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();