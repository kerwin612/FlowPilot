# Copilot instructions for FlowPilot

This repo is a uTools plugin built with React + Vite. The UI lives in `src/`, while Node-powered capabilities (filesystem, command exec, redirects) are exposed to the UI via a preload bridge under `public/preload`. Understanding this boundary is key to being productive.

## Big picture architecture
- UI: React app (Vite) under `src/`. Entry: `src/App.jsx`. The Home feature and workflow editor live in `src/features/Home/*`.
- Workflow engine (composed mode):
  - Execution flow is “executors → actions” handled by `runComposedWorkflow` in `src/features/Home/workflow/engine/runWorkflow.js`.
  - Context shape created by `createExecutionContext` in `engine/context.js`: `{ workflow, trigger, env, timestamp, values, executors }`.
  - Template resolution uses `{{ ... }}` syntax via `engine/compile.js` (aliases: `executor`/`executors`, `env`, `trigger`, `values`). Example: `{{executor[0].result.value.filePath}}`, `{{env.PATH}}`.
  - Registries: `executors/registry.js` and `actions/registry.js` manage pluggable steps. Built-ins are installed once in `workflow/bootstrap.js`.
- System boundary: UI must not call `window.utools` or `window.services` directly. Use `src/services/*` instead. The bridge is assembled in `public/preload/services.js` and wired to Node modules under `public/preload/**`.
- uTools wiring: `public/plugin.json` points `main` to `index.html` and `development.main` to `http://localhost:5173`. Dynamic features are synced from workflows via `src/services/featureService.js`.

## Core conventions
- Service layer contracts:
  - `systemService` wraps uTools and preload APIs: openPath/openExternal, selectPath, clipboard, ubrowser, redirect, and `executeCommand` (bridges to `public/preload/services/workflows/index.js`).
  - `configService` is the single source of truth for persisted config (tabs, workflows, env vars). It calls `window.services.workflow.*` and provides `subscribe()` for reactive updates.
  - `workflowService.execute(workflow, trigger)` enforces `mode === composed` and orchestrates execution with abort support.
- Step definitions:
  - Executors and actions are plain objects: `{ key, label, getDefaultConfig?, ConfigComponent?, async execute(trigger, context, config, { signal }) }` (see `executors/base.js`, `actions/base.js`). Register via the registries; initialization occurs in `workflow/bootstrap.js`.
  - Example executor: `executors/command/index.jsx` renders config UI and ultimately calls `systemService.executeCommand({ command, runInBackground, showWindow, env })`.
  - Example action: `actions/open-path.jsx` resolves a path with templates then calls `systemService.openPath(path)`.
- Events: `runComposedWorkflow` emits lifecycle events via `onEvent(type, data)`: `workflow:start/end`, `executor:start/end`, `action:start/end`, `workflow:cancel`. Prefer consuming this for UI progress instead of internal state.
- Safety posture: The preload `core/command.js` runs system commands. UI shows risk hints for known dangerous patterns but does not block. Treat command strings as user-provided; no sandbox.

## Developer workflows
- Install, run, build:
  - `npm install`
  - `npm run dev` (Vite dev server; uTools loads it via `plugin.json.development.main`)
  - `npm run build` (static bundle; served by uTools `main: index.html`)
- Quality tools:
  - `npm run lint` uses `.eslintrc.cjs` (React + hooks rules; relaxed `no-eval` warning for JS executor).
  - `npm run format` formats JS/JSX/CSS via Prettier.

## Practical patterns and examples
- Add a new executor/action:
  1) Create a definition file next to peers (e.g., `src/features/Home/workflow/executors/my-exec/index.jsx`).
  2) Export `{ key, label, getDefaultConfig, ConfigComponent, execute }`.
  3) Import and register it in `workflow/bootstrap.js` (use `executorRegistry.register(def)` / `actionRegistry.register(def)`).
  4) Reference by `key` inside a workflow object.
- Use templates inside configs: `resolveTemplate(config.template, context)` is applied in built-ins; prefer `{{env.VAR}}`, `{{trigger.filePath}}`, `{{executor[0].result.value.xxx}}`.
- Don’t touch `window.services` directly; go through `systemService` and `configService` to keep the Electron/uTools boundary clean and testable.

## Files to know
- UI: `src/App.jsx`, `src/features/Home/*`
- Engine: `src/features/Home/workflow/engine/{runWorkflow.js,compile.js,context.js}`
- Steps: `src/features/Home/workflow/{executors,actions}/**` and `workflow/bootstrap.js`
- Services: `src/services/{systemService.js,configService.js,featureService.js,workflowService.js}`
- Preload bridge: `public/preload/services.js` and `public/preload/**`
- uTools manifest: `public/plugin.json`
