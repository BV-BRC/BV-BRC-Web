# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BV-BRC Web is the Bacterial and Viral Bioinformatics Resource Center website - a Node.js/Express.js web application for bioinformatics data visualization and analysis.

## Common Commands

```bash
# Start development server (port 3000)
npm start

# Run tests (ESLint + Jest)
npm test

# Run ESLint on p3 widget code
./node_modules/.bin/eslint public/js/p3

# Run ESLint with auto-fix
./node_modules/.bin/eslint --fix <file>

# Initialize git submodules (required after clone)
git submodule update --init
```

## Architecture

### Backend (Express.js)
- **Entry point:** `bin/p3-web` - Server initialization with SSL support
- **App config:** `app.js` - Express middleware stack, routes, error handling
- **Config:** `config.js` + `p3-web.conf` - nconf-based configuration (argv → env → file → defaults)
- **Routes:** `routes/` - Express route handlers
- **Views:** `views/` - EJS templates
- **Security:** `lib/securityUtils.js` - Input sanitization utilities

### Frontend (Dojo Toolkit)
- **Location:** `public/js/p3/` - Main application code
- **Framework:** Dojo 1.x AMD modules (legacy)
- **Key directories:**
  - `widget/` - UI components (dijit-based)
  - `widget/viewer/` - Data visualization viewers
  - `store/` - Data stores (JsonRest, Memory)
  - `resources/` - CSS stylesheets

### Widget Pattern
Widgets follow Dojo's dijit pattern:
```javascript
define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', ...
], function (declare, BorderContainer, ...) {
  return declare([BorderContainer], {
    // Properties
    region: 'center',

    // Lifecycle methods
    postCreate: function() { this.inherited(arguments); },
    startup: function() { this.inherited(arguments); },

    // Custom methods
    _setStateAttr: function(state) { ... }
  });
});
```

### GridContainer Pattern
Data grids extend `GridContainer` (a BorderContainer) with:
- `gridCtor` - The grid class to instantiate
- `dataModel` - API endpoint name
- `store` - Data store instance
- `onFirstView()` - Called when tab first becomes visible
- `onSetState()` - Called when state changes (via watcher)
- `buildQuery()` - Constructs RQL query from state

### Topic-based Communication
Components communicate via `dojo/topic`:
```javascript
// Publish
Topic.publish('/domainGrid/select', { ids: selectedIds });

// Subscribe
Topic.subscribe('/domainViewer/hover', function(data) { ... });
```

## Key Patterns

### BorderContainer Layout
Dijit's BorderContainer is the primary layout widget. Key concepts:

**Design modes:**
- `design: 'headline'` (default) - Top/bottom regions span full width, left/right fit between
- `design: 'sidebar'` - Left/right regions span full height, top/bottom fit between

**Layout priority:**
Higher `layoutPriority` values position widgets closer to the center. Example:
```javascript
// Right panel (lower priority, laid out first, spans to edge)
rightPanel: { region: 'right', layoutPriority: 3 }

// Top visualization (higher priority, laid out after, aligns with center content)
visualization: { region: 'top', layoutPriority: 5 }
```

**ContentPane in BorderContainer:**
When adding custom panels to a BorderContainer:
```javascript
// Extend ContentPane, not plain widget
return declare([ContentPane], {
  region: 'top',
  style: 'height: 250px; overflow-y: auto;',
  layoutPriority: 5,
  splitter: false
});

// Add as child (not placeAt)
this.addChild(this.visualizationPanel);
```

### State Management
Viewer tabs receive state via `set('state', stateObj)` which triggers:
1. `_setStateAttr` (if defined) or default setter
2. Watcher callback (`watch('state', ...)`) calling `onSetState`
3. Grid query rebuild and refresh

### Data API Queries
Use RQL (Resource Query Language):
```javascript
// Single item
'eq(feature_id,PATRIC.123.456)'

// Multiple conditions
'and(eq(genome_id,123),gt(score,0.5))'

// With filters
state.search + '&' + state.hashParams.filter
```

### Visualization Components
- D3.js for custom visualizations (charts, domain viewers)
- Cytoscape for network graphs
- JBrowse for genome browser (git submodule)
- Mauve viewer for genome alignments (see below)

### Mauve Genome Alignment Viewer
The genome alignment viewer (`public/js/mauve_viewer/`) displays aligned genome sequences:

**Key files:**
- `src/mauve-viewer.js` - Main viewer class
- `src/track.js` - Individual genome track rendering
- `src/colors.js` - Color palette definitions
- `src/backbone.js` - LCB connection lines between tracks

**Color scheme:**
- **LCBs (Locally Collinear Blocks):** Colored rectangles using a 20-color categorical palette. Same LCB across different genomes has the same color. Colors cycle if >20 LCBs.
- **Contigs:** Vertical red lines (`#b50707`) at 65% opacity marking contig boundaries
- **Features:** Gray rectangles (`#777`) at 40% opacity, only visible when zoomed ≤100,000 bp

