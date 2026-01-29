# SSE Event Display Implementation Guide

## Overview

This implementation adds support for displaying SSE (Server-Sent Events) from the Copilot agent orchestrator directly in the chat window as status messages. Users can see real-time updates about agent activities, tool executions, and progress as messages in the chat interface.

## Key Features

- **Single Updating Status Message**: One status message that updates throughout the agent execution
- **Full Tool Details**: Shows tool names and complete parameters in JSON format
- **Iteration Tracking**: Displays every iteration and progress percentage
- **Automatic Cleanup**: Status messages are removed when processing is complete
- **Session-Only**: Status messages are not saved to the backend (ephemeral)
- **Distinctive Styling**: Status messages have a unique gray appearance with monospace font

## Architecture

### Component Overview

```
SSE Event Flow:
Backend → CopilotApi → CopilotSSEEventHandler → CopilotInput → ChatStore → CopilotDisplay → ChatMessage
```

### New Files Created

1. **`CopilotSSEEventHandler.js`** - Core event handler class
   - Formats SSE events into status messages
   - Manages status message lifecycle (create/update/remove)
   - Tracks agent state (iterations, tools, progress)

### Modified Files

2. **`CopilotApi.js`** - API integration
   - Imports `CopilotSSEEventHandler`
   - Instantiates event handler for each stream request
   - Adds `onStatusMessage` callback parameter
   - Processes all SSE events through handler

3. **`CopilotInput.js`** - Input handling
   - Added `onStatusMessage` handler to all 4 stream methods:
     - `_handleRegularSubmitStream`
     - `_handleRagSubmitStream`
     - `_handlePageSubmitStream`
     - `_handlePageContentSubmitStream`
   - Manages status message add/update/remove in chat store

4. **`ChatMemoryStore.js`** - Data storage
   - Added `getMessageById()` - Find message by ID
   - Added `updateMessage()` - Update existing message
   - Added `removeMessage()` - Remove message by ID

