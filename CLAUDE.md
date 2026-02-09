# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Run Commands

```bash
# Install dependencies (first time setup)
npm install
git submodule update --init

# Run development server (http://localhost:3000)
npm start

# Run tests (includes ESLint + Jest)
npm test

# Run ESLint only
eslint .
```

Configuration: Copy `p3-web.conf.sample` to `p3-web.conf` and configure service URLs. Server restart required after config changes.

## Architecture Overview

### Stack
- **Backend**: Express.js server (`app.js`) with EJS templates (`views/`)
- **Frontend**: Dojo Toolkit with AMD module loading pattern
- **Entry Point**: `bin/p3-web` (creates HTTP/HTTPS server on port 3000)

### Frontend Module Pattern (Dojo AMD)
All frontend JavaScript uses the AMD `define()` pattern:
```javascript
define(['dojo/_base/declare', 'dojo/topic', './SomeWidget'],
  function(declare, Topic, SomeWidget) {
    return declare([BaseClass], { /* implementation */ });
  });
```

Key Dojo components: `dijit/` (widgets), `dojo/store/` (data), `dojo/topic` (pub/sub), `dijit/layout/BorderContainer` (layouts).

### Directory Structure

```
public/js/p3/           # Main Dojo application
├── app/                # Application shells (p3app.js, app.js)
├── widget/             # UI components (274 dijit widgets)
├── store/              # Data stores (57 stores)
├── util/               # Helper modules
├── JobManager.js       # Job polling service
├── WorkspaceManager.js # Workspace service
└── router.js           # Client-side routing

routes/                 # Express route handlers
views/                  # EJS templates
lib/                    # Backend utilities
```

### Data Flow Pattern
```
Backend API (AppService, DataAPI)
    ↓
Store (public/js/p3/store/*.js)
    ↓
Widget (public/js/p3/widget/*.js)
    ↓
UI Rendering
```

### Key Services
- **JobManager** (`public/js/p3/JobManager.js`): Polls job status, publishes updates via `/Jobs` topic
- **WorkspaceManager**: Manages user workspace and file operations
- **DataAPI**: Queries biological data (genomes, features, etc.)

### Pub/Sub Communication
Widgets communicate via `dojo/topic`:
- `/Jobs` - Job status updates
- `/showChatButton`, `/hideChatButton` - Copilot visibility
- `/refreshWorkspace` - Workspace updates

### Route Structure
```
/           → Home and static pages
/app/*      → Application forms
/job/*      → Job management
/workspace  → User workspace
/view/*     → Data viewers
/search     → Search interface
/p/:proxy   → API proxy to backend services
```

## Production Build

Development loads modules directly from `/js/p3/`. Production uses versioned bundles:
- Version determined by `package.json` version field
- Bundles: `/js/[version]/release/`, `/js/[version]/bundle/bundle.js`