**LCB Color Palette (in order):**
1. Blue `rgb(31, 119, 180)`, Light blue `rgb(174, 199, 232)`
2. Orange `rgb(255, 127, 14)`, Light orange `rgb(255, 187, 120)`
3. Green `rgb(44, 160, 44)`, Light green `rgb(152, 223, 138)`
4. Red `rgb(214, 39, 40)`, Light red `rgb(255, 152, 150)`
5. Purple `rgb(148, 103, 189)`, Light purple `rgb(197, 176, 213)`
6. Brown `rgb(140, 86, 75)`, Light brown `rgb(196, 156, 148)`
7. Pink `rgb(227, 119, 194)`, Light pink `rgb(247, 182, 210)`
8. Gray `rgb(127, 127, 127)`, Light gray `rgb(199, 199, 199)`
9. Yellow-green `rgb(188, 189, 34)`, Light yellow-green `rgb(219, 219, 141)`
10. Cyan `rgb(23, 190, 207)`, Light cyan `rgb(158, 218, 229)`

### Workspace and Job Result Navigation
Workspace browsing is handled by `WorkspaceBrowser.js` with these key patterns:

**Panel reuse:** When navigating between items of the same type, the existing panel is reused rather than creating a new one. The `instanceof` check determines if panel can be reused.

**Job results:** Job results (`type: 'job_result'`) are special:
- Files stored in hidden folders (e.g., `.JobName/` contains output files)
- `JobResult.js` viewer displays job metadata header + file grid
- Nested job results (e.g., "assembly" inside Comprehensive Genome Analysis) require `set('data', obj)` not `set('path', ...)` when reusing panels
- When reusing JobResult panels, the existing viewer must be destroyed before creating a new one to prevent overlay issues

**Key files:**
- `widget/WorkspaceBrowser.js` - Main workspace navigation and panel management
- `widget/WorkspaceExplorerView.js` - File/folder grid display
- `widget/viewer/JobResult.js` - Job result viewer with metadata header

## Configuration

Edit `p3-web.conf` (copy from `p3-web.conf.sample`):
- `http_port` - Server port (default: 3000)
- `production` - Production mode flag
- `dataServiceURL` - BV-BRC Data API endpoint
- `workspaceServiceURL` - Workspace service endpoint

**Important:** Restart server after config changes.

## Security Utilities

Use `lib/securityUtils.js` for user input:
- `sanitizeEmail()` - Email validation + CRLF prevention
- `sanitizeUrlPath()` - XSS prevention
- `sanitizeText()` - HTML tag stripping
- `validateIntegerInRange()` - Bounds checking
- `validateAllowedValue()` - Whitelist validation

## ESLint Configuration

Based on airbnb-base/legacy with relaxed rules for legacy Dojo code:
- Environments: browser, node, AMD, jQuery, ES6
- Global symbols: dojo, dijit, d3, cytoscape, etc.
- Most strict rules disabled for compatibility

## External Service URLs

Configured in `p3-web.conf`:
- Data API: `/api/` proxy
- Workspace: `/workspace/` proxy
- App Service: Job submission
- Homology Service: BLAST searches
- Compare Regions: Genome comparison

## Dijit Form Validation Patterns

When working with dijit form validation, be aware of these key behaviors:

### Form Validation and Focus
When `dijit/form/Form.validate()` is called (which happens on every keystroke if `intermediateChanges: true`):
1. It iterates through all form widgets calling `isValid()`
2. If a widget returns `false`, the Form **scrolls to it and calls `focus()`**
3. This can steal focus from the field the user is currently typing in

**Solution:** Override `focus()` in widgets that shouldn't receive automatic focus:
```javascript
focus: function () {
  // Only focus if user explicitly initiated it
  if (this._userInitiatedFocus) {
    this._userInitiatedFocus = false;
    this.searchBox.focus();
  }
  // Otherwise, block automatic focus from form validation
}
```

### Making Custom Widgets Participate in Form Validation
To make a custom widget participate in dijit form validation:
1. Add `dijit/form/_FormValueMixin` to the widget's declare chain
2. Implement `isValid(isFocused)` method that returns boolean
3. Implement `validate(isFocused)` method for visual feedback
4. Ensure the widget has a `name` attribute in the template

**Warning:** Adding `_FormValueMixin` makes the widget subject to Form's focus-stealing behavior.

### Validation Order Matters
When validating optional fields, check if the field is required/empty **before** calling inner widget's `isValid()`:
```javascript
validate: function (isFocused) {
  // Check optional empty FIRST - return early to avoid inner validation
  if (!this.required) {
    var value = this.get('value') || '';
    if (!value || value === '') {
      return true;  // Optional empty = valid
    }
  }
  // Only now check inner widget (which might return false for empty)
  return this.innerWidget.isValid(isFocused);
}
```

### Dijit Error Styling
To show validation errors visually without triggering dijit side effects:
```javascript
// DO: Just add CSS classes
domClass.add(widget.domNode, 'dijitError');
domClass.add(widget.domNode, 'dijitTextBoxError');

// DON'T: Manipulate dijit internal state (can cause focus issues)
widget._set('state', 'Error');
widget._hasBeenBlurred = true;  // Can trigger refresh/focus behavior
```

### Widget Lifecycle and Null Checks
Widgets created conditionally (e.g., only when user is logged in) may not exist during early validation:
```javascript
// In startup() - widget may not exist yet
this.inherited(arguments);  // Calls validate()

// In validate() - always check existence
var value = this.optionalWidget ? this.optionalWidget.get('value') : '';
```
