# capihouse-pwa — Frontend Guidelines for AI Agents

## Overview
This is the modern Frontend for CapiHouse, built as a Progressive Web App (PWA).

## Tech Stack
- **Framework**: Vue 3 (Composition API, `<script setup lang="ts">`)
- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite 6+
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **Styling**: Tailwind CSS / PostCSS
- **HTTP Client**: Axios (configured in `src/api/client.ts`)
- **Real-time**: Laravel Echo + Pusher JS (WebSockets with Laravel Reverb)
- **Testing**: Vitest (`@vue/test-utils`)
- **Linting & Formatting**: Oxlint, ESLint, vue-tsc

## Directory Structure
- `src/api/` — API calls categorized by domain (`auth.ts`, `posts.ts`, `groups.ts`, `events.ts`, `notifications.ts`, etc.). All backend requests should go through here.
- `src/components/` — Reusable components, organized by feature area (`feed/`, `groups/`, `events/`, `layout/`, `sidebar/`, `ui/`, `profile/`).
- `src/composables/` — Shared Vue composables (e.g. reactivity hooks, device detection, etc.).
- `src/stores/` — Pinia stores for global client state (`auth.ts`, `theme.ts`, `notifications.ts`, etc.).
- `src/views/` — Top-level views corresponding to router pages.
- `src/router/` — Vue router configuration and navigation guards.
- `src/types/` — Global TypeScript interfaces and type definitions.

## Key Rules & Conventions
1. **Script Setup**: Always use `<script setup lang="ts">` for Vue components.
2. **Typed API Calls**: Do not make raw inline axios calls in components; always define and call functions in `src/api/`.
3. **Reactive State**: Prefer `ref()` and `computed()` from Vue 3. Keep stores focused and modular.
4. **Verification**: Always run `npm run build` or `npm run type-check` before finishing a task to verify there are no TypeScript compilation or linting errors.

## Commands (Must run inside `capihouse-pwa/`)
```bash
npm run dev        # Run Vite dev server
npm run build      # Full type-check and production build
npm run type-check # Run vue-tsc type checking
npm run test:unit  # Run Vitest tests
npm run lint       # Run Oxlint and ESLint
```
