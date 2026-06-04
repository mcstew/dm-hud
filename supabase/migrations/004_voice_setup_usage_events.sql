-- ============================================
-- VOICE SETUP USAGE EVENTS
-- ============================================

alter table public.usage_events
  drop constraint if exists usage_events_event_type_check;

alter table public.usage_events
  add constraint usage_events_event_type_check
  check (
    event_type in (
      'app_open',
      'live_transcription_started',
      'live_transcription_seconds',
      'file_transcription_seconds',
      'file_transcription_upload',
      'setup_transcription_seconds',
      'setup_transcription_upload',
      'transcription_error'
    )
  );