5. **`ChatMessage.js`** - Message rendering
   - Added `renderStatusMessage()` method
   - Status messages styled with:
     - Gray background (#f8f9fa)
     - Left border (3px solid #6c757d)
     - Smaller font (fontSize - 2px, min 11px)
     - Monospace font
     - Compact padding

6. **`CopilotDisplay.js`** - (No changes needed)
   - Automatically handles status messages through existing flow

## SSE Events Handled

### Queue Service Events

| Event | Display | Example |
|-------|---------|---------|
| `queued` | ⏳ Request queued... | Initial queue status |
| `started` | 🔄 Processing started... | Processing begins |
| `progress` | 🔄 Processing: Iteration 2/5 (40%)<br>📊 Status: running | Progress updates |

### Agent Orchestrator Events

| Event | Display | Details |
|-------|---------|---------|
| `tool_selected` | 🔧 Tool Selected: **genome_query**<br>📝 Iteration: 1<br>💭 Reasoning: User wants...<br>⚙️ Parameters:<br>```json {...}``` | Full tool details |
| `tool_executed` (success) | ✅ Tool Executed: **genome_query** (Success)<br>📝 Iteration: 1<br>📊 Result: 1,234 results... | Success with preview |
| `tool_executed` (failed) | ❌ Tool Executed: **genome_query** (Failed)<br>📝 Iteration: 1<br>⚠️ Error: Connection timeout | Failure with error |
| `duplicate_detected` | ⚠️ Duplicate Action Detected<br>📝 Current Iteration: 3<br>🔁 Duplicate of Iteration: 1<br>💬 Skipping... | Warning message |
| `forced_finalize` | ⚠️ Finalization Forced<br>📋 Reason: duplicate_with_data<br>💬 Agent has sufficient data | Warning message |
| `final_response` | 💬 Generating response...<br>✓ Analysis complete (2 tools used) | Response generation |
| `done` | ✓ Complete<br>📊 3 iterations<br>🔧 2 tools used | Completion summary |
| `error` | ❌ Error<br>⚠️ Connection failed<br>🔄 Retry attempt: 1<br>⏳ Will retry... | Error with retry info |

### Special Events

| Event | Handling |
|-------|----------|
| `content` / `final_response` | Streams to regular assistant message (existing behavior) |
| Heartbeats (`: heartbeat`) | Ignored (keep-alive only) |

## Message Lifecycle

### User Query Submission

```
1. User submits query
   └─> User message added to chat

2. SSE: queued
   └─> Status message created: "⏳ Request queued..."

3. SSE: started
   └─> Status message updated: "🔄 Processing started..."

4. SSE: tool_selected (iteration 1)
   └─> Status message updated: "🔧 Tool Selected: genome_query..."

5. SSE: tool_executed (success)
   └─> Status message updated: "✅ Tool Executed: genome_query (Success)..."

6. SSE: progress (iteration 1)
   └─> Status message updated: "🔄 Processing: Iteration 1/5 (20%)..."

7. SSE: tool_selected (iteration 2)
   └─> Status message updated: "🔧 Tool Selected: blast_search..."

... (continues for each tool/iteration) ...

8. SSE: final_response (streaming chunks)
   └─> Assistant message streams character by character
   └─> Status message updated: "💬 Generating response..."

9. SSE: done
   └─> Status message updated: "✓ Complete - 3 iterations, 2 tools used"
   └─> Status message REMOVED after brief display
```

### Status Message Properties

```javascript
{
  role: 'status',              // Identifies as status message
  content: '🔄 Processing...', // Formatted markdown content
  message_id: 'status_123456', // Unique ID (status_ prefix + timestamp)
  timestamp: '2026-01-28...',  // ISO timestamp
  event_type: 'progress',      // Original SSE event type
  is_temporary: true,          // Marks as temporary
  save_chat: false,            // NOT saved to backend
  should_remove: false         // Set to true when done (signals removal)
}
```

## Code Integration

### How CopilotApi Integrates the Handler

```javascript
// In submitCopilotQueryStream()

// Create event handler
var eventHandler = new CopilotSSEEventHandler();
eventHandler.resetState();

// Process each SSE event
const parsed = JSON.parse(content);
var statusMessage = eventHandler.handleEvent(currentEvent, parsed);

// Send to callback if message created/updated
if (statusMessage && onStatusMessage) {
  onStatusMessage(statusMessage);
}

// Special handling for 'done' event
if (currentEvent === 'done' && statusMessage.should_remove) {
  onStatusMessage({ ...statusMessage, should_remove: true });
}
```

### How CopilotInput Handles Status Messages

```javascript
// In all submitCopilotQueryStream() calls

(statusMessage) => {
  // onStatusMessage callback

  if (statusMessage.should_remove) {
    // Remove when done
    this.chatStore.removeMessage(statusMessage.message_id);
  } else {
    // Add or update
    var existingMessage = this.chatStore.getMessageById(statusMessage.message_id);
    if (existingMessage) {
      this.chatStore.updateMessage(statusMessage);
    } else {
      this.chatStore.addMessage(statusMessage);
    }
  }

  // Refresh display
  this.displayWidget.showMessages(this.chatStore.query());
}
```

## Configuration

### Event Handler Configuration

The `CopilotSSEEventHandler` accepts configuration options:

```javascript
var eventHandler = new CopilotSSEEventHandler({
  showQueuedStatus: true,        // Show "Request queued" message
  showProgressUpdates: true,     // Show iteration progress
  showToolSelection: true,       // Show tool selection details
  showToolResults: true,         // Show tool execution results
  showDuplicateWarnings: true    // Show duplicate detection warnings
});
```

Currently all options are enabled by default.

## Styling Details

### Status Message CSS (Applied Inline)

```css
.markdown-content.status-content {
  font-size: [fontSize - 2]px;  /* Min 11px */
  background-color: #f8f9fa;    /* Light gray background */
  border-left: 3px solid #6c757d; /* Gray left border */
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: 4px;
  color: #495057;               /* Dark gray text */
  font-family: monospace;       /* Code-like appearance */
}
```

### Message Role Classes

The status message div also gets the class `message status`:

```html
<div class="message status" style="margin-top: 5px;">
  <div class="markdown-content status-content" style="...">
    🔧 Tool Selected: genome_query...
  </div>
</div>
```

## Testing the Implementation

### Expected Behavior

1. **Submit a Query**
   - User message appears immediately
   - Status message appears: "⏳ Request queued..."

2. **Processing Starts**
   - Status message updates: "🔄 Processing started..."

3. **Tool Selection**
   - Status message updates with tool details:
     ```
     🔧 Tool Selected: genome_query
     📝 Iteration: 1
     💭 Reasoning: User wants to search genomes
     ⚙️ Parameters:
     ```json
     {
       "query": "Escherichia coli",
       "limit": 100
     }
     ```
     ```

4. **Tool Execution**
   - Status message updates with results

5. **Final Response**
   - Status message updates: "💬 Generating response..."
   - Assistant message streams in character by character

6. **Completion**
   - Status message briefly shows: "✓ Complete - 3 iterations, 2 tools used"
   - Status message disappears
   - Only user and assistant messages remain

### Console Logs to Monitor

```
[SSE] Initiating stream request
[SSE] Event type: queued
[SSE] Status message created/updated: {...}
[HANDLER] Status message received: {...}
[SSE] Event type: tool_selected
[SSE] Status message created/updated: {...}
[HANDLER] Status message received: {...}
...
[SSE] Event type: done
[SSE] Removing status message
```

## Troubleshooting

### Status Message Not Appearing

**Check:**
1. Backend is sending proper SSE events (check Network tab)
2. Events have proper format: `event: name` and `data: json`
3. Console shows `[SSE] Status message created/updated` logs
4. `onStatusMessage` callback is defined in all stream handlers

### Status Message Not Updating

**Check:**
1. `message_id` stays consistent across updates
2. `chatStore.updateMessage()` is being called
3. `displayWidget.showMessages()` is called after update

### Status Message Not Removed

**Check:**
1. `done` event is being received
2. `should_remove: true` flag is set
3. `chatStore.removeMessage()` is being called
4. No errors in console

### Wrong Styling

**Check:**
1. Message has `role: 'status'`
2. `renderStatusMessage()` is being called in ChatMessage.js
3. Inline styles are being applied correctly

## Future Enhancements

Potential improvements that could be added:

1. **Collapsible Tool Parameters** - Hide/show JSON parameters
2. **Progress Bar** - Visual progress indicator
3. **Tool Execution Timeline** - Visual timeline of tools used
4. **Persistent Mode** - Option to save status messages
5. **Configuration UI** - User preference toggles
6. **Color-Coded Tools** - Different colors for different tool types
7. **Execution Time** - Show duration for each tool
8. **Retry Indicators** - Visual retry counter for errors

## API Reference

### CopilotSSEEventHandler Methods

```javascript
// Reset state for new query
eventHandler.resetState()

// Process SSE event
var statusMessage = eventHandler.handleEvent(eventName, eventData)
// Returns: message object or null

// Create new status message
var message = eventHandler.createStatusMessage(content, eventType)

// Update existing status message
var message = eventHandler.updateStatusMessage(content, eventType)

// Get current message for removal
var message = eventHandler.getStatusMessageForRemoval()
```

### ChatMemoryStore Methods (New)

```javascript
// Find message by ID
var message = chatStore.getMessageById(messageId)
// Returns: message object or null

// Update message
var success = chatStore.updateMessage(messageObject)
// Returns: true if updated, false if not found

// Remove message
var success = chatStore.removeMessage(messageId)
// Returns: true if removed, false if not found
```

## Summary

This implementation provides a clean, non-intrusive way to display agent activity in the chat window. Status messages give users insight into what the agent is doing without cluttering the chat history or requiring new UI components. The messages are ephemeral, updating in real-time, and automatically clean up when processing completes.

The architecture is extensible - new event types can be added by simply creating a new formatter function in `CopilotSSEEventHandler.js` following the pattern `format_eventname()`.

