# ClaudeOS Kernel Development Rules

## Core Principles
- The kernel is NEVER modified to accommodate specific modules
- All module integration happens through the defined module interface in kernel/types.ts
- Test every change: `npm test && npm run typecheck && npm run build`
- No mock/test data in production code
- TDD: write tests before implementation

## Module Interface Contract
- Modules MUST be hot-swappable (add/remove without kernel changes)
- The kernel MUST work with zero modules installed (basic terminal mode)
- Module dependencies are resolved at build time, not runtime
- Breaking changes to module interface require a major version bump of the kernel

## Architecture
- `kernel/types.ts` - The canonical module interface. All modules depend on these types.
- `kernel/module-loader.ts` - Discovers, validates, and loads modules from npm packages and local `./modules/` directory.
- `kernel/build.ts` - Build pipeline that generates module registry, supervisord config, Dockerfile, and entrypoint.
- `kernel/server.ts` - Core HTTP/WebSocket server. Handles session management, Claude Code process spawning, and module API route dispatching.
- `src/components/Shell.tsx` - Module-aware UI shell. Renders terminal mode when no UI module is installed.
- `src/stores/kernel-store.ts` - Minimal kernel state: auth, connection, module registry.

## Session Management (Core Kernel)
Sessions are core kernel functionality, NOT a module:
- Creating/listing/archiving sessions
- Spawning Claude Code processes
- WebSocket streaming
- Session persistence to /data/sessions/

## Auth (Core Kernel)
Token + JWT authentication is core kernel:
- POST /api/auth exchanges auth token for JWT
- JWT verified on WebSocket connections
- JWT verified on API routes via Bearer token
- Passkeys are a MODULE, not core

## File Paths
- Persistent data: `/data/` directory
- Sessions: `/data/sessions/`
- Workspace: `/data/workspace/`
- Module data: `/data/modules/<module-name>/`

## Module Development
Modules are npm packages with a `claudeos-module.json` manifest:
```json
{
  "name": "@claude-nix-os/module-example",
  "version": "1.0.0",
  "description": "Example module",
  "main": "index.ts",
  "requires": [],
  "optional": []
}
```

The main entry point must export a `ClaudeOSModule` object (default export).

## Pre-Commit Checklist
- [ ] `npm test` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] No hardcoded URLs or secrets
- [ ] AGENTS.md is up to date
- [ ] Module interface changes are backwards-compatible
