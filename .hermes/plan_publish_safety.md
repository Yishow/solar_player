# Task: Implement strengthen-display-page-publishing-and-safety

## Context
This is the Solar Display Platform at /Users/yishow/prj/solar_player/
Monorepo: @solar-display/server (Fastify), @solar-display/web (Vite+React), @solar-display/shared.
Runtime: MQTT -> Node.js -> SQLite -> WebSocket -> React.
Server imports use .js extension. Web imports are extensionless.
All code files must be under 400 lines.

## Specs to implement

### draft/live publishing (2 requirements)
- Separate draft and live config channels
- Support publish history and rollback

### fallback policies (2 requirements)
- Keep fallback policy in shared display page config metadata
- Expose fallback policy status to management surfaces

### layout safety guards (2 requirements)
- Run layout safety guards before publish (blocking validation)
- Surface layout safety guards results in the editor

## Tasks to implement (all 6)

### Task 1.1: Draft and live publishing model
- Extend shared envelope and server persistence for draft/live stages with version metadata
- Server tests must cover stage-specific reads and writes

### Task 1.2: Publish and rollback APIs
- Add publish, rollback, and history read APIs
- Tests: publish draft → read new live → rollback

### Task 2.1: Server-side layout validation
- Blocking validation for geometry, required content, invalid values
- Reject invalid payloads with structured findings

### Task 2.2: Editor validation display
- Show region-aware validation results and publish blocking state in DisplayPagesEditor
- Tests: pnpm --filter @solar-display/web test -- src/pages/DisplayPagesEditor/index.test.tsx

### Task 3.1: Runtime fallback policies
- Define shared fallback policy fields, read from live runtime pages
- Tests: pnpm --filter @solar-display/web test -- src/hooks/useDisplayPageConfig.test.ts

### Task 3.2: Fallback status in management surfaces
- Return effective fallback state from management APIs, show in publishing status UI

## Constraints
- Do NOT modify AGENTS.md, CLAUDE.md, deploy/, package.json, lockfile
- Do NOT add new dependencies
- Formal playback routes must NOT have editor overlay
- Existing API response shapes must follow existing route conventions
- Tests failing = regression, do NOT fix by editing tests, .skip, or weakening assertions
- Server imports use .js extension, web imports are extensionless
- All code files must be under 400 lines

## Steps
1. Read existing files to understand current state:
   - apps/server/src/routes/display-pages.ts
   - apps/server/src/routes/playback.ts
   - apps/web/src/pages/DisplayPagesEditor/
   - apps/web/src/services/api.ts
   - apps/web/src/hooks/useDisplayPageConfig.ts
   - packages/shared/src/
   - apps/server/src/db/migrations/ (existing migration files)
   
2. Implement tasks one at a time, testing after each

3. After each task: code review, fix bugs, git commit with Traditional Chinese message

4. Final verification:
   - pnpm --filter @solar-display/server test (exit 0)
   - pnpm --filter @solar-display/web test (exit 0)
   - pnpm run build (exit 0)
   - Update all tasks.md checkboxes to - [x]
   - Report final summary

## Stop if
- package.json, lockfile, AGENTS.md, CLAUDE.md, deploy/ appear in git diff
- Need new dependencies or pnpm install
- Existing tests fail and cannot be fixed without modifying tests
- Irreversible data changes without rollback migration
