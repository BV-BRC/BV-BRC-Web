/**
 * @module p3/widget/CopilotApi
 * @description A widget that handles API communication between the frontend and the PATRIC Copilot backend service.
 * Provides methods for managing chat sessions, submitting queries, and retrieving messages.
 *
 * Implementation:
 * - Extends _WidgetBase to provide widget functionality
 * - Uses dojo/request for making HTTP requests to backend API
 * - Handles authentication via App.authorizationToken
 * - Provides comprehensive error handling and logging
 * - Maintains session state and caches responses
 */
define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dojo/request',
    'dojo/_base/lang',
    'dojo/topic',
    'dijit/Dialog',
    './CopilotSSEEventHandler',
    './CopilotToolHandler'
], function(
    declare, _WidgetBase, request, lang, topic, Dialog, CopilotSSEEventHandler, CopilotToolHandler
) {
    /**
     * @class CopilotAPI
     * @extends {dijit/_WidgetBase}
     *
     * Main API client class that handles all communication with the Copilot backend.
     * Provides methods for chat sessions, queries, and message management.
     */
    return declare([_WidgetBase], {

        /** Base URL for main Copilot API endpoints */
        apiUrlBase: null,

        /** Base URL for database-related endpoints */
        dbUrlBase: null,

        /** Caches the most recent API response */
        storedResult: null,

        /** Indicates whether the Copilot service URLs are available */
        copilotAvailable: true,

        /** Active queued/streaming job ID (for abort requests) */
        currentJobId: null,

        /** Most recent tool reported by SSE for the active stream */
        currentActiveToolId: null,

        /**
         * Constructor initializes the widget with provided options
         * Mixes in any config options passed to override defaults
         */
        constructor: function(opts) {
            this.inherited(arguments);
            lang.mixin(this, opts);
        },

        /**
         * Called after widget creation
         * Initializes API URLs from window.App configuration
         */
        postCreate: function() {
            this.inherited(arguments);
            // Initialize API URLs from configuration (if not already set)
            this.apiUrlBase = window.App.copilotApiURL;
            this.dbUrlBase = window.App.copilotDbURL;

            // If either URL is missing, mark service as unavailable and notify listeners
            if (!this.apiUrlBase || !this.dbUrlBase) {
                this.copilotAvailable = false;
                var error = new Error('The BV-BRC Copilot service is currently unavailable. Please try again later.');
                // Publish a global error so UI components can respond accordingly
                topic.publish('CopilotApiError', { error: error });
                // Publish service unavailable event for tooltip display
                topic.publish('CopilotServiceUnavailable', 'The BV-BRC Copilot service is currently unavailable. Please try again later.');
            }

            console.log('CopilotAPI postCreate - API URLs initialized');
        },

        /**
         * Fetches all chat sessions for current user
         * Implementation:
         * - Makes GET request to sessions endpoint
         * - Handles auth via headers
         * - Parses JSON response
         * - Returns empty array if no sessions found
         */
        // Updated to support server-side pagination. Returns the full response
        // ( { sessions, total, has_more } ) so callers can decide what to do.
        // Default page size is 20 and offset 0.
        getUserSessions: function(limit = 20, offset = 0) {
            if (!this._loggedIn) return Promise.reject('Not logged in');
            var _self = this;

            // Build query string with pagination params
            var qs = [`user_id=${encodeURIComponent(_self.user_id)}`,
                      `limit=${limit}`,
                      `offset=${offset}`].join('&');

            return request.get(this.apiUrlBase + `/get-all-sessions?${qs}`, {
                headers: {
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                // The server already returns JSON with { sessions, total, has_more }
                return response;
            }).catch(function(error) {
                console.error('Error getting user sessions:', error);
                throw error;
            });
        },

        /**
         * Starts a new chat session
         * Implementation:
         * - Makes GET request to start-chat endpoint
         * - Returns new session ID on success
         * - Publishes error events on failure
         */
        getNewSessionId: function() {
            if (!this._loggedIn) return Promise.reject('Not logged in');
            return request.get(this.apiUrlBase + '/start-chat', {
                headers: {
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(lang.hitch(this, function(response) {
                console.log('CopilotAPI status:', response);
                return response.session_id;
            })).catch(function(error) {
                console.error('Error starting chat:', error);
                topic.publish('CopilotApiError', {
                    error: error
                });
            });
        },

        /**
         * Registers a chat session in the backend idempotently.
         * Safe to call multiple times for the same session.
         */
        registerSession: function(sessionId, title) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            if (!sessionId) return Promise.reject(new Error('sessionId is required'));

            var data = {
                session_id: sessionId,
                user_id: this.user_id,
                title: title || 'New Chat'
            };

            return request.post(this.apiUrlBase + '/register-session', {
                data: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                return response;
            }).catch(function(error) {
                console.error('Error registering session:', error);
                throw error;
            });
        },

        /**
         * Creates a new session id and immediately registers it.
         */
        createAndRegisterSession: function(title) {
            return this.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                return this.registerSession(sessionId, title).then(function(registration) {
                    return {
                        session_id: sessionId,
                        registration: registration
                    };
                });
            }));
        },

        /**
         * Checks if the user is logged in
         * Returns false if not logged in and shows dialog
         * Returns true if logged in
         */
        _checkLoggedIn: function() {
            if (!window.App || !window.App.authorizationToken) {
                new Dialog({
                    title: "Not Logged In",
                    content: "You must be logged in to use the Copilot chat.",
                    style: "width: 300px"
                }).show();
                this._loggedIn = false;
                return false;
            }
            this._loggedIn = true;
            return true;
        },

        /**
         * Submits a copilot query with combined functionality
         * Implementation:
         * - Builds query data object with text, model, session
         * - Optionally includes system prompt if provided
         * - Optionally includes RAG functionality (rag_db, num_docs)
         * - Optionally includes image if provided
         * - Makes POST request to copilot endpoint
         * - Handles errors with detailed logging
         */
        submitCopilotQuery: function(inputText, sessionId, systemPrompt, model, save_chat = true, ragDb, numDocs, image, enhancedPrompt = null, extraPayload) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            console.log('query');
            console.log('Session ID:', sessionId);
            var data = {
                query: inputText,
                model: model,
                session_id: sessionId,
                user_id: _self.user_id,
                system_prompt: systemPrompt || '',
                save_chat: save_chat,
                include_history: true,
                auth_token: window.App.authorizationToken || null
            };

            if (extraPayload && Array.isArray(extraPayload.selected_workspace_items) && extraPayload.selected_workspace_items.length > 0) {
                data.selected_workspace_items = extraPayload.selected_workspace_items;
            }

            return request.post(this.apiUrlBase + '/copilot-agent', {
                data: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                _self.storedResult = response.response || response;
                return response;
            }).catch(function(error) {
                console.error('Error submitting copilot query:', error);
                throw error;
            });
        },

        /**
         * Submits a copilot query with streaming
         * @param {object} params - The parameters for the query
         * @param {string} params.inputText - The user's input text
         * @param {string} params.sessionId - The current session ID
         * @param {string} params.systemPrompt - The system prompt
         * @param {string} params.model - The model to use
         * @param {boolean} params.save_chat - Whether to save the chat
         * @param {string} params.ragDb - The RAG database to use
         * @param {number} params.numDocs - The number of documents for RAG
         * @param {string} params.image - A base64 encoded image
         * @param {string} params.enhancedPrompt - An enhanced prompt
         * @param {function} onData - Callback for each content chunk (LLM response text)
         * @param {function} onEnd - Callback for when the stream ends
         * @param {function} onError - Callback for any errors
         * @param {function} onProgress - Callback for progress updates (queued, started, progress events)
         *   - Called with object: {type: 'queued'|'started'|'progress', ...eventData}
         * @param {function} onStatusMessage - Callback for status message updates
         *   - Called with message object when status should be displayed/updated
         */
        submitCopilotQueryStream: function(params, onData, onEnd, onError, onProgress, onStatusMessage) {

            if (!this._checkLoggedIn()) {
                if (onError) onError(new Error('Not logged in'));
                return;
            }

            console.log('Session ID:', params.sessionId);
            var _self = this;
            this.currentJobId = null;
            this.currentActiveToolId = null;
            var data = {
                query: params.inputText,
                model: params.model,
                session_id: params.sessionId,
                user_id: this.user_id,
                system_prompt: params.systemPrompt || '',
                save_chat: params.save_chat !== undefined ? params.save_chat : true,
                include_history: true,
                auth_token: window.App.authorizationToken || null,
                stream: true  // Enable SSE streaming mode
            };

            if (Array.isArray(params.selected_workspace_items) && params.selected_workspace_items.length > 0) {
                data.workspace_items = params.selected_workspace_items;
            }

            // Create abort controller for this request
            this.currentAbortController = new AbortController();

            // Create SSE event handler for this request
            var eventHandler = new CopilotSSEEventHandler();
            eventHandler.resetState();

            // Create tool handler for special tool processing
            var toolHandler = new CopilotToolHandler();

            fetch(this.apiUrlBase + '/copilot-agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': (window.App.authorizationToken || ''),
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify(data),
                signal: this.currentAbortController.signal
            }).then(response => {
                if (!response.ok) {
                    response.text().then(text => {
                        const err = new Error(`HTTP error! status: ${response.status}, message: ${text}`);
                        if (onError) onError(err);
                    });
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';
                let currentEvent = null;

                const processLine = (line) => {
                    // Handle SSE comment lines (heartbeat)
                    if (line.startsWith(':')) {
                        return;
                    }

                    // Handle event lines
                    if (line.startsWith('event:')) {
                        currentEvent = line.substring(6).trim();
                        return;
                    }

                    // Handle data lines
                    if (line.startsWith('data:')) {
                        const content = line.substring(5).trim();

                        if (!content) return;

                        try {
                            const parsed = JSON.parse(content);

                            // Let event handler process the event and create/update status message
                            var statusMessage = eventHandler.handleEvent(currentEvent, parsed);

                            // If a status message was created/updated, send it via callback
                            if (statusMessage && onStatusMessage) {
                                onStatusMessage(statusMessage);
                            }

                            // Handle different event types
                            switch (currentEvent) {
                                case 'queued':
                                    if (parsed && parsed.job_id) {
                                        _self.currentJobId = parsed.job_id;
                                    }
                                    if (onProgress) {
                                        onProgress({ type: 'queued', data: parsed });
                                    }
                                    break;

                                case 'started':
                                    if (parsed && parsed.job_id) {
                                        _self.currentJobId = parsed.job_id;
                                    }
                                    if (onProgress) {
                                        onProgress({ type: 'started', data: parsed });
                                    }
                                    break;

                                case 'progress':
                                    if (parsed && parsed.job_id) {
                                        _self.currentJobId = parsed.job_id;
                                    }
                                    if (onProgress) {
                                        onProgress({
                                            type: 'progress',
                                            iteration: parsed.iteration,
                                            max_iterations: parsed.max_iterations,
                                            tool: parsed.tool,
                                            percentage: parsed.percentage
                                        });
                                    }
                                    break;

                                case 'content':
                                case 'final_response':
                                    // This is the actual LLM response text
                                    // Check for special tool handling
                                    let dataToUse = parsed;
                                    let toolMetadata = null;
                                    if (currentEvent === 'final_response' && parsed.tool) {
                                        const processed = toolHandler.processToolEvent(currentEvent, parsed.tool, parsed);

                                        if (processed) {
                                            dataToUse = processed;
                                            toolMetadata = {
                                                source_tool: parsed.tool
                                            };

                                            if (processed.isWorkflow) {
                                                toolMetadata.isWorkflow = processed.isWorkflow;
                                                toolMetadata.workflowData = processed.workflowData;
                                            }

                                            if (processed.isWorkspaceListing) {
                                                toolMetadata.isWorkspaceListing = processed.isWorkspaceListing;
                                                toolMetadata.workspaceData = processed.workspaceData;
                                            }

                                            if (processed.isWorkspaceBrowse) {
                                                toolMetadata.isWorkspaceBrowse = processed.isWorkspaceBrowse;
                                                toolMetadata.workspaceBrowseResult = processed.workspaceBrowseResult;
                                                toolMetadata.chatSummary = processed.chatSummary;
                                                toolMetadata.uiPayload = processed.uiPayload;
                                                toolMetadata.uiAction = processed.uiAction;
                                            }
                                        }
                                    }

                                    let textChunk = dataToUse.chunk || dataToUse.delta || dataToUse.content || '';
                                    // If chunk is still an object (not handled by tool handler), stringify it
                                    if (typeof textChunk === 'object' && textChunk !== null) {
                                        textChunk = JSON.stringify(textChunk, null, 2);
                                    }
                                    if (textChunk && onData) {
                                        onData(textChunk, toolMetadata);
                                    }
                                    break;

                                case 'done':
                                    _self.currentAbortController = null;
                                    _self.currentActiveToolId = null;
                                    _self.currentJobId = null;

                                    // Remove status message when done
                                    if (statusMessage && statusMessage.should_remove && onStatusMessage) {
                                        // Send removal signal by passing message with remove flag
                                        onStatusMessage({ ...statusMessage, should_remove: true });
                                    }

                                    if (onEnd) onEnd(parsed);
                                    break;

                                case 'error':
                                    console.error('Stream error:', parsed);
                                    _self.currentAbortController = null;
                                    _self.currentActiveToolId = null;
                                    _self.currentJobId = null;

                                    // Extract error message properly
                                    var errorMessage = 'An error occurred';
                                    if (parsed) {
                                        if (parsed.error) {
                                            errorMessage = parsed.error;
                                        } else if (parsed.message) {
                                            errorMessage = parsed.message;
                                        } else if (typeof parsed === 'string') {
                                            errorMessage = parsed;
                                        }
                                    }

                                    if (onError) onError(new Error(errorMessage));
                                    break;

                                case 'tool_selected':
                                    if (parsed && parsed.tool) {
                                        _self.currentActiveToolId = parsed.tool;
                                    }
                                    break;

                                case 'tool_executed':
                                case 'duplicate_detected':
                                case 'forced_finalize':
                                case 'query_progress':
                                case 'abort_requested':
                                case 'query_aborted':
                                case 'cancelled':
                                case 'cancel_requested':
                                    if (parsed && parsed.job_id) {
                                        _self.currentJobId = parsed.job_id;
                                    }
                                    if (parsed && parsed.tool) {
                                        _self.currentActiveToolId = parsed.tool;
                                    }
                                    // These are handled by the event handler above
                                    break;

                                case 'session_file_created':
                                    // File creation metadata is handled as a dedicated SSE event.
                                    // Consumers can update the session Files panel immediately.
                                    topic.publish('CopilotSessionFileCreated', parsed);
                                    break;

                                default:
                                    console.warn('Unknown event type:', currentEvent, parsed);
                            }
                        } catch (e) {
                            console.error('Failed to parse SSE data:', e, content);
                        }

                        // Reset event after processing data
                        currentEvent = null;
                    }
                };

                function pump() {
                    return reader.read().then(({ done, value }) => {
                        if (done) {
                            if (buffer.length > 0) {
                                const lines = buffer.split('\n');
                                lines.forEach(line => {
                                    if (line.trim()) processLine(line.trim());
                                });
                            }
                            _self.currentAbortController = null;
                            _self.currentActiveToolId = null;
                            _self.currentJobId = null;
                            if (onEnd) onEnd();
                            return;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;
                        let eol;
                        while ((eol = buffer.indexOf('\n')) >= 0) {
                            const line = buffer.slice(0, eol).trim();
                            buffer = buffer.slice(eol + 1);
                            if (line) processLine(line);
                        }

                        return pump();
                    });
                }

                return pump();

            }).catch(err => {
                console.error('Error submitting copilot query stream:', err);
                _self.currentAbortController = null;
                _self.currentActiveToolId = null;
                _self.currentJobId = null;
                if (onError) onError(err);
            });
        },

        isQueryAbortableTool: function(toolId) {
            if (!toolId || typeof toolId !== 'string') return false;
            var normalized = toolId.split('.').pop();
            return normalized === 'bvbrc_query_collection' || normalized === 'bvbrc_global_data_search';
        },

        getCurrentStreamState: function() {
            return {
                job_id: this.currentJobId || null,
                tool_id: this.currentActiveToolId || null,
                has_active_stream: !!this.currentAbortController
            };
        },

        abortActiveQueryJob: function(opts) {
            if (!this._checkLoggedIn()) return Promise.reject(new Error('Not logged in'));
            opts = opts || {};

            var jobId = opts.job_id || this.currentJobId;
            if (!jobId) {
                return Promise.reject(new Error('No active job to abort'));
            }

            var payload = {
                user_id: opts.user_id || this.user_id,
                scopes: Array.isArray(opts.scopes) && opts.scopes.length > 0 ? opts.scopes : ['query_tools'],
                reason: opts.reason || 'Aborted from chat UI'
            };

            return request.post(this.apiUrlBase + '/job/' + encodeURIComponent(jobId) + '/abort', {
                data: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            });
        },


        /**
         * Submits a regular chat query
         * Implementation:
         * - Builds query data object with text, model, session
         * - Optionally includes system prompt if provided
         * - Makes POST request to chat endpoint
         * - Caches response in storedResult
         * - Handles errors with detailed logging
         */
        submitQuery: function(inputText, sessionId, systemPrompt, model, save_chat = true) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            console.log('query');
            console.log('Session ID:', sessionId);
            var data = {
                query: inputText,
                model: model,
                session_id: sessionId,
                user_id: _self.user_id,
                save_chat: save_chat
            };

            if (systemPrompt) {
                data.system_prompt = systemPrompt;
            } else {
                data.system_prompt = '';
            }
            console.log('submitting query to', this.apiUrlBase + '/chat');
            return request.post(this.apiUrlBase + '/chat', {
                data: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                _self.storedResult = response.response;
                return response;
            }).catch(function(error) {
                console.error('Error submitting query:', error);
                throw error;
            });
        },

        /**
         * Submits a RAG-enhanced query
         * Implementation:
         * - Similar to submitQuery but uses RAG endpoint
         * - Includes RAG database selection in query
         * - Validates success message in response
         * - Throws error if response indicates failure
         */
        submitRagQuery: function(inputQuery, ragDb, numDocs, sessionId, model) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            console.log('Session ID:', sessionId);

            var data = {
                query: inputQuery,
                rag_db: ragDb,
                user_id: _self.user_id,
                model: model,
                num_docs: numDocs,
                session_id: sessionId
            };
            var rag_endpoint = this.apiUrlBase + '/rag';
            console.log('submitting rag query to', rag_endpoint);
            return request.post(rag_endpoint, {
                data: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(lang.hitch(this, function(response) {
                if (response['message'] == 'success') {
                    _self.storedResult = response;
                    return response;
                } else {
                    throw new Error(response['message']);
                }
            })).catch(function(error) {
                console.error('Error submitting query:', error);
                throw error;
            });
        },

        /**
         * Submits a regular chat query
         * Implementation:
         * - Builds query data object with text, model, session
         * - Optionally includes system prompt if provided
         * - Makes POST request to chat endpoint
         * - Caches response in storedResult
         * - Handles errors with detailed logging
         */
        submitQueryChatOnly: function(inputText, systemPrompt, model) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            console.log('query');
            console.log('Session ID: N/A (chat-only query)');
            var data = {
                query: inputText,
                model: model,
                user_id: _self.user_id,
            };

            if (systemPrompt) {
                data.system_prompt = systemPrompt;
            }
            console.log('submitting query to', this.apiUrlBase + '/chat-only');
            return request.post(this.apiUrlBase + '/chat-only', {
                data: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                return response;
            }).catch(function(error) {
                console.error('Error submitting query:', error);
                throw error;
            });
        },

        submitQueryWithImage: function(inputText, sessionId, systemPrompt, model, image) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            console.log('query');
            console.log('Session ID:', sessionId);
            var data = {
                query: inputText,
                model: model,
                session_id: sessionId,
                user_id: _self.user_id,
                image: image
            };
            console.log('submitting query to', this.apiUrlBase + '/chat-image');
            return request.post(this.apiUrlBase + '/chat-image', {
                data: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                return response;
            }).catch(function(error) {
                console.error('Error submitting query:', error);
                throw error;
            });
        },

        /**
         * Retrieves all messages for a session
         * Implementation:
         * - Makes GET request with session ID
         * - Returns full message history
         * - Includes detailed error logging
         */
        getSessionMessages: function(sessionId, options) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var opts = options || {};
            var queryParams = [
                `session_id=${encodeURIComponent(sessionId)}`
            ];

            if (opts.includeFiles) {
                queryParams.push('include_files=true');
                queryParams.push(`user_id=${encodeURIComponent(this.user_id)}`);
                if (typeof opts.limit === 'number') {
                    queryParams.push(`limit=${opts.limit}`);
                }
                if (typeof opts.offset === 'number') {
                    queryParams.push(`offset=${opts.offset}`);
                }
            }

            return request.get(this.apiUrlBase + `/get-session-messages?${queryParams.join('&')}`, {
                headers: {
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                console.log('Session messages retrieved:', response);
                console.log('[DEBUG] getSessionMessages - Full response structure:', JSON.stringify(response, null, 2));
                console.log('[DEBUG] getSessionMessages - response.workflow_ids:', response.workflow_ids);
                return response;
            }).catch(function(error) {
                console.error('Error getting session messages:', error);
                throw error;
            });
        },

        /**
         * Retrieves session file metadata for a session.
         * Supports pagination and always includes user_id for authorization.
         */
        getSessionFiles: function(sessionId, limit = 20, offset = 0) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var queryParams = [
                `session_id=${encodeURIComponent(sessionId)}`,
                `user_id=${encodeURIComponent(this.user_id)}`,
                `limit=${limit}`,
                `offset=${offset}`
            ];
            return request.get(this.apiUrlBase + `/get-session-files?${queryParams.join('&')}`, {
                headers: {
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                return response;
            }).catch(function(error) {
                console.error('Error getting session files:', error);
                throw error;
            });
        },

        /**
         * Retrieves the title for a session
         * Implementation:
         * - Makes GET request with session ID
         * - Returns session title
         * - Includes detailed error logging
         */
        getSessionTitle: function(sessionId) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            return request.get(this.apiUrlBase + `/get-session-title?session_id=${encodeURIComponent(sessionId)}`, {
                headers: {
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                return response;
            }).catch(function(error) {
                console.error('Error getting session title:', error);
                throw error;
            });
        },

        /**
         * Generates a title from chat messages
         * Implementation:
         * - Posts messages to title generation endpoint
         * - Uses specified model for generation
         * - Returns generated title string
         */
        generateTitleFromMessages: function(messages, model) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            return request.post(this.apiUrlBase + '/generate-title-from-messages', {
                data: JSON.stringify({
                    messages: messages,
                    user_id: _self.user_id,
                    model: model
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                const title = response.response;
                return title;
            }).catch(function(error) {
                console.error('Error getting session title:', error);
                throw error;
            });
        },

        /**
         * Updates a session's title
         * Implementation:
         * - Posts new title to update endpoint
         * - Includes session and user IDs
         * - Returns updated session data
         */
        updateSessionTitle: function(sessionId, newTitle) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            return request.post(this.apiUrlBase + '/update-session-title', {
                data: JSON.stringify({
                    session_id: sessionId,
                    title: newTitle,
                    user_id: _self.user_id
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                console.log('Session title updated:', response);
                return response;
            }).catch(function(error) {
                console.error('Error updating session title:', error);
                throw error;
            });
        },

        /**
         * Retrieves saved prompts for user
         * Implementation:
         * - Gets prompts from user prompts endpoint
         * - Returns first prompt in array
         */
        getUserPrompts: function() {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            return request.get(this.apiUrlBase + '/get-user-prompts?user_id=' + _self.user_id, {
                headers: {
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                return response.prompts[0];
            }).catch(function(error) {
                console.error('Error getting user prompts:', error);
                throw error;
            });
        },

        /**
         * Saves a new prompt
         * Implementation:
         * - Posts prompt name and text
         * - Shows dialog for length errors
         * - Publishes general errors to topic
         */
        savePrompt: function(promptName, promptText) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            return request.post(this.apiUrlBase + '/save-prompt', {
                data: JSON.stringify({
                    name: promptName,
                    text: promptText,
                    user_id: _self.user_id
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                console.log('Prompt saved:', response);
                return true;
            }).catch(function(error) {
                if (error.response && error.response.status === 413) {
                    new Dialog({
                        title: "Error",
                        content: "Prompt too long, please shorten it.",
                        style: "width: 300px"
                    }).show();
                } else {
                    topic.publish('CopilotApiError', {
                        error: error
                    });
                }
            });
        },

        /**
         * Deletes a chat session
         * Implementation:
         * - Posts session ID to delete endpoint
         * - Returns response on success
         * - Throws error on failure
         */
        deleteSession: function(sessionId) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            return request.post(this.apiUrlBase + '/delete-session', {
                data: JSON.stringify({
                    session_id: sessionId,
                    user_id: _self.user_id
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                console.log('Session deleted:', response);
                return response;
            }).catch(function(error) {
                console.error('Error deleting session:', error);
                throw error;
            });
        },

        /**
         * Gets list of available models
         * Implementation:
         * - Posts to model list endpoint
         * - Returns both chat models and RAG databases
         * - Uses test project ID currently
         */
        getModelList: function() {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            // If the Copilot service is unavailable, immediately reject and publish the error
            if (!this.copilotAvailable || !this.dbUrlBase) {
                var error = new Error('The BV-BRC Copilot service is currently unavailable.');
                topic.publish('CopilotApiError', { error: error });
                return Promise.reject(error);
            }
            var _self = this;
            return request.post(this.dbUrlBase + '/get-model-list', {
                data: JSON.stringify({
                    project_id: 'test'
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                // Returns both the list of chat models and rag databases
                return response;
            }).catch(function(error) {
                console.error('Error getting model list:', error);
                throw error;
            });
        },

        /**
         * Sets the rating for a conversation
         * @param {string} sessionId The ID of the session to rate
         * @param {number} rating The rating to set (1-5)
         * @returns {Promise} A promise that resolves when the rating is set
         */
        setConversationRating: function(sessionId, rating) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            return request.post(this.apiUrlBase + '/rate-conversation', {
                data: JSON.stringify({
                    session_id: sessionId,
                    rating: rating,
                    user_id: _self.user_id
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                return response;
            }).catch(function(error) {
                console.error('Error setting conversation rating:', error);
                throw error;
            });
        },

        /**
         * Submits a workflow for execution directly to the workflow engine API
         * Bypasses the MCP layer and talks directly to the workflow engine REST endpoint
         * @param {Object} workflowJson - Complete workflow manifest to submit
         * @returns {Promise} Promise that resolves with submission response
         */
        submitWorkflowForExecution: function(workflowJson) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');

            console.log('[CopilotApi] submitWorkflowForExecution called');
            console.log('[CopilotApi] Workflow JSON:', workflowJson);

            // Get workflow engine URL from config
            var workflowEngineUrl = window.App.workflow_url || 'https://dev-7.bv-brc.org/api/v1';
            var submitUrl = workflowEngineUrl + '/workflows/submit';

            console.log('[CopilotApi] Submitting directly to workflow engine:', submitUrl);

            // Clean the workflow before submission - remove fields that workflow engine assigns
            var workflowForSubmission = JSON.parse(JSON.stringify(workflowJson));

            // Remove workflow_id (including placeholder values like "<scheduler_generated_id>")
            // Always remove it - the engine will assign a real one
            delete workflowForSubmission.workflow_id;
            delete workflowForSubmission.status;       // Engine assigns this
            delete workflowForSubmission.created_at;   // Engine assigns this
            delete workflowForSubmission.updated_at;   // Engine assigns this
            delete workflowForSubmission.execution_metadata; // Frontend metadata, not for engine

            // Clean steps - remove execution metadata
            if (workflowForSubmission.steps) {
                workflowForSubmission.steps.forEach(function(step) {
                    delete step.step_id;    // Engine assigns this
                    delete step.status;     // Execution metadata
                    delete step.task_id;    // Execution metadata
                });
            }

            console.log('[CopilotApi] Cleaned workflow for submission:', workflowForSubmission);

            return request.post(submitUrl, {
                data: JSON.stringify(workflowForSubmission),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                console.log('[CopilotApi] Workflow submission response:', response);
                // Response format from workflow engine:
                // {
                //   "workflow_id": "wf_123...",
                //   "status": "pending",
                //   "message": "Workflow submitted for execution"
                // }
                return response;
            }).catch(function(error) {
                console.error('[CopilotApi] Error submitting workflow:', error);
                console.error('[CopilotApi] Error object keys:', Object.keys(error));

                // Extract error message from dojo/request error
                var errorMsg = 'Failed to submit workflow';

                // dojo/request error structure - check response.data first (parsed JSON)
                if (error.response) {
                    if (error.response.data) {
                        // Already parsed JSON error response
                        var errorData = error.response.data;
                        if (typeof errorData === 'object') {
                            errorMsg = errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData);
                        } else {
                            errorMsg = errorData;
                        }
                    } else if (typeof error.response === 'string') {
                        // Response is a string
                        errorMsg = error.response;
                        try {
                            var errorJson = JSON.parse(errorMsg);
                            errorMsg = errorJson.detail || errorJson.message || errorJson.error || errorMsg;
                        } catch (e) {
                            // Keep as-is
                        }
                    } else if (error.message) {
                        errorMsg = error.message;
                    }
                } else if (error.message) {
                    errorMsg = error.message;
                }

                console.error('[CopilotApi] Extracted error message:', errorMsg);
                throw new Error(errorMsg);
            });
        },

        /**
         * Rates a message
         * @param {string} messageId The ID of the message to rate
         * @param {number} rating The rating to set (1 or -1)
         * @returns {Promise} A promise that resolves when the rating is set
         */
        rateMessage: function(messageId, rating) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            return request.post(this.apiUrlBase + '/rate-message', {
                data: JSON.stringify({
                    message_id: messageId,
                    rating: rating,
                    user_id: _self.user_id
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                return response;
            }).catch(function(error) {
                console.error('Error rating message:', error);
                throw error;
            });
        },

        /**
         * Gets the path state
         * @param {string} path The path to get the state for
         * @returns {Promise} A promise that resolves when the path state is retrieved
         */
        getPathState: function(url_path) {
            // TODO: add this path to the api
            if (url_path == '/') {
                return Promise.resolve(null);
            }
            console.log('getting path state for', url_path);
            return request.post(this.apiUrlBase + '/get-path-state', {
                data: JSON.stringify({
                    path: url_path
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                return response;
            }).catch(function(error) {
                console.error('Error getting path state:', error);
                throw error;
            });
        }
    });
});
