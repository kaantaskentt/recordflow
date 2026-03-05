-- Expand session status to include "analyzing"
ALTER TABLE sessions
  DROP CONSTRAINT sessions_status_check,
  ADD CONSTRAINT sessions_status_check
    CHECK (status IN ('pending', 'recording', 'processing', 'analyzing', 'reviewed'));

-- Track which analysis stage is active + any error
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS analysis_stage text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS analysis_error text;

-- Track narration source (voice during recording, typed during recording, or post-recording note)
ALTER TABLE narrations ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'voice'
  CHECK (source IN ('voice', 'typed', 'post_recording'));
