-- ============================================
-- SandíaShake MFA Email Codes Table Setup
-- ============================================
-- Run this in Supabase SQL Editor
-- This creates the table for storing email MFA verification codes

-- Create table to store email MFA codes
CREATE TABLE IF NOT EXISTS mfa_email_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_mfa_email_codes_user_id ON mfa_email_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_email_codes_expires_at ON mfa_email_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_mfa_email_codes_used ON mfa_email_codes(used);

-- Enable RLS (Row Level Security)
ALTER TABLE mfa_email_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own codes" ON mfa_email_codes;
DROP POLICY IF EXISTS "Service role can manage all codes" ON mfa_email_codes;

-- Policy: Users can only read their own codes (for verification)
CREATE POLICY "Users can read own codes"
  ON mfa_email_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all codes (for API routes using admin client)
CREATE POLICY "Service role can manage all codes"
  ON mfa_email_codes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to delete expired MFA codes (cleanup)
CREATE OR REPLACE FUNCTION delete_expired_mfa_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM mfa_email_codes
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the cleanup function
GRANT EXECUTE ON FUNCTION delete_expired_mfa_codes() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_expired_mfa_codes() TO service_role;

-- Optional: You can schedule this to run periodically with pg_cron
-- Or you can manually run: SELECT delete_expired_mfa_codes();

-- Verify the table was created
SELECT
  'mfa_email_codes table created successfully!' as status,
  COUNT(*) as initial_count
FROM mfa_email_codes;
