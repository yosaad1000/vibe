# Architecture Overview

## What This Is
A Lovable-style AI app builder. Users describe what they want, the AI generates code, and it runs live in an E2B sandbox.

## Stack
- **Framework**: Next.js 15 (App Router)
- **API**: tRPC v11 with TanStack Query
- **DB**: PostgreSQL via Neon, accessed with Prisma 7 + `@prisma/adapter-pg`
- **AI**: Google Gemini (via `@google/genai`)
- **Sandbox**: E2B (cloud code execution)
- **UI**: shadcn/ui + Tailwind CSS v4
- **Validation**: Zod v4

## Data Flow
```
User types prompt
  → tRPC mutation (message.send)
    → Save user message to DB
    → Call Gemini with full conversation history
    → Stream AI response back to client
    → Save assistant message to DB
    → Trigger E2B sandbox to run/update the generated code
    → Return sandbox preview URL
```

## Key Models
- `Project` — a named workspace; has many `Message`s and a `sandboxUrl`
- `Message` — a chat turn with `role` (user | assistant) and `content`
- `User` / `Post` — placeholder, not used in core flow yet

## Directory Layout
```
src/
  app/                  # Next.js pages and API routes
  components/
    ui/                 # shadcn primitives (do not edit)
    [feature]/          # feature-level components
  trpc/
    routers/            # one file per domain (project, message)
    init.ts             # tRPC context + base procedure
    _app.ts             # root router
  lib/
    db.ts               # Prisma singleton
    gemini.ts           # Gemini client
    e2b.ts              # E2B sandbox helpers
  generated/prisma/     # auto-generated, do not edit
```
