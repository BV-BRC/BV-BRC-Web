/**
 * @module p3/widget/copilot/CopilotToolHandler
 * @description A widget class that handles special processing for specific tools in SSE events.
 * Processes tool-specific responses and transforms them as needed.
 *
 * Implementation:
 * - Accepts currentEvent and tool parameters
 * - Handles special cases for specific tools
 * - Returns processed data or null if no special handling needed
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang'
], function(
  declare, lang
) {
  /**
   * @class CopilotToolHandler
   * @description Handles special tool processing for SSE events
   */
  return declare(null, {
    /**
     * Processes a tool-specific event
     * @param {string} currentEvent - The current SSE event type
     * @param {string} tool - The tool name
     * @param {Object} parsed - The parsed event data
     * @returns {Object|null} Processed data or null if no special handling
     */
    processToolEvent: function(currentEvent, tool, parsed) {
      // Handle final_response event for workflow manifest tool
      if (currentEvent === 'final_response' &&
          tool === 'bvbrc_server.generate_workflow_manifest' &&
          parsed.chunk) {
        try {
          // Parse the chunk as JSON
          const parsedChunk = JSON.parse(parsed.chunk);
          // Format as markdown code fence
          const jsonString = JSON.stringify(parsedChunk, null, 2);
          const formattedChunk = '```json\n' + jsonString + '\n```';
          return {
            ...parsed,
            chunk: formattedChunk
          };
        } catch (e) {
          console.error('[CopilotToolHandler] Failed to parse chunk as JSON:', e);
          // Return original if parsing fails
          return parsed;
        }
      }

      // No special handling needed
      return null;
    },

    /**
     * Processes message content based on source_tool
     * Applies tool-specific transformations to the content for display in chat messages
     * @param {string} content - The message content
     * @param {string} sourceTool - The source_tool field from the message
     * @returns {string} Processed content ready for display
     */
    processMessageContent: function(content, sourceTool) {
      if (!sourceTool || !content) {
        return content;
      }

      // Create a parsed object similar to what processToolEvent expects
      var parsed = {
        chunk: content
      };

      // Use processToolEvent to handle tool-specific processing
      var processed = this.processToolEvent('final_response', sourceTool, parsed);

      if (processed && processed.chunk) {
        // Return the processed chunk (already formatted by processToolEvent)
        return processed.chunk;
      }

      // No special handling for this tool, return original content
      return content;
    }
  });
});

