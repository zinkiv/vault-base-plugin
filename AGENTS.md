This is a general-purpose Obsidian plugin that syncs notes with a WebDAV server.

## Commands

- `npm run lint`: format and fix fixable lint errors (always run before `npm run check`).
- `npm run check`: check types, lint and format (no file change).
- `npm run dev`: watch `src/` and rebuild into `dist/` + `release/` on every change.
- `npm test`: run all tests. Requires Bun (`bun --version`). Tests automatically load Obsidian mocks.
- `npm test -- <test path>`: run tests in a specific file.
- `npm run package`: one-shot production build plus Obsidian store files in `release/`.

## Cursor Automation

- Project hook `.cursor/hooks.json` runs on agent `stop`.
- If `src/` (or build config) is newer than `release/main.js`, it runs `npm run package`.
- Failures are returned as a follow-up message so the agent can fix them.

## Code Quality

- For mobile compatibility, using any Node API is prohibited in `src/`.
- Use sentence case for UI text.
- All Obsidian API mocks go in `test/mocks/obsidian.ts`.

## Repository Map

A full codemap is available at `codemap.md` in the project root. Before working on any task, read `codemap.md` to understand the project. For deep work on a specific folder, also read that folder's `codemap.md`.
