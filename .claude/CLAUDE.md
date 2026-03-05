# RecordIt -- Project Context

## Overview
AI-powered process discovery for solutions architects. Records client workflows via screen capture + voice narration, extracts steps with AI, classifies automation potential, and generates build specs.

## Tech Stack
- Next.js 16 (App Router) / React 19 / TypeScript
- Tailwind CSS v4 (dark theme, green accent #22c55e)
- Supabase (PostgreSQL + Storage, bucket: "recordings")
- AI: Gemini 2.5 Flash (vision/extraction) + Claude Sonnet 4.6 (reasoning)
- PDF: @react-pdf/renderer (server-side)

## AI Architecture
- **Gemini 2.5 Flash** ($0.30/1M tokens): Frame analysis, step extraction, follow-up generation
- **Claude Sonnet 4.6** ($3.00/1M tokens): Briefing analysis, gap detection
- Pipeline: Frames -> Steps -> Gap Detection -> Follow-ups
- Model IDs: `gemini-2.5-flash`, `claude-sonnet-4-6`
- Narrations matched to frames by timestamp proximity (10s window)

## Key Directories
- `src/app/api/` -- 17 API routes
- `src/app/dashboard/` -- Project list, project detail, session detail
- `src/app/record/[sessionId]/` -- Recording interface (guide -> recording -> done)
- `src/lib/ai/` -- AI providers, prompts, analysis pipeline
- `src/lib/spec/` -- Build spec generator + PDF export
- `src/lib/` -- types, supabase client, utils, validations (Zod)
- `supabase/migrations/` -- Database schema

## Database Tables
`projects`, `sessions`, `steps`, `follow_ups`, `narrations`

## Conventions
- Monospace font throughout (`font-mono`, JetBrains Mono)
- Colors: green-400/green-500 primary, dark backgrounds (#0a0a0a, #0f0f0f)
- API pattern: NextResponse.json, Supabase client, typed responses
- Components: inline in page files (no separate component directory)
- Card style: `bg-[#0f0f0f] card-glow` with green-tinted borders

## Recording Flow
1. `getDisplayMedia` for screen + system audio
2. `getUserMedia` for microphone audio
3. Web Audio API mixes both into one MediaRecorder stream
4. Web Speech API provides real-time voice transcription
5. Canvas captures frames every 7s, uploaded to Supabase Storage
6. On stop: WebM uploaded, narrations saved with timestamps, session marked "processing"
7. Auto-analysis fires in background (fire-and-forget)
