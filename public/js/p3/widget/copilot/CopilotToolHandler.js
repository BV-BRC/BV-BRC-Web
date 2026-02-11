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
     * Helper function to process workflow manifest tool data
     * @param {string|Object} chunk - The JSON string to parse or an object with content
     * @param {Object} baseData - Base data object to extend
     * @returns {Object|null} Processed data or null if parsing fails
     */
    _processWorkflowManifest: function(chunk, baseData) {
      if (!chunk) {
        return null;
      }

      // Diagnostic logging
      console.log('[CopilotToolHandler] _processWorkflowManifest called');
      console.log('[CopilotToolHandler] chunk type:', typeof chunk);
      if (typeof chunk === 'object') {
        console.log('[CopilotToolHandler] chunk keys:', Object.keys(chunk));
        console.log('[CopilotToolHandler] has .content?', 'content' in chunk);
        console.log('[CopilotToolHandler] has .workflow_id?', 'workflow_id' in chunk);
        console.log('[CopilotToolHandler] has .workflow_json?', 'workflow_json' in chunk);
        console.log('[CopilotToolHandler] has .steps?', 'steps' in chunk);
      } else if (typeof chunk === 'string') {
        console.log('[CopilotToolHandler] chunk string (first 100 chars):', chunk.substring(0, 100));
      }

      try {
        let content, parsedChunk;

        // If chunk is already a fully parsed workflow object, use it directly
        // Check for old format (direct workflow) or new format (with workflow_json)
        if (typeof chunk === 'object' && !chunk.content) {
          // New format: {workflow_id, status, workflow_json: {...}, ...}
          if (chunk.workflow_json) {
            console.log('[CopilotToolHandler] ✓ Path A1: Chunk is new format with workflow_json');
            // Extract workflow_json and merge with top-level metadata
            let workflowData = {
              ...chunk.workflow_json,
              // Add execution metadata to workflow data
              execution_metadata: {
                workflow_id: chunk.workflow_id,
                status: chunk.status,
                submitted_at: chunk.submitted_at,
                message: chunk.message,
                status_url: chunk.status_url,
                source: chunk.source
              }
            };
            return {
              ...baseData,
              chunk: JSON.stringify(chunk), // Store full response for display
              isWorkflow: true,
              workflowData: workflowData // Store workflow_json with metadata
            };
          }
          // Old format: direct workflow object
          if (chunk.workflow_id || chunk.steps) {
            console.log('[CopilotToolHandler] ✓ Path A2: Chunk is old format (direct workflow data)');
            return {
              ...baseData,
              chunk: JSON.stringify(chunk), // Store stringified version for display
              isWorkflow: true,
              workflowData: chunk // Use directly
            };
          }
        }

        if (typeof chunk === 'object' && chunk.content) {
          console.log('[CopilotToolHandler] ✓ Path B: Chunk is object with .content property');
          // Handle case where chunk is already an object with content property
          let rawContent = chunk.content;
          // Trim whitespace before parsing if it's a string
          let contentToParse = typeof rawContent === 'string' ? rawContent.trim() : rawContent;
          parsedChunk = typeof contentToParse === 'string' ? JSON.parse(contentToParse) : contentToParse;
          // Ensure content is always a string for return value
          content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        } else if (typeof chunk === 'string') {
          console.log('[CopilotToolHandler] ✓ Path C: Chunk is a string, will parse as JSON');
          // Handle case where chunk is a JSON string
          content = chunk.trim(); // Trim whitespace
          parsedChunk = JSON.parse(content);
        } else if (typeof chunk === 'object') {
          console.log('[CopilotToolHandler] ✓ Path D: Chunk is generic object, will stringify');
          // Chunk is already a parsed object but without .content property
          content = JSON.stringify(chunk);
          parsedChunk = chunk;
        } else {
          console.warn('[CopilotToolHandler] ✗ Unexpected chunk format:', chunk);
          return null;
        }

        console.log('[CopilotToolHandler] parsedChunk type:', typeof parsedChunk);
        console.log('[CopilotToolHandler] parsedChunk keys:', parsedChunk ? Object.keys(parsedChunk) : 'null');

        // Handle case where parsedChunk has nested structure: {source_tool: ..., content: {workflow data...}}
        // This happens when the SSE sends the full structure as a JSON string
        if (parsedChunk && parsedChunk.source_tool && parsedChunk.content) {
          console.log('[CopilotToolHandler] ✓ Detected nested structure with source_tool and content');
          parsedChunk = parsedChunk.content; // Use the content object
          console.log('[CopilotToolHandler] ✓ Extracted content, keys:', Object.keys(parsedChunk));
        }

        // Handle new format: check if parsedChunk has workflow_json
        if (parsedChunk && parsedChunk.workflow_json) {
          console.log('[CopilotToolHandler] ✓ Detected new format with workflow_json');
          // Extract workflow_json and merge with top-level metadata
          let workflowData = {
            ...parsedChunk.workflow_json,
            // Add execution metadata to workflow data
            execution_metadata: {
              workflow_id: parsedChunk.workflow_id,
              status: parsedChunk.status,
              submitted_at: parsedChunk.submitted_at,
              message: parsedChunk.message,
              status_url: parsedChunk.status_url,
              source: parsedChunk.source
            }
          };
          return {
            ...baseData,
            chunk: content,
            isWorkflow: true,
            workflowData: workflowData // Store workflow_json with metadata
          };
        }

        return {
          ...baseData,
          chunk: content,
          isWorkflow: true,
          workflowData: parsedChunk // Store parsed data for easy access
        };
      } catch (e) {
        console.error('[CopilotToolHandler] ✗ Failed to parse workflow chunk:', e.message);
        console.error('[CopilotToolHandler] Error stack:', e.stack);
        return null;
      }
    },

    /**
     * Helper function to process workspace listing tool data
     * @param {string|Object} chunk - The JSON string to parse or an object with content
     * @param {Object} baseData - Base data object to extend
     * @returns {Object|null} Processed data or null if parsing fails
     */
    _processWorkspaceListing: function(chunk, baseData) {
      if (!chunk) {
        return null;
      }

      // Diagnostic logging
      console.log('[CopilotToolHandler] _processWorkspaceListing called');
      console.log('[CopilotToolHandler] chunk type:', typeof chunk);
      if (typeof chunk === 'object') {
        console.log('[CopilotToolHandler] chunk keys:', Object.keys(chunk));
        console.log('[CopilotToolHandler] has .content?', 'content' in chunk);
        console.log('[CopilotToolHandler] has .items?', 'items' in chunk);
        if (chunk.content) {
          console.log('[CopilotToolHandler] .content type:', typeof chunk.content);
          console.log('[CopilotToolHandler] .content value (first 100 chars):',
            typeof chunk.content === 'string' ? chunk.content.substring(0, 100) : chunk.content);
        }
      } else if (typeof chunk === 'string') {
        console.log('[CopilotToolHandler] chunk string (first 100 chars):', chunk.substring(0, 100));
      }

      try {
        let content, parsedChunk;

        // If chunk is already a fully parsed object with items array, use it directly
        if (typeof chunk === 'object' && !chunk.content && chunk.items) {
          console.log('[CopilotToolHandler] ✓ Path A: Chunk is already parsed workspace data with .items');
          // Preserve path if available
          return {
            ...baseData,
            chunk: JSON.stringify(chunk), // Store stringified version for display
            isWorkspaceListing: true,
            workspaceData: {
              path: chunk.path || null,
              items: chunk.items || []
            }
          };
        }

        if (typeof chunk === 'object' && chunk.content) {
          console.log('[CopilotToolHandler] ✓ Path B: Chunk is object with .content property');
          // Handle case where chunk is already an object with content property
          let rawContent = chunk.content;
          // Trim whitespace before parsing if it's a string
          let contentToParse = typeof rawContent === 'string' ? rawContent.trim() : rawContent;
          parsedChunk = typeof contentToParse === 'string' ? JSON.parse(contentToParse) : contentToParse;
          // Ensure content is always a string for return value
          content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        } else if (typeof chunk === 'string') {
          console.log('[CopilotToolHandler] ✓ Path C: Chunk is a string, will parse as JSON');
          // Handle case where chunk is a JSON string
          content = chunk.trim(); // Trim whitespace
          parsedChunk = JSON.parse(content);
        } else if (typeof chunk === 'object') {
          console.log('[CopilotToolHandler] ✓ Path D: Chunk is generic object, will stringify');
          // Chunk is already a parsed object but without .content property
          content = JSON.stringify(chunk);
          parsedChunk = chunk;
        } else {
          console.warn('[CopilotToolHandler] ✗ Unexpected chunk format:', chunk);
          return null;
        }

        console.log('[CopilotToolHandler] parsedChunk type:', typeof parsedChunk);
        console.log('[CopilotToolHandler] parsedChunk keys:', parsedChunk ? Object.keys(parsedChunk) : 'null');

        // Handle case where parsedChunk has nested structure: {source_tool: ..., content: {items: [...]}}
        // This happens when the SSE sends the full structure as a JSON string
        if (parsedChunk && parsedChunk.source_tool && parsedChunk.content) {
          console.log('[CopilotToolHandler] ✓ Detected nested structure with source_tool and content');
          parsedChunk = parsedChunk.content; // Use the content object
          console.log('[CopilotToolHandler] ✓ Extracted content, keys:', Object.keys(parsedChunk));
        }

        // Extract items array and path from the parsed data
        // The parsedChunk has structure: { count: N, path: "...", source: "...", items: [...] }
        // WorkspaceExplorerAdapter needs both path and items
        let workspaceData = parsedChunk;
        let workspacePath = null;

        if (parsedChunk && parsedChunk.items) {
          console.log('[CopilotToolHandler] ✓ Extracting .items array (length:', parsedChunk.items.length, ')');
          workspacePath = parsedChunk.path || null;
          workspaceData = {
            path: workspacePath,
            items: parsedChunk.items
          };
        } else if (parsedChunk && parsedChunk.path) {
          // If we have a path but no items array, preserve the structure
          workspacePath = parsedChunk.path;
          workspaceData = {
            path: workspacePath,
            items: Array.isArray(parsedChunk) ? parsedChunk : []
          };
        } else {
          console.log('[CopilotToolHandler] ⚠ No .items found, using full parsedChunk');
          // If it's an array, treat as items with no path
          if (Array.isArray(parsedChunk)) {
            workspaceData = {
              path: null,
              items: parsedChunk
            };
          }
        }

        return {
          ...baseData,
          chunk: content,
          isWorkspaceListing: true,
          workspaceData: workspaceData // Store object with path and items
        };
      } catch (e) {
        console.error('[CopilotToolHandler] ✗ Failed to parse workspace listing chunk:', e.message);
        console.error('[CopilotToolHandler] Error stack:', e.stack);
        return null;
      }
    },

    /**
     * Processes a tool-specific event
     * @param {string} currentEvent - The current SSE event type
     * @param {string} tool - The tool name
     * @param {Object} parsed - The parsed event data
     * @returns {Object|null} Processed data or null if no special handling
     */
    processToolEvent: function(currentEvent, tool, parsed) {
      // Handle final_response event for workflow tool
      if (currentEvent === 'final_response' &&
          tool === 'bvbrc_server.create_and_execute_workflow' &&
          parsed.chunk) {
        const processed = this._processWorkflowManifest(parsed.chunk, parsed);
        if (processed) {
          return processed;
        }
        // Return original if parsing fails
        return parsed;
      }
      // Handle final_response event for workspace listing tool
      if (currentEvent === 'final_response' &&
          tool === 'bvbrc_server.workspace_ls_tool' &&
          parsed.chunk) {
        const processed = this._processWorkspaceListing(parsed.chunk, parsed);
        if (processed) {
          return processed;
        }
        // Return original if parsing fails
        return parsed;
      }
      // Handle final_response event for query collection tool
      if (currentEvent === 'final_response' &&
          tool === 'bvbrc_server.bvbrc_query_collection' &&
          parsed.chunk) {
        const processed = this._processQueryCollection(parsed.chunk, parsed);
        if (processed) {
          return processed;
        }
        // Return original if parsing fails
        return parsed;
      }

      // No special handling needed
      return null;
    },

    /**
     * Helper function to process query collection tool data
     * @param {string|Object} chunk - The JSON string to parse or an object with content
     * @param {Object} baseData - Base data object to extend
     * @returns {Object|null} Processed data or null if parsing fails
     */
    _processQueryCollection: function(chunk, baseData) {
      if (!chunk) {
        return null;
      }

      // Diagnostic logging
      console.log('[CopilotToolHandler] _processQueryCollection called');
      console.log('[CopilotToolHandler] chunk type:', typeof chunk);
      if (typeof chunk === 'object') {
        console.log('[CopilotToolHandler] chunk keys:', Object.keys(chunk));
        console.log('[CopilotToolHandler] has .content?', 'content' in chunk);
        console.log('[CopilotToolHandler] has .workspace?', 'workspace' in chunk);
        console.log('[CopilotToolHandler] has .summary?', 'summary' in chunk);
      } else if (typeof chunk === 'string') {
        console.log('[CopilotToolHandler] chunk string (first 100 chars):', chunk.substring(0, 100));
      }

      try {
        let content, parsedChunk;

        // If chunk is already a fully parsed object with workspace and summary, use it directly
        if (typeof chunk === 'object' && !chunk.content && (chunk.workspace || chunk.summary)) {
          console.log('[CopilotToolHandler] ✓ Path A: Chunk is already parsed query collection data');
          return {
            ...baseData,
            chunk: JSON.stringify(chunk), // Store stringified version for display
            isQueryCollection: true,
            queryCollectionData: {
              workspace: chunk.workspace || null,
              summary: chunk.summary || null,
              fileName: chunk.fileName || null,
              fileId: chunk.fileId || null,
              message: chunk.message || null,
              queryParameters: chunk.queryParameters || null
            }
          };
        }

        if (typeof chunk === 'object' && chunk.content) {
          console.log('[CopilotToolHandler] ✓ Path B: Chunk is object with .content property');
          // Handle case where chunk is already an object with content property
          let rawContent = chunk.content;
          // Trim whitespace before parsing if it's a string
          let contentToParse = typeof rawContent === 'string' ? rawContent.trim() : rawContent;
          parsedChunk = typeof contentToParse === 'string' ? JSON.parse(contentToParse) : contentToParse;
          // Ensure content is always a string for return value
          content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        } else if (typeof chunk === 'string') {
          console.log('[CopilotToolHandler] ✓ Path C: Chunk is a string, will parse as JSON');
          // Handle case where chunk is a JSON string
          content = chunk.trim(); // Trim whitespace
          parsedChunk = JSON.parse(content);
        } else if (typeof chunk === 'object') {
          console.log('[CopilotToolHandler] ✓ Path D: Chunk is generic object, will stringify');
          // Chunk is already a parsed object but without .content property
          content = JSON.stringify(chunk);
          parsedChunk = chunk;
        } else {
          console.warn('[CopilotToolHandler] ✗ Unexpected chunk format:', chunk);
          return null;
        }

        console.log('[CopilotToolHandler] parsedChunk type:', typeof parsedChunk);
        console.log('[CopilotToolHandler] parsedChunk keys:', parsedChunk ? Object.keys(parsedChunk) : 'null');

        // Handle case where parsedChunk has nested structure: {source_tool: ..., content: {workspace, summary...}}
        // This happens when the SSE sends the full structure as a JSON string
        if (parsedChunk && parsedChunk.source_tool && parsedChunk.content) {
          console.log('[CopilotToolHandler] ✓ Detected nested structure with source_tool and content');
          parsedChunk = parsedChunk.content; // Use the content object
          console.log('[CopilotToolHandler] ✓ Extracted content, keys:', Object.keys(parsedChunk));
        }

        // Extract workspace and summary data
        // The parsedChunk has structure: { type: "file_reference", workspace: {...}, summary: {...}, ... }
        let queryCollectionData = {
          workspace: parsedChunk.workspace || null,
          summary: parsedChunk.summary || null,
          fileName: parsedChunk.fileName || null,
          fileId: parsedChunk.fileId || null,
          message: parsedChunk.message || null,
          queryParameters: parsedChunk.queryParameters || null
        };

        console.log('[CopilotToolHandler] ✓ Extracted query collection data');
        console.log('[CopilotToolHandler] workspace:', queryCollectionData.workspace);
        console.log('[CopilotToolHandler] summary:', queryCollectionData.summary);

        return {
          ...baseData,
          chunk: content,
          isQueryCollection: true,
          queryCollectionData: queryCollectionData
        };
      } catch (e) {
        console.error('[CopilotToolHandler] ✗ Failed to parse query collection chunk:', e.message);
        console.error('[CopilotToolHandler] Error stack:', e.stack);
        return null;
      }
    },

    /**
     * Processes message content based on source_tool
     * Applies tool-specific transformations to the content for display in chat messages
     * @param {string} content - The message content
     * @param {string} sourceTool - The source_tool field from the message
     * @returns {Object} Object with processed content and metadata
     */
    processMessageContent: function(content, sourceTool) {
      if (!sourceTool || !content) {
        return { content: content };
      }

      // Handle workflow tool
      if (sourceTool === 'bvbrc_server.create_and_execute_workflow') {
        const baseData = { chunk: content };
        const processed = this._processWorkflowManifest(content, baseData);
        if (processed) {
          return {
            content: processed.chunk,
            isWorkflow: processed.isWorkflow,
            workflowData: processed.workflowData
          };
        }
      }

      // Handle workspace listing tool
      if (sourceTool === 'bvbrc_server.workspace_ls_tool') {
        const baseData = { chunk: content };
        const processed = this._processWorkspaceListing(content, baseData);
        if (processed) {
          return {
            content: processed.chunk,
            isWorkspaceListing: processed.isWorkspaceListing,
            workspaceData: processed.workspaceData
          };
        }
      }

      // Handle query collection tool
      if (sourceTool === 'bvbrc_server.bvbrc_query_collection') {
        console.log('[CopilotToolHandler] Processing query_collection tool');
        console.log('[CopilotToolHandler] sourceTool:', sourceTool);
        console.log('[CopilotToolHandler] content type:', typeof content);
        console.log('[CopilotToolHandler] content value:', content);

        // If content is already an object with nested structure, extract it
        let contentToProcess = content;
        if (typeof content === 'object' && content.content) {
          console.log('[CopilotToolHandler] Content is object with nested .content, extracting');
          contentToProcess = content.content;
        }

        const baseData = { chunk: contentToProcess };
        const processed = this._processQueryCollection(contentToProcess, baseData);
        console.log('[CopilotToolHandler] processed result:', processed);
        console.log('[CopilotToolHandler] processed.chunk type:', processed ? typeof processed.chunk : 'null');
        console.log('[CopilotToolHandler] processed.chunk value:', processed ? processed.chunk : 'null');
        if (processed) {
          var result = {
            content: processed.chunk,
            isQueryCollection: processed.isQueryCollection,
            queryCollectionData: processed.queryCollectionData
          };
          console.log('[CopilotToolHandler] Returning result:', result);
          console.log('[CopilotToolHandler] result.content type:', typeof result.content);
          return result;
        }
      }

      // No special handling for this tool, return original content
      return { content: content };
    }
  });
});

