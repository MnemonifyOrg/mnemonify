-- Render/free-tier deployments can disable local Whisper while retaining the
-- manual VTT/SRT and transcript-editing workflow.
ALTER TABLE captions DROP CONSTRAINT IF EXISTS captions_status_check;
ALTER TABLE captions
  ADD CONSTRAINT captions_status_check
  CHECK (status IN ('generating', 'ready', 'failed', 'manual_required'));
