# Implementation Plan: Vibe App

## Overview

Almost everything is already built. Two files remain:

1. `src/trpc/routers/_app.ts` — wire the two sub-routers into one root router.
2. `src/app/page.tsx` — replace the static UI shell with a fully connected React component.

Tasks are ordered so each one builds directly on the previous. Completed tasks are checked off.

---

## Tasks

- [x] 1. Set up Prisma schema and database models
  - `Project` and `Message` models defined in `prisma/schema.prisma`
  - Migrations applied to Neon PostgreSQL
  - Prisma client generated into `src/generated/prisma/`
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.3_

- [x] 2. Create core library helpers
  - [x] 2.1 `src/lib/db.ts` — Prisma singleton with `@prisma/adapter-pg`
    - _Requirements: 2.1, 3.1_
  - [x] 2.2 `src/lib/gemini.ts` — `generateCode()` function using `@google/genai`
    - _Requirements: 3.2_
  - [x] 2.3 `src/lib/e2b.ts` — `createOrUpdateSandbox()` function using E2B SDK
    - _Requirements: 3.4, 3.5_

- [x] 3. Implement tRPC sub-routers
  - [x] 3.1 `src/trpc/routers/project.ts` — `create`, `getAll`, `getById` procedures
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 3.2 `src/trpc/routers/message.ts` — `send` mutation (save → Gemini → E2B → return)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Wire the root tRPC router
  - [ ] 4.1 Replace the placeholder in `src/trpc/routers/_app.ts` with the real `appRouter`
    - Import `projectsRouter` from `./project` and `messagesRouter` from `./message`
    - Call `createTRPCRouter({ projects: projectsRouter, messages: messagesRouter })`
    - Export `appRouter` and `export type AppRouter = typeof appRouter`
    - The existing `client.tsx` already imports `AppRouter` from this path — once this is correct, the whole client gets full type inference
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ]* 4.2 Write unit test: verify `appRouter` has `projects` and `messages` keys
    - _Requirements: 1.1_

- [ ] 5. Checkpoint — confirm tRPC types resolve
  - Run `npx tsc --noEmit` and confirm zero type errors before touching the UI.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Build the page state and project sidebar
  - [ ] 6.1 Convert `src/app/page.tsx` to a `'use client'` component and add state variables
    - Add `'use client'` directive at the top
    - Import `useTRPC` from `@/trpc/client` and `useQuery`, `useMutation` from `@tanstack/react-query`
    - Declare state: `selectedProjectId` (`string | null`), `inputValue` (`string`), `sandboxUrl` (`string | null`), `optimisticMessages` (array)
    - Wire `projects.getAll` with `useQuery` — this is like `requests.get()` in Python but reactive
    - _Requirements: 2.2, 2.5, 7.1_
  - [ ]* 6.2 Write unit test: sidebar renders project names from `getAll` result
    - _Requirements: 2.5_

- [ ] 7. Implement "New Project" button
  - [ ] 7.1 Wire `projects.create` mutation to the "New Project" button in the sidebar
    - Use `useMutation` with `projects.create`
    - On success: set `selectedProjectId` to the new project's `id`, call `utils.projects.getAll.invalidate()` to refresh the list
    - In JS/TS, `invalidate()` tells TanStack Query "this data is stale, refetch it" — like clearing a cache in Python
    - _Requirements: 2.1, 2.6_
  - [ ]* 7.2 Write property test for project list ordering invariant
    - **Property 4: Project list ordering invariant**
    - **Validates: Requirements 2.2, 2.5**
    - Use `fast-check`: generate an array of random project names, create them sequentially, assert `getAll` result is sorted descending by `createdAt`
    - `// Feature: vibe-app, Property 4: getAll always returns projects in descending createdAt order`

- [ ] 8. Load messages when a project is selected
  - [ ] 8.1 Wire `projects.getById` query, enabled only when `selectedProjectId` is set
    - Pass `{ enabled: !!selectedProjectId }` as the query option — this is like an `if` guard that prevents the query from running until we have an id
    - On data load: sync `optimisticMessages` from `data.messages`, sync `sandboxUrl` from `data.sandboxUrl`
    - Use a `useEffect` that watches `data` and calls the two setters
    - _Requirements: 2.3, 5.1_
  - [ ]* 8.2 Write property test for message persistence round-trip
    - **Property 1: Message persistence round-trip**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Use `fast-check`: generate random non-empty content string, send message, query `getById`, assert last two messages are `[user, assistant]` pair
    - `// Feature: vibe-app, Property 1: after send, getById returns user+assistant pair at end of list`

- [ ] 9. Implement the send message flow
  - [ ] 9.1 Wire `messages.send` mutation to the Send button and Enter key handler
    - On `mutate` call: immediately push `{ role: 'user', content: inputValue }` into `optimisticMessages` (optimistic update), clear `inputValue`
    - On `onSuccess`: push the assistant message from `data.message` into `optimisticMessages`, set `sandboxUrl` from `data.sandboxUrl`
    - On `onError`: remove the optimistic user message (filter it out by a temporary local id)
    - Add `disabled={isPending}` to the input and button while the mutation is in flight
    - _Requirements: 3.1, 3.6, 6.1, 6.2, 6.3, 6.4, 6.5_
  - [ ]* 9.2 Write property test for empty message rejection
    - **Property 3: Empty/blank message rejection**
    - **Validates: Requirements 3.6**
    - Use `fast-check`: generate whitespace-only strings, call `messages.send`, assert it throws a tRPC validation error
    - `// Feature: vibe-app, Property 3: blank message content is rejected with validation error`
  - [ ]* 9.3 Write property test for sandbox URL propagation
    - **Property 2: Sandbox URL propagation**
    - **Validates: Requirements 3.4, 3.5, 4.1, 4.2**
    - After a successful send, assert `mutation.data.sandboxUrl === project.sandboxUrl` from a fresh `getById` call
    - `// Feature: vibe-app, Property 2: sandboxUrl returned by send equals sandboxUrl stored on project`

- [ ] 10. Checkpoint — confirm send flow works end to end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Render the chat message list
  - [ ] 11.1 Map over `optimisticMessages` and render each message with correct styling
    - User messages: `flex justify-end` + `bg-primary text-primary-foreground`
    - Assistant messages: `flex justify-start` + `bg-muted`
    - For assistant messages where `content` starts with `<!DOCTYPE` or `<html`, display `"Generated app ✓"` instead of the raw HTML
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 11.2 Auto-scroll the message list to the bottom after each new message
    - Create a `bottomRef = useRef<HTMLDivElement>(null)` and place a `<div ref={bottomRef} />` at the end of the list
    - In a `useEffect` that watches `optimisticMessages.length`, call `bottomRef.current?.scrollIntoView({ behavior: 'smooth' })`
    - `useRef` is like a Python instance variable that doesn't trigger re-renders when it changes
    - _Requirements: 5.4_

- [ ] 12. Render the preview panel
  - [ ] 12.1 Conditionally render the iframe or the placeholder based on `sandboxUrl`
    - `{sandboxUrl ? <iframe src={sandboxUrl} className="w-full h-full border-0" /> : <p>No preview yet</p>}`
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 13. Add empty state for no selected project
  - [ ] 13.1 When `selectedProjectId` is null, show a welcome message in the chat panel
    - Replace the message list and input with a centred prompt: "Select a project or create a new one to get started"
    - _Requirements: 7.5_

- [ ] 14. Final checkpoint — full end-to-end verification
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Property tests use `fast-check` (already installed in `node_modules`).
- The teaching approach: tackle one task at a time, understand it, then move to the next.
