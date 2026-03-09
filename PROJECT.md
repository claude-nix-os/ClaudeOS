# ClaudeOS

**J. C. R. Licklider's Man-Computer Symbiosis, realized with Claude Code.**

ClaudeOS is a self-expanding agent operating system built on Claude Code. It provides a deployable, modular environment where Claude Code runs in its own VM with a VS Code-forked browser UI, persistent memory, automation, browser control, and a plugin ecosystem. The kernel is a NixOS flake that is never manually touched after deployment; all evolution happens through hot-swappable modules that ClaudeOS itself can write, test, and install.

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Architecture Overview](#architecture-overview)
3. [The Kernel](#the-kernel)
4. [Module System](#module-system)
5. [Official Modules](#official-modules)
6. [Frontend UI](#frontend-ui)
7. [Panel System](#panel-system)
8. [Session & Chat System](#session--chat-system)
9. [Memory System](#memory-system)
10. [Browser Engine](#browser-engine)
11. [Automation & Scheduling](#automation--scheduling)
12. [Security & Auth](#security--auth)
13. [Plugin Ecosystem](#plugin-ecosystem)
14. [Deployment](#deployment)
15. [Tech Stack](#tech-stack)
16. [External Dependencies](#external-dependencies)

---

## Philosophy

ClaudeOS implements the thesis of **the self-expanding agent**: an operating system whose kernel provides the minimal substrate for Claude Code to operate, and whose capabilities grow through modules that Claude itself can author, test, and deploy.

Core principles:

- **Never reinvent Claude Code features.** Everything stock Claude Code does (skills, tools, memories, MCP servers) works identically inside ClaudeOS. ClaudeOS is an environment, not a replacement.
- **Lightweight and auto-updating.** The system is designed to absorb Claude Code updates without manual intervention. No tight coupling to internal APIs.
- **Self-expanding.** ClaudeOS can create new NixOS flakes with its own modules to test different configurations, write new modules, validate them in isolation, and hot-swap them into the running system.
- **Portable tooling.** Any tools ClaudeOS builds for itself are compatible with stock Claude Code installations.
- **Non-Anthropic model support.** While Claude is the primary model, the system supports routing to other model providers.

---

## Architecture Overview

```
+------------------------------------------------------------------+
|                        NixOS Flake (Kernel)                       |
|                                                                    |
|  +------------------+  +------------------+  +-----------------+  |
|  |   Claude Code    |  |     Mem0         |  |      n8n        |  |
|  |   (agent core)   |  |   (memory)       |  |  (automation)   |  |
|  +------------------+  +------------------+  +-----------------+  |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  |                    Module Loader                              | |
|  |  Discovers, validates, dependency-resolves, hot-loads modules | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  |              HTTP/WS Kernel Server (Next.js)                  | |
|  |  API routing | WebSocket | Session management | JWT auth      | |
|  +--------------------------------------------------------------+ |
|                                                                    |
+------------------------------------------------------------------+
                              |
                    +-------------------+
                    |  VS Code Fork UI  |
                    |  (Browser Client) |
                    +-------------------+
```

The system is containerized and deployed via Railway (or any Docker host). A single URL points to the Next.js frontend which serves the VS Code fork UI. All agent sessions, memory, automation, and browser control happen server-side.

---

## The Kernel

The kernel is a **NixOS flake** that provides the minimal runtime for ClaudeOS:

- **Claude Code** runtime with `--dangerously-skip-permissions` for autonomous operation
- **Node.js 22 LTS** with tsx for TypeScript execution
- **Python 3** for Mem0 and other Python-based services
- **n8n** for workflow automation
- **Supervisord** for process management
- **SQLite** for lightweight data persistence
- **Module loader** that discovers, validates, dependency-resolves, and loads modules

The kernel exposes:
- HTTP server with Next.js SSR and API route dispatching
- WebSocket server with JWT authentication
- Module registration API (panels, API routes, WS handlers, services)
- Session lifecycle management (create, persist, restore, archive, delete)
- File system access scoped to `/data/workspace/`

**The kernel is never manually modified after deployment.** All feature development happens through modules. The kernel can spawn test flakes of itself with different module configurations for iterative development.

---

## Module System

### Discovery

Modules are discovered from two locations:
1. `./modules/` directory (local development and bundled modules)
2. `node_modules/@claude-nix-os/module-*` (installed via npm/GitHub Package Registry)

### Manifest

Every module has a `claudeos-module.json`:

```json
{
  "name": "@claude-nix-os/module-example",
  "version": "1.0.0",
  "description": "Example module",
  "main": "src/index.ts",
  "requires": ["@claude-nix-os/module-ui"],
  "optional": ["@claude-nix-os/module-memory"]
}
```

### Dependency Resolution

- `requires`: Hard dependencies. Module fails to load without them.
- `optional`: Soft dependencies. Module loads with reduced functionality without them.
- Conditional loading: A module can have parts that require the UI module (loaded only when UI is present) and parts that only need Claude Code (always loaded). Example: the Memory module has a graph visualizer (requires UI) and passive memory recording (runs headless).

### Hot-Swapping

Modules can be installed, updated, and removed at runtime without restarting the kernel:
- `npm run module:add <package>` - Install and register a module
- `npm run module:remove <package>` - Unregister and optionally uninstall
- Module state persists in `modules.json`

### What Modules Can Do

- Register UI panels, activity bar items, sidebar sections, and settings pages
- Add API routes handled by the kernel server
- Register WebSocket message handlers
- Start background services managed by supervisord
- Add slash commands to the chat interface
- Extend other modules (e.g., add a navbar button to the UI module)
- Create artifacts that become installable plugins

---

## Official Modules

All official modules live in the `claude-nix-os` GitHub org:

### `module-ui` (VS Code Fork)

The frontend is a **lightweight fork of VS Code** (code-oss) running in the browser, rebranded as ClaudeOS. This is the UI kernel that all other UI modules extend.

**Built-in capabilities:**
- Session management (create, list, archive, restore, delete)
- Navigation bar with activity icons
- Tab system with drag-and-drop
- Panel framework with split views
- Settings pages auto-populated from ClaudeOS and Claude Code configs
- File editors with syntax highlighting
- Token-based authentication
- Served locally by default

**Design language:** Minimalist terminal-meets-VS Code, as if designed by Apple with fluid animations. Dark theme primary.

### `module-ui-passkey-auth`

- Adds WebAuthn/passkey authentication to the UI
- Replaces token auth with biometric/hardware key login
- Requires: `module-ui`

### `module-memory`

- **Mem0** integration for passive and active memory
- Passive memory: Automatically records and indexes all Claude Code I/O
- Active memory: Slash commands for explicit memorization and recall (`/remember`, `/recall`)
- UI components (requires `module-ui`):
  - Memory graph visualizer (view memory at a point in a session, or global memory projections)
  - In-chat memory indicators showing when recalled memories influence responses
- Headless components (no UI required):
  - Background memory recording service
  - Memory search API

### `module-n8n`

- n8n workflow automation integration
- Default workflows:
  - **Heartbeat**: Configurable period and frequency, set during initial setup
  - **Scheduled job failure handling**: Retry logic and notification
- UI panel for n8n workflow management
- Slash commands: `/schedule`, `/workflow`

### `module-file-explorer`

- VS Code-style file explorer in the sidebar (mirrors VS Code's implementation)
- Fullscreen explorer-type file manager panel
- Session diff view: Shows each file changed by a session with green/red line counts
- File system access to the container's workspace

### `module-railway-tools`

- Railway management slash commands, UI components, and tooling
- Deploy, redeploy, check status, view logs from within ClaudeOS
- Skill file for Claude Code to manage Railway resources

### `module-ui-railway-sidecar`

- Serves the UI on Railway's public URL
- Handles Railway-specific networking (port mapping, healthchecks)
- Requires: `module-ui`

---

## Frontend UI

### Design Principles

- **No header.** Maximum screen real estate for content.
- **Minimalist terminal-meets-VS Code.** Clean, dark, information-dense.
- **Apple-level polish.** Fluid animations on all interactions (Framer Motion).
- **VS Code fork.** The UI kernel is a lightweight code-oss fork, rebranded. Not a from-scratch React app that mimics VS Code — an actual fork of the VS Code codebase, stripped to essentials, running in the browser.

### Layout Structure

```
+---+---------------------------+-------------------+
| A |         Tab Bar           |                   |
| c |---------------------------+   Right/Bottom    |
| t |                           |    Child Panels   |
| i |      Main Panel           |   (drag-created)  |
| v |    (tab content)          |                   |
| i |                           |                   |
| t |                           |                   |
| y |                           |                   |
|   |---------------------------+-------------------+
| B |           Status Bar                          |
| a |                                               |
| r +-----------------------------------------------+
+---+
```

### Activity Bar (Left Strip)

Vertical icon strip that switches what the sidebar displays:

**Top buttons:**
- Home
- File Browser
- n8n

**Center:** Conversation list (live session indicators)

**Bottom buttons:**
- Expandable "Archived Sessions"
- Settings

### Sidebar

The sidebar is a fixed left panel that cannot be moved or resized horizontally (only collapsed). It changes content based on the active Activity Bar item:

- **Home**: Quick actions, recent sessions
- **Files**: VS Code-style file tree
- **Sessions**: Conversation list with live status indicators
- **Archive**: Archived and "zombie" sessions (deleted from Claude Code but recoverable)
- **Settings**: System configuration

### Tab Bar

- Sits at the top of the main content area
- Each tab switches the main panel content
- New tab defaults to the Home panel
- Tabs show a fading effect based on recency (most recent = bright, oldest = dim)
- Tabs are draggable for reordering
- Includes a "new panel" dropdown button (see Panel System)

### Status Bar

Bottom bar showing:
- Connection status (WebSocket state)
- Current git branch
- Permission mode
- Active model (Sonnet, Opus, etc.)
- Memory usage indicators

---

## Panel System

Panels are the core UI primitive. Every view in ClaudeOS is a panel.

### Panel Behavior

- **Directional children**: Any panel can spawn child panels in any direction (left, right, top, bottom)
- **Collapsible**: Every panel has a collapsed state. Most panels display status info when collapsed. Special panels like the sidebar have a minimal collapsed form.
- **Minimum dimensions**: Each panel defines its minimum comfortable size
- **Close button (x)**: Removes the panel from the layout
- **Draggable**: Panels can be dragged to reposition within the layout
- **Splittable**: Drag from one panel onto another to create a split view
- **Parent hierarchy**: Panels are children of either the window (sidebar) or a tab/main panel (content panels)
- **Liquid rearrangement**: When dragging panels, other panels rearrange with fluid animation so the user can preview the resulting layout as they drag

### Panel Types

#### Agent Chat View
- Visual clone of Claude Code Desktop's chat interface
- Expandable chains of thought and tool calls
- Support for all built-in Claude Code features (AskUserQuestion, etc.)
- Sends notification when user input is required; shows red notification circle on the chat in sidebar
- **Chat List View**: A live button-like UI widget showing session state:
  - Spinning Claude icon if session is actively working
  - Notification indicator for questions, error icon for failures
  - "..." menu: rename, archive, delete
  - Bold white title for unread chats
  - Gradient dimming for read chats (most recent = gray-400, oldest = gray-600)

#### Slash Commands
Discord-style slash command interface with enhanced UI for arguments:
- `/compress` - Compress context
- `/schedule` - Schedule a job
- `/remember` - Active memorization
- `/recall` - Active recall
- Can be programmatic (call n8n workflow), spawn subagents, modify chat settings (enable/disable thinking), etc.

#### Memory Graph
- Visualizer for Mem0 memory at global, project, or session scope
- View memory state at any point in a session's history
- Projection views of global memory clusters

#### n8n Panel
- Embedded n8n workflow UI
- Create, edit, run workflows without leaving ClaudeOS

#### File Browser
- VS Code-style file tree in sidebar mode
- Fullscreen explorer-type file manager as a panel
- Session diff view: List of changed files with green (+) and red (-) line counts aligned right

#### GUI Sessions
- Overview grid of all current browser/GUI sessions
- Live view or replay of a single session
- **Time scrubbing bar** with color-coded action markers
- **"Take control"** button for human to take over a browser session
- **"Hand off control"** tool for agent to request human intervention (triggers notification)
- Toggle between grid overview and single-session focus
- Back button to return to grid from single session view
- Separator between GUI-specific sessions (top) and headless sessions auto-rendered below

#### Conversation List
- Master list of all sessions' chat list view displays
- Hover coupling: hovering over a conversation in a panel highlights it in the list and vice versa
- Question mark indicator on conversations requiring user input (e.g., AskUserQuestion)

#### Home Panel
- "Start New Session" button
- Shortcuts panel (file browser, knowledge graph, task view, etc.) auto-populated based on usage
- Support for Claude artifact widgets (installed via plugins)
- Any interaction auto-creates a new tab

### New Panel Dropdown

Multi-level dropdown menu for creating panels:

**Method 1: Direct drag**
- Click and drag a panel type from the dropdown directly into the UI (inside or outside the main panel area)
- Uses the panel's default configuration
- Panels without a default config cannot be directly dragged

**Method 2: Configure then place**
- Hover or click on a panel type to see:
  - Pre-configured configs (top)
  - Last-used configs (middle)
  - Custom config button (bottom) which opens a config editor modal
- Draggable elements for each config option
- Custom config modal produces a draggable element instead of an OK button — dismiss the modal by placing the configured panel

---

## Session & Chat System

### Session Lifecycle

1. **Create**: New session spawns a Claude Code process
2. **Active**: Session is running, accepting user messages and producing responses
3. **Idle**: Session has completed its current turn, waiting for input
4. **Archived**: User has archived the session; preserved in sidebar under "Archived Sessions"
5. **Zombie**: Session deleted from Claude Code but preserved in ClaudeOS for potential revival
6. **Permanent Delete**: User explicitly permanently deletes; cleared from storage and memory

### Session Persistence

- All sessions are persisted to `/data/sessions/` as JSON
- Session state includes: messages, tool calls, metadata, timestamps
- Archived sessions and zombie sessions are kept indefinitely unless permanently deleted
- Sending a message to an archived or zombie session revives it as an active session

### Internal Task System

ClaudeOS maintains an internal task/to-do list with scheduling capabilities:

- **Do-do dates/times**: Deadlines for tasks
- **Do-at dates/times**: Scheduled execution times that fire a Claude session:
  - New session
  - Specific existing session (waits for current turn to complete if busy)
  - Specific custom agent
- Tasks can be created by the user, by Claude, or by n8n workflows
- Task completion/failure triggers are configurable

---

## Memory System

Powered by **Mem0**, the memory system provides both passive and active memory:

### Passive Memory
- Runs on all Claude Code I/O automatically
- Indexes conversations, tool usage, file changes, and outcomes
- Builds a growing knowledge graph over time
- No user intervention required

### Active Memory
- `/remember <text>` - Explicitly store something in memory
- `/recall <query>` - Search memory for relevant information
- Memory tool available to Claude for programmatic memorization and recall

### Memory Scopes
- **Global**: All knowledge across all sessions
- **Project**: Scoped to a workspace/project directory
- **Session**: Scoped to a single conversation

### Memory Visualization (UI module required)
- Interactive graph visualizer
- View memory state at any point in a session timeline
- Global memory projection views
- In-chat indicators showing when recalled memories influence responses

---

## Browser Engine

ClaudeOS includes a **Chrome stealth browser** for web automation:

### Modes
- **Headless (default)**: Ultra-fast, no GUI overhead
- **Full GUI**: Screenshot-based visual control with live rendering

### Capabilities
- **Playwright automation**: Primary automation layer
- **OmniParser fallback**: If screenshot-based control fails, falls back to OmniParser for maintaining headless operation when Playwright automation also fails
- **Stealth mode**: Anti-detection measures for web scraping and automation

### Optional Integrations
- **2Captcha** support (API key required)
- **CapSolver** support (API key required)

### GUI Session Display
- Headless sessions are auto-rendered in the GUI sessions panel below GUI-specific sessions with a separator
- Grid view of all browser sessions, or single-session focus
- Sessions are clickable to expand; back button to return to grid
- Global setting: grid vs. single-session default

---

## Automation & Scheduling

Powered by **n8n** with deep ClaudeOS integration:

### Default Workflows
- **Heartbeat**: Configurable period and frequency, defined during initial setup
- **Job failure handler**: Retry logic, escalation, and notification

### Capabilities
- Schedule Claude Code sessions to run at specific times
- Chain workflows: output of one session feeds into another
- Webhook triggers for external integrations
- Cron-based recurring tasks
- Integration with the internal task system (do-at scheduling)

---

## Security & Auth

### Authentication Layers
1. **Token auth** (default): Auto-generated or user-provided auth token
2. **Passkey auth** (module-ui-passkey-auth): WebAuthn/FIDO2 biometric or hardware key authentication

### Secret Management
- Password, passkey, and API key storage
- Works with Chrome browser extension for credential management
- JWT-based session tokens for WebSocket connections
- Secrets stored encrypted in `/data/` volume

### Settings
- Auto-populated settings panel from ClaudeOS config AND Claude Code config
- Users don't need to look up docs to enable new or experimental features
- All config options are discoverable and documented in the UI

---

## Plugin Ecosystem

### Distribution
- Modules are distributed via **GitHub Package Registry**
- All modules fork from the `module-template` repo in the `claude-nix-os` org
- Automated version control and CI/CD via GitHub Actions

### Module Template
- Standardized structure: `claudeos-module.json`, `AGENTS.md`, `src/`, `__tests__/`
- Dependency declaration and resolution
- Automated testing in isolation

### What Plugins Can Do
- Add custom UI components to standard locations (navbar, settings pages, sidebar sections)
- Register new panel types
- Add slash commands
- Add API routes and WebSocket handlers
- Start background services
- Claude can create new panels as artifacts and install them as plugins
- Community modules extend ClaudeOS just like VS Code extensions extend VS Code

---

## Deployment

### Railway (Primary)
- One-click deploy via "Deploy on Railway" button in the GitHub repo
- `railway.toml` configures build, healthcheck, and restart policies
- Persistent volume at `/data` for sessions, memory, configs, and secrets
- Auth token stored as Railway secret variable
- Auto-updated: pushes to the ClaudeOS repo trigger updates to the Railway Template repo

### Docker (Generic)
- Multi-stage Dockerfile: builder (Node.js) + production (Node.js slim)
- Supervisord manages multiple processes (Next.js server, Mem0, n8n)
- Volume mount at `/data` for persistence

### NixOS Flake
- Reproducible builds via `flake.nix`
- Can spawn test flakes with different module configurations
- Self-testing: ClaudeOS can create, test, and iterate on new kernel versions

---

## Tech Stack

### Backend
- **Claude Code**: Agent core runtime
- **Node.js 22 LTS + TypeScript**: Kernel server, module loader, API
- **Next.js**: SSR frontend, API routes
- **Mem0 (Python)**: Memory system
- **n8n**: Workflow automation
- **SQLite**: Lightweight data persistence
- **WebSocket (ws)**: Real-time communication
- **JWT (jose)**: Authentication tokens

### Frontend
- **VS Code fork (code-oss)**: Lightweight browser-based code editor, rebranded
- **Next.js + React**: SSR application shell
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Fluid animations
- **Zustand**: State management
- **react-resizable-panels**: Split view panel layout
- **D3.js**: Memory graph visualization
- **Lucide React**: Icon system

### Infrastructure
- **NixOS**: Reproducible system configuration
- **Docker**: Containerization
- **Railway**: Cloud deployment
- **GitHub Package Registry**: Module distribution
- **Supervisord**: Process management

---

## External Dependencies

| Dependency | Purpose | Required |
|---|---|---|
| Anthropic API Key | Claude Code agent runtime | Yes |
| GitHub PAT | Module distribution, repo management | Yes |
| Railway API Key | Cloud deployment and management | For Railway deploy |
| 2Captcha API Key | CAPTCHA solving in browser automation | Optional |
| CapSolver API Key | CAPTCHA solving in browser automation | Optional |

---

## Repository Structure

```
claude-nix-os/                          # GitHub Organization
  ClaudeOS/                              # Core kernel + flake
    flake.nix                            # NixOS flake definition
    kernel/                              # HTTP/WS server, module loader
    src/                                 # Next.js frontend app shell
    modules.json                         # Module registry
    PROJECT.md                           # This document
  railway-template/                      # Railway-specific deployment
    Dockerfile                           # Multi-stage build
    railway.toml                         # Railway configuration
    modules/                             # Bundled official modules
    entrypoint.sh                        # Container entrypoint
  module-template/                       # Fork this to create modules
    claudeos-module.json                 # Module manifest template
    AGENTS.md                            # Agent instructions
    src/index.ts                         # Module entrypoint
  module-ui/                             # VS Code fork UI module
  module-memory/                         # Mem0 memory module
  module-n8n/                            # n8n automation module
  module-file-explorer/                  # File browser module
  module-ui-passkey-auth/                # Passkey auth module
  module-railway-tools/                  # Railway management module
  module-ui-railway-sidecar/             # Railway URL serving module
```

---

*ClaudeOS: The computer that thinks with you.*
