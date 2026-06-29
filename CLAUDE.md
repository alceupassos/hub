# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LobeHub — an open-source AI Agent Workspace (formerly LobeChat). Monorepo with a hybrid Next.js SSR + Vite SPA architecture.

## Commands

```bash
# Development
bun run dev:spa          # SPA-only (Vite, proxies API to localhost:3010)
bun run dev              # Full-stack (Next.js + Vite concurrently)

# After dev:spa starts, the terminal prints a Debug Proxy URL:
# https://app.lobehub.com/_dangerous_local_dev_proxy?debug-host=http%3A%2F%2Flocalhost%3A9876
# Open it to develop against the production backend with HMR.

# Build
bun run build            # Full production build (spa → auth → copy → next)
bun run build:vercel     # Vercel build + DB migration

# Testing — NEVER run `bun run test` (runs 3000+ tests, ~10 minutes)
bunx vitest run --silent='passed-only' '[file-path]'
cd packages/database && bunx vitest run --silent='passed-only' '[file]'
cd packages/database && TEST_SERVER_DB=1 bunx vitest run --silent='passed-only' '[file]'  # full Postgres

# Type checking
bun run type-check        # uses tsgo (fast)
bun run type-check:tsc    # fallback with tsc

# Linting
bun run lint:ts           # ESLint for src/ and tests/
bun run lint:style        # Stylelint

# Database
bun run db:generate       # Drizzle schema → migration SQL
bun run db:migrate        # Apply pending migrations
bun run db:studio         # Drizzle Studio GUI

# i18n (usually let CI handle it)
pnpm i18n                 # Regenerate all locale translations (slow, needs OPENAI_API_KEY)
```

## Package Management

- `pnpm` for dependency management
- `bun` to run npm scripts
- `bunx` for executable npm packages

## Architecture

### Hybrid Next.js + Vite SPA

Next.js handles SSR for auth pages (`src/app/[variants]/(auth)/`) and all backend API routes (`src/app/(backend)/`). The main app UI is a Vite-built SPA served from `public/_spa/` as a static file by Next.js. This means there are two build steps and two entry points.

```
src/app/(backend)/          # Next.js API routes: trpc, webapi, oidc, market
src/app/[variants]/(auth)/  # SSR auth pages (require SSR)
src/app/spa/                # Serves the SPA HTML shell
src/spa/entry.*.tsx         # Vite SPA entries (web, mobile, desktop, popup)
src/spa/router/             # React Router config
src/routes/                 # SPA page segments (thin — delegate to features/)
src/features/               # Domain business components and logic
```

**TRPC backend lives in `apps/server/src/routers/`**, not in `src/`. The `@/server/*` alias resolves to `apps/server/src/`.

### SPA Routes: Roots vs Features Split

`src/routes/` holds only thin page-segment files (`_layout/index.tsx`, `index.tsx`, `[id]/index.tsx`). All business logic and UI live in `src/features/<Domain>/`. Route files should only import from `@/features/*` and compose.

**Desktop router parity:** `src/spa/router/desktopRouter.config.tsx` and `src/spa/router/desktopRouter.config.desktop.tsx` must always be updated together with the same paths and nesting. Updating only one causes blank screens. `desktopRouter.sync.test.tsx` guards this invariant.

### Data Fetching Pipeline

```
Component → Store useFetchXxx hook → useClientDataSWR → Service → lambdaClient (TRPC)
```

- Never call `lambdaClient` directly from components or stores
- Never use `useEffect` for data fetching; use store SWR hooks
- Never use `useState` for server data
- Read hooks: `useFetchXxx`; cache invalidation: `refreshXxx`; mutations chain `refreshXxx()` after service call

### Zustand Store Conventions

Three action tiers:
1. **Public actions** — verb form (`createTopic`), called by UI, orchestrate flow
2. **Internal actions** (`internal_*`) — core logic, optimistic updates, service calls
3. **Dispatch methods** (`internal_dispatch*`) — call reducers to update state

