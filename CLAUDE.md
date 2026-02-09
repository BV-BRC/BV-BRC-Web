# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BV-BRC-Web is the web frontend for the Bacterial and Viral Bioinformatics Resource Center. It's built with Express.js backend and Dojo/Dijit frontend using AMD modules.

**Tech Stack:**
- Backend: Express.js 4.x, EJS/Pug templates, Node.js 14+
- Frontend: Dojo Toolkit (AMD modules), Dijit widgets, D3.js, Cytoscape.js
- Genome Browser: JBrowse integration
- Build: Dojo build tools (not Webpack)

## Development Commands

```bash
# Setup
npm install
git submodule update --init
cp p3-web.conf.sample p3-web.conf  # Edit with service URLs

# Start development server (http://localhost:3000)
npm start

# Linting
npm run eslint:test                              # Lint all
./node_modules/.bin/eslint public/js/p3/widget/SomeWidget.js --fix  # Single file

# Build production JavaScript (outputs to public/js/release/)
./buildClient.sh

# Tests (uses Intern.js)
npm test
```

## Architecture

### Server Side
- `bin/p3-web` - Entry point (HTTP/HTTPS server)
- `app.js` - Express app configuration and middleware
- `config.js` - nconf-based configuration loader
- `routes/` - Express route handlers (17+ files)
- `views/` - EJS/Pug templates

### Client Side (`public/js/p3/`)
- `app/` - Main application modules (p3app.js entry point)
- `widget/` - 274 Dijit-based UI components
- `store/` - Data stores extending Dojo's JsonRest pattern
- `router.js` - Client-side routing

### Widget Pattern
Widgets extend `dijit/_WidgetBase` using AMD format:
```javascript
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  './SomeOtherWidget'
], function (declare, WidgetBase, SomeOtherWidget) {
  return declare([WidgetBase], {
    // Widget implementation
  })
})
```

### Data Store Pattern
Custom stores in `public/js/p3/store/` extend Dojo stores with REST API integration using RQL (Resource Query Language).

## Configuration

Runtime config in `p3-web.conf` (created from sample):
- Service URLs: workspaceServiceURL, appServiceURL, dataServiceURL, homologyServiceURL
- Proxy routes for external services
- Session and authentication settings
- Copilot AI integration settings

## Git Submodules

The project uses 23+ submodules for frontend libraries in `public/js/`:
- Core: dojo, dijit, dojox, dgrid, rql
- Visualization: d3, cytoscape plugins, msa, phyloview, archaeopteryx, circulus, mauve_viewer
- Utilities: FileSaver, lazyload, json-schema

Always run `git submodule update --init` after cloning.

## Code Style

ESLint with `airbnb-base/legacy` (lenient for legacy code):
- No semicolon requirement
- AMD globals allowed: dojo, dijit, d3, cytoscape, BVBRCClient
- Most strict rules disabled

Pre-commit hook available - see `docs/pre-commit-linting.md`.

## Key Domains

- **Search**: Advanced RQL-based queries across genomes, features, sequences
- **Visualization**: Circular genome viewer, pathway maps, phylogenetic trees, MSA viewer, heatmaps
- **Workspace**: File management, uploads, job submission
- **JBrowse**: Embedded genome browser with custom tracks
- **Copilot**: AI chat integration (`public/js/p3/widget/copilot/`)
