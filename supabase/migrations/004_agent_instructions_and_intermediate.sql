ALTER TABLE projects ADD COLUMN IF NOT EXISTS agent_instructions jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS instructions_generated_at timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS instructions_error text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS analysis_intermediate jsonb;
