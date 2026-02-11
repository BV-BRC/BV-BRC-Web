# Priority User Sorting in Public Workspaces

## Overview

Add a configuration variable that specifies a list of "priority" users whose public workspaces should appear at the top of the public workspaces listing. This priority grouping only applies to the default sort order; explicit column header sorts override it.

---

## Implementation Steps

### 1. Add Configuration Variable

**File:** `p3-web.conf` (and `p3-web.conf.sample`)

Add a new configuration option:
```javascript
"priorityPublicWorkspaceUsers": ["user1@patricbrc.org", "user2@patricbrc.org", "BV-BRC@patricbrc.org"]
```

**File:** `config.js`

Add default value alongside other defaults:
```javascript
priorityPublicWorkspaceUsers: []
```

### 2. Expose Configuration to Frontend

**File:** `routes/workspace.js` or `app.js`

Pass the configuration to the frontend via `window.App.config.priorityPublicWorkspaceUsers` set during page initialization.

### 3. Modify Public Workspace Sorting

**Primary file:** `public/js/p3/widget/WorkspaceGrid.js` or relevant store

Implement custom sorting logic:

```javascript
_applyPrioritySort: function(workspaces, sort) {
  var priorityUsers = window.App.config.priorityPublicWorkspaceUsers || [];

  // Only apply priority grouping for default sort (no explicit user sort)
  if (this._userExplicitSort) {
    return this._applySorting(workspaces, sort);
  }

  // Partition into priority and non-priority groups
  var priority = [];
  var nonPriority = [];

  workspaces.forEach(function(ws) {
    var owner = ws.owner || ws.owner_id;
    if (priorityUsers.indexOf(owner) !== -1) {
      priority.push(ws);
    } else {
      nonPriority.push(ws);
    }
  });

  // Sort each group by default criteria
  priority = this._applySorting(priority, sort);
  nonPriority = this._applySorting(nonPriority, sort);

  // Concatenate: priority first, then non-priority
  return priority.concat(nonPriority);
}
```

### 4. Track Explicit User Sorts

When user clicks a column header:
- Set `this._userExplicitSort = true`
- Apply standard sorting without priority grouping

When navigating to public workspaces or resetting filters:
- Set `this._userExplicitSort = false`
- Apply priority grouping with default sort

### 5. Key Files to Modify

| File | Change |
|------|--------|
| `p3-web.conf` | Add `priorityPublicWorkspaceUsers` array |
| `p3-web.conf.sample` | Add example configuration |
| `config.js` | Add default `priorityPublicWorkspaceUsers: []` |
| `app.js` or `routes/workspace.js` | Expose config to `window.App.config` |
| `public/js/p3/widget/WorkspaceGrid.js` | Add priority sort logic and explicit sort tracking |

---

## Behavior Summary

| Scenario | Behavior |
|----------|----------|
| Default load of public workspaces | Priority users' workspaces appear first |
| User clicks column header to sort | Standard sort, no priority grouping |
| Priority user has no public workspaces | They simply don't appear (no empty placeholder) |
| User navigates away and returns | Priority grouping reapplied (reset explicit sort flag) |
