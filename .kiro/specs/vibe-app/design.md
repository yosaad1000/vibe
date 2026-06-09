# Design Document: Vibe App

## Overview

Vibe is a three-panel AI app builder. The left sidebar lists projects. The centre panel is a chat interface. The right panel is a live iframe preview of the generated app running in an E2B sandbox.

The two remaining pieces to build are:

1. **`src/trpc/routers/_app.ts`** — wire `projectsRouter` and `messagesRouter` into a single `appRouter`.
2. **`src/app/page.tsx`** — replace the static UI shell with a fully connected React component that calls tRPC, manages state, and renders the preview.

Everything else (Prisma schema, `db.ts`, `gemini.ts`, `e2b.ts`, `project.ts` router, `message.ts` router, tRPC client/server setup) is already complete.

---

## Architecture

```
Browser
  └── page.tsx  (Next.js Client Component)
        ├── useTRPC() + TanStack Query
        │     ├── projects.getAll  → sidebar list
        │     ├── projects.create  → "New Project" button
        │     ├── projects.getById → load messages when project selected
        │     └── messages.send    → submit prompt, get sandboxUrl back
        └── <iframe src={sandboxUrl} />  → live preview

Server (Next.js API route at /api/trpc)
  └── appRouter
        ├── projectsRouter  (create, getAll, getById)
        └── messagesRouter  (send)
              ├── prisma  → PostgreSQL (Neon)
              ├── generateCode()  → Gemini API
              └── createOrUpdateSandbox()  → E2B API
```

### Data flow for a single message

```
User types prompt → clicks Send
  → messages.send mutation fires
    → save user Message to DB
    → load full conversation history from DB
    → call generateCode(history) → Gemini returns HTML string
    → save assistant Message (HTML) to DB
    → createOrUpdateSandbox(html, project.sandboxUrl?) → E2B
    → update project.sandboxUrl in DB
    → return { message, sandboxUrl } to client
  → client updates local message list
  → client sets sandboxUrl → iframe re-renders
```

---

## Components and Interfaces

### `src/trpc/routers/_app.ts`

```typescript
import { createTRPCRouter } from '../init';
import { projectsRouter } from './project';
import { messagesRouter } from './message';

export const appRouter = createTRPCRouter({
  projects: projectsRouter,
  messages: messagesRouter,
});

export type AppRouter = typeof appRouter;
```

This is the only change needed on the server side. The `client.tsx` already imports `AppRouter` from this path, so once this file exports the real router the client gets full type inference automatically.

### `src/app/page.tsx`

This is a `'use client'` component. It owns all interactive state for the app.

**State variables:**

| Variable | Type | Purpose |
|---|---|---|
| `selectedProjectId` | `string \| null` | Which project is active |
| `inputValue` | `string` | Controlled input field value |
| `sandboxUrl` | `string \| null` | Current preview URL |
| `optimisticMessages` | `Message[]` | Local message list (updated before server confirms) |

**tRPC calls used:**

| Call | Hook type | When |
|---|---|---|
| `projects.getAll` | `useQuery` | Always — populates sidebar |
| `projects.create` | `useMutation` | "New Project" button |
| `projects.getById` | `useQuery` (enabled when `selectedProjectId` set) | Load messages + sandboxUrl on project select |
| `messages.send` | `useMutation` | Send button / Enter key |

**Key behaviours:**

- On `projects.create` success → set `selectedProjectId` to new project id, invalidate `projects.getAll`.
- On `projects.getById` success → sync `optimisticMessages` from DB, sync `sandboxUrl` from `project.sandboxUrl`.
- On `messages.send` mutate → immediately push user message into `optimisticMessages` (optimistic update), clear input.
- On `messages.send` success → push assistant message into `optimisticMessages`, set `sandboxUrl`.
- On `messages.send` error → remove the optimistic user message, re-enable input.

**Layout structure (JSX skeleton):**

```
<div className="flex h-screen">
  <Sidebar>
    <NewProjectButton />
    <ProjectList />
  </Sidebar>

  <ChatPanel>
    <MessageList messages={optimisticMessages} />
    <ChatInput
      value={inputValue}
      disabled={isSending}
      onSubmit={handleSend}
    />
  </ChatPanel>

  <PreviewPanel>
    {sandboxUrl
      ? <iframe src={sandboxUrl} />
      : <EmptyPreview />}
  </PreviewPanel>
</div>
```

