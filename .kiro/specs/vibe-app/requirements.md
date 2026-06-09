# Requirements Document

## Introduction

Vibe is a Lovable-style AI app builder. Users describe an app they want to build in plain English. The AI (Google Gemini) generates a single self-contained HTML file that implements it. That HTML runs live in an E2B cloud sandbox and is shown in an iframe preview panel. Users can keep chatting to refine the app. Projects and their full conversation history are persisted in PostgreSQL via Prisma.

The frontend is a Next.js 15 App Router application using tRPC v11 for type-safe API calls, TanStack Query for data fetching, shadcn/ui + Tailwind CSS v4 for UI, and Zod v4 for validation.

## Glossary

- **Vibe**: The name of the application being built.
- **Project**: A named workspace that contains a conversation history and an associated E2B sandbox.
- **Message**: A single chat turn with a `role` (user or assistant) and `content` (plain text for user messages, HTML for assistant messages).
- **Sandbox**: An E2B cloud VM that serves the generated HTML file over HTTP.
- **Preview**: The live iframe that displays the running sandbox output.
- **AppRouter**: The tRPC root router that combines all sub-routers.
- **tRPC**: Type-safe remote procedure call library used for all client-server communication.
- **Gemini**: Google's generative AI model used to produce HTML from conversation history.

---

## Requirements

### Requirement 1: Root tRPC Router

**User Story:** As a developer, I want a single root tRPC router that wires together the projects and messages sub-routers, so that the client has a unified, type-safe API surface.

#### Acceptance Criteria

1. THE AppRouter SHALL export a combined router that includes `projectsRouter` under the key `projects` and `messagesRouter` under the key `messages`.
2. THE AppRouter SHALL export its type as `AppRouter` so the tRPC client can infer all procedure types.
3. WHEN the tRPC HTTP handler receives a request, THE AppRouter SHALL route it to the correct sub-router procedure.

---

### Requirement 2: Project Management

**User Story:** As a user, I want to create and browse projects, so that I can organise separate app-building sessions.

#### Acceptance Criteria

1. WHEN a user submits a new project name, THE System SHALL create a `Project` record in the database with that name and return the created project.
2. WHEN a user requests the project list, THE System SHALL return all projects ordered by `createdAt` descending.
3. WHEN a user selects a project, THE System SHALL return that project's full record including all associated messages ordered by `createdAt` ascending.
4. IF a project name is empty or blank, THEN THE System SHALL reject the creation request with a validation error.
5. THE System SHALL display the list of projects in the sidebar, with the most recently created project at the top.
6. WHEN a new project is created, THE System SHALL immediately select it and display its (empty) chat view.

---

### Requirement 3: Sending Messages and Generating Code

**User Story:** As a user, I want to type a prompt and receive a live preview of the generated app, so that I can build apps through conversation.

#### Acceptance Criteria

1. WHEN a user submits a message in an active project, THE System SHALL save the user message to the database before calling the AI.
2. WHEN a user message is saved, THE System SHALL call Gemini with the full conversation history for that project and receive an HTML string in response.
3. WHEN Gemini returns an HTML string, THE System SHALL save it as an assistant message in the database.
4. WHEN the assistant message is saved, THE System SHALL create or reuse the project's E2B sandbox and write the HTML into it.
5. WHEN the sandbox is ready, THE System SHALL update the project's `sandboxUrl` in the database and return the URL to the client.
6. IF the message content is empty or blank, THEN THE System SHALL reject the send request with a validation error.
7. WHILE a message is being processed, THE System SHALL display a loading indicator in the chat area.

---

### Requirement 4: Live Preview

**User Story:** As a user, I want to see my generated app running live in a preview panel, so that I can immediately evaluate the result.

#### Acceptance Criteria

1. WHEN a `sandboxUrl` is available for the active project, THE Preview SHALL render an `<iframe>` pointing to that URL.
2. WHEN a new message is sent and a new `sandboxUrl` is returned, THE Preview SHALL update the `<iframe>` `src` to the new URL.
3. WHILE no `sandboxUrl` exists for the active project, THE Preview SHALL display a placeholder message.
4. THE Preview panel SHALL be visible at all times alongside the chat area on desktop viewports.

---

### Requirement 5: Chat History Display

**User Story:** As a user, I want to see the full conversation history for a project, so that I can understand what was built and why.

#### Acceptance Criteria

1. WHEN a project is selected, THE System SHALL load and display all messages for that project in chronological order.
2. THE System SHALL visually distinguish user messages (right-aligned, primary colour) from assistant messages (left-aligned, muted colour).
3. WHEN an assistant message contains HTML, THE System SHALL display a summary label (e.g. "Generated app") rather than the raw HTML source.
4. WHEN a new message pair is added, THE System SHALL scroll the chat area to the bottom automatically.

---

### Requirement 6: Input and Interaction

**User Story:** As a user, I want a clear and responsive input area, so that I can type and submit prompts without friction.

#### Acceptance Criteria

1. THE System SHALL provide a text input field and a Send button in the chat input area.
2. WHEN the user presses Enter in the input field, THE System SHALL submit the message (equivalent to clicking Send).
3. WHEN a message is submitted, THE System SHALL clear the input field immediately.
4. WHILE a message is being processed, THE System SHALL disable the input field and Send button to prevent duplicate submissions.
5. WHEN processing completes, THE System SHALL re-enable the input field and focus it.

---

### Requirement 7: Application Layout

**User Story:** As a user, I want a clear three-panel layout (sidebar, chat, preview), so that I can navigate projects and see results at a glance.

#### Acceptance Criteria

1. THE System SHALL render a persistent left sidebar containing the project list and a "New Project" button.
2. THE System SHALL render a central chat panel that fills the remaining horizontal space when no preview is shown, or shares it with the preview panel.
3. THE System SHALL render a right preview panel that displays the live iframe.
4. THE System SHALL display the application name "Vibe" in the sidebar header.
5. WHEN no project is selected, THE System SHALL display a welcome/empty state in the chat panel prompting the user to create or select a project.
