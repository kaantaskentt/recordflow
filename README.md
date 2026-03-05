# RecordFlow

AI-powered process discovery for solutions architects. Record how people actually work, let AI extract every step, and get structured automation specs.

## What It Does

1. **Record** -- Share your screen and narrate your workflow. RecordFlow captures video, audio, screenshots (every 7s), and real-time voice transcription simultaneously.

2. **Analyze** -- Two AI models work together. Gemini 2.5 Flash watches your screen frames and extracts structured steps. Claude Sonnet 4.6 detects gaps in the process and generates targeted follow-up questions.

3. **Discover** -- Get a complete breakdown: every step classified by automation potential (automate / AI-assist / manual), tools detected, data sources mapped, and a build spec ready for any builder.

## Core Features

- **Briefing System** -- Paste a discovery call transcript before recording. AI extracts context, tools, pain points, and generates a watch list so it knows what to look for.
- **Screen + Voice Capture** -- Browser-based recording with `getDisplayMedia` + `getUserMedia`. Web Speech API provides live transcription. No plugins needed.
- **Dual AI Pipeline** -- Gemini handles vision-heavy tasks (frame analysis, step extraction) at $0.30/1M tokens. Claude handles reasoning tasks (gap detection, briefing analysis) at $3/1M tokens.
- **Smart Follow-Ups** -- AI spots what's missing in the recorded process and generates questions tied to specific steps.
- **Build Spec Export** -- Generates automation specifications with time savings estimates, complexity breakdowns, and recommendations. Export as JSON, Markdown, or PDF.
- **Shareable Recording Links** -- Send a link to anyone. They record their screen without needing an account.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) / React 19 / TypeScript |
| Styling | Tailwind CSS v4, dark theme with green accent |
| Database | Supabase (PostgreSQL + Storage) |
| AI (Vision) | Gemini 2.5 Flash |
| AI (Reasoning) | Claude Sonnet 4.6 |
| PDF Export | @react-pdf/renderer |
| Validation | Zod |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- [Anthropic API key](https://console.anthropic.com)
- [Google AI API key](https://aistudio.google.com/apikey)

### 1. Clone and install

```bash
git clone https://github.com/kaantaskentt/recordflow.git
cd recordflow
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/migrations/001_initial.sql`, then `002_project_tags.sql`
3. Go to **Storage** and create a bucket called `recordings` (set to public)
4. Copy your Project URL and anon key from **Settings > API**

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in your keys:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create a project, paste a briefing transcript, create a session, record your screen, and watch the AI analysis run.

## Project Structure

```
src/
  app/
    api/              # 17 API routes (projects, sessions, steps, follow-ups, analysis)
    dashboard/        # Project list, project detail, session detail
    record/           # Browser-based recording interface
  lib/
    ai/               # AI providers (claude.ts, gemini.ts), prompts, analysis pipeline
    spec/             # Build spec generator + PDF export
    types.ts          # TypeScript interfaces
    validations.ts    # Zod schemas
    supabase.ts       # Database client
supabase/
  migrations/         # SQL schema (5 tables: projects, sessions, steps, follow_ups, narrations)
```

## How the AI Pipeline Works

```
Recording Frames (every 7s)
       |
       v
[Gemini 2.5 Flash] -- Frame Analysis (app, action, data visible, data flow)
       |
       v
[Gemini 2.5 Flash] -- Step Extraction (merges frames + narrations into structured steps)
       |
       v
[Claude Sonnet 4.6] -- Gap Detection (compares steps against briefing watch list)
       |
       v
[Gemini 2.5 Flash] -- Follow-Up Generation (targeted questions for missing info)
```

Narrations from voice transcription are matched to frames by timestamp proximity (10s window) before step extraction.

## Browser Support

Recording requires `getDisplayMedia` and `MediaRecorder` APIs. Works in Chrome and Edge. Safari has limited support.

## License

MIT
