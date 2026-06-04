-- ============================================
-- CARD VOICE FILL LOGGING
-- ============================================

alter table public.ai_logs
  drop constraint if exists ai_logs_function_type_check;

alter table public.ai_logs
  add constraint ai_logs_function_type_check
  check (
    function_type in (
      'entity_extraction',
      'riff',
      'report',
      'polish',
      'campaign_setup',
      'card_voice_fill'
    )
  );

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
      'card_voice_transcription_seconds',
      'card_voice_transcription_upload',
      'transcription_error'
    )
  );