Use reducer pattern for maps/lists with optimistic updates; use simple `set` for booleans and scalar values. Store types come from `@lobechat/types`, never from `@lobechat/database`.

### TRPC Routers

Routers live in `apps/server/src/routers/lambda/<domain>.ts`. Always inject models via middleware into `ctx` rather than instantiating `new Model(ctx.serverDB, ctx.userId)` inside each procedure.

### Database

- Schemas: `packages/database/src/schemas/`
- Migrations: `packages/database/migrations/`
- Drizzle config: `drizzle.config.ts`
- Use text IDs from `idGenerator`/`createNanoId`, not auto-increment sequences
- Every new `packages/database/src/models/**` or `src/repositories/**` file ships with a sibling `__tests__/<name>.test.ts` in the same PR, using `getTestDB()` (integration style), with user-isolation tests and BM25 tests guarded by `describe.skipIf(!isServerDB)`

## Tech Stack & Component Choices

- **Component priority:** `@lobehub/ui/base-ui` (headless primitives) first → `@lobehub/ui` root → antd last resort. Base-ui covers `Select`, `Modal`/`createModal`/`confirmModal`, `DropdownMenu`, `ContextMenu`, `Popover`, `ScrollArea`, `Switch`, `Toast`, `FloatingSheet`.
- **CSS-in-JS:** Prefer `createStaticStyles` + `cssVar.*` (zero-runtime, computed once at module load). Only fall back to `createStyles` + `token` when styles need genuine runtime computation (e.g. `chroma()`, `rgba()`, or passing values to third-party libraries). See `.cursor/docs/createStaticStyles_migration_guide.md`.
- **`cssVar` vs `token`:** `cssVar.fontSize` already includes units (`"14px"`) — don't append `px`. Use `color-mix(in srgb, ${cssVar.colorX} 40%, transparent)` instead of `rgba()`.
- **`useThemeMode()`** instead of `useTheme()` when only `isDarkMode` is needed.
- **State:** zustand 5 with immer
- **URL state:** nuqs
- **React hooks:** aHooks

## i18n

- Source of truth: `src/locales/default/<namespace>.ts` — never edit JSON in `locales/`
- Ship en-US and zh-CN by hand in the same PR (mirror to `locales/en-US/`, hand-translate `locales/zh-CN/`)
- Key pattern: `{feature}.{context}.{action|status}` with flat dot notation (no nested objects)
- Don't run `pnpm i18n` unless your branch needs translated locales immediately (requires `OPENAI_API_KEY`)

## Git Workflow

- `canary` = development branch; `main` = release
- New branches from `canary`; PRs target `canary`
- Commit prefix: gitmoji; branch format: `<type>/<feature-name>`
- Use rebase for `git pull`

## Testing Conventions

- Prefer `vi.spyOn` over `vi.mock`
- No new React component tests; extract logic into hooks and test those instead
- Complete all source changes before writing any test changes
- Regression tests required for bug fixes
- `bun run type-check` after writing tests

## Code Review Checklist

Before reviewing a PR, read `.agents/skills/review-checklist/SKILL.md`. Key recurring issues:
- Leftover `console.log`/`console.debug` (use `debug` package)
- Missing `return await` in try/catch
- Desktop router config drift (both files must match)
- `antd` imports replaceable with `@lobehub/ui` wrappers
- `createStyles` + `token` replaceable with `createStaticStyles` + `cssVar`
- Migration scripts not idempotent

## Agent Skills

Domain-specific guides live in `.agents/skills/`. Key ones:
- `spa-routes` — SPA route/feature file split rules
- `data-fetching-architecture` — service/store/SWR pipeline
- `zustand` — store action tiers, optimistic updates, selectors
- `trpc-router` — procedure patterns, middleware injection
- `drizzle` — schema, naming, index conventions
- `db-migrations` — when to regenerate vs hand-edit
- `testing` — mock patterns, `getTestDB()`, DB test structure
- `i18n` — key naming, namespace rules
- `review-checklist` — recurring PR mistakes
- `ux` — LobeHub design values (自然 / 意义感 / 确定性)