---

## Data Models

These are already defined in `prisma/schema.prisma` and generated into `src/generated/prisma`. No schema changes are needed.

```
Project
  id         String   (uuid, PK)
  name       String   (unique)
  sandboxUrl String?  (null until first message sent)
  messages   Message[]
  createdAt  DateTime
  updatedAt  DateTime

Message
  id         String   (uuid, PK)
  role       Role     (user | assistant)
  content    String   (plain text for user, HTML for assistant)
  projectId  String   (FK → Project)
  createdAt  DateTime
  updatedAt  DateTime
```

**TypeScript types inferred from tRPC** (no manual type definitions needed):

```typescript
// Inferred from projects.getById return type:
type ProjectWithMessages = {
  id: string;
  name: string;
  sandboxUrl: string | null;
  messages: { id: string; role: 'user' | 'assistant'; content: string; createdAt: Date }[];
};
```

---

## Correctness Properties

*A property is a characteristic or behaviour that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Message persistence round-trip

*For any* project and any non-empty user message content, after `messages.send` completes, querying `projects.getById` for that project SHALL return a message list that includes both the user message and an assistant message, in that order, at the end of the list.

**Validates: Requirements 3.1, 3.2, 3.3**

---

### Property 2: Sandbox URL propagation

*For any* project, after `messages.send` completes successfully, the `sandboxUrl` returned by the mutation SHALL equal the `sandboxUrl` stored on the project record in the database.

**Validates: Requirements 3.4, 3.5, 4.1, 4.2**

---

### Property 3: Empty message rejection

*For any* string composed entirely of whitespace (including the empty string), submitting it as message content SHALL be rejected with a validation error, and the project's message count SHALL remain unchanged.

**Validates: Requirements 3.6, 6.4**

---

### Property 4: Project list ordering invariant

*For any* sequence of project creations, `projects.getAll` SHALL always return projects in descending `createdAt` order — i.e. the most recently created project is always first.

**Validates: Requirements 2.2, 2.5**

---

### Property 5: AppRouter type completeness

*For any* valid tRPC procedure call on `projects.*` or `messages.*`, the TypeScript compiler SHALL resolve the call without type errors, confirming that `AppRouter` correctly exposes both sub-routers.

**Validates: Requirements 1.1, 1.2**

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Gemini API error | `messages.send` throws a tRPC `INTERNAL_SERVER_ERROR`; client shows an error toast; optimistic user message is removed |
| E2B sandbox error | Same as above — the whole mutation fails atomically |
| Empty message submitted | Zod validation rejects before hitting the DB; client shows inline error |
| Project not found | `projects.getById` returns `null`; client shows empty state |
| Network error | TanStack Query retries up to 3 times; after that shows error state |

---

## Testing Strategy

### Unit tests (specific examples and edge cases)

- `_app.ts`: verify `appRouter` has `projects` and `messages` keys.
- `projects.create`: verify a project is created and returned with the correct name.
- `projects.getAll`: verify ordering — create two projects, confirm second is first in result.
- `messages.send` with empty string: verify Zod rejects it.
- `page.tsx` rendering: verify sidebar, chat panel, and preview panel are all present in the DOM.
- `page.tsx` empty state: verify placeholder text shown when no project selected.

### Property-based tests (universal properties, using `fast-check`)

Each property test runs a minimum of 100 iterations.

- **Property 1** — `fc.string({ minLength: 1 })` for content; send message; query project; assert message list ends with `[user, assistant]` pair.
- **Property 2** — same setup; assert `mutation.data.sandboxUrl === project.sandboxUrl`.
- **Property 3** — `fc.stringMatching(/^\s*$/)` for content; assert mutation throws; assert message count unchanged.
- **Property 4** — `fc.array(fc.string({ minLength: 1 }), { minLength: 2 })` for names; create projects sequentially; assert `getAll` result is sorted descending by `createdAt`.

Tag format for each test: `// Feature: vibe-app, Property N: <property text>`

### Integration note

Properties 1 and 2 require a real database and E2B connection. In CI these should run against a test Neon branch and a test E2B API key. Properties 3 and 4 can run against a local SQLite test database or a mocked Prisma client.
