CREATE TABLE IF NOT EXISTS reader_saved_audio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  source_text TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL DEFAULT 'audio/mpeg',
  audio_base64 TEXT NOT NULL,
  character_count INTEGER NOT NULL,
  chunk_count INTEGER NOT NULL,
  language_code VARCHAR(20) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reader_saved_audio_user_created_at
  ON reader_saved_audio (user_id, created_at DESC);

ALTER TABLE reader_saved_audio ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reader_saved_audio'
      AND policyname = 'Users can view their own reader audio'
  ) THEN
    CREATE POLICY "Users can view their own reader audio" ON reader_saved_audio FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;