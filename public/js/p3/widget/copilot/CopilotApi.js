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
    './CopilotSSEEventHandler'
], function(
    declare, _WidgetBase, request, lang, topic, Dialog, CopilotSSEEventHandler
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
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
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
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
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
         * Submits a copilot query with streaming via /copilot-agent SSE endpoint.
         * @param {object} params - The parameters for the query
         * @param {string} params.inputText - The user's input text
         * @param {string} params.sessionId - The current session ID
         * @param {string} params.systemPrompt - The system prompt
         * @param {string} params.model - The model to use
         * @param {boolean} params.save_chat - Whether to save the chat
         * @param {string[]} params.images - A list of base64 encoded images
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

            // Abort any previously-active stream before starting a new one
            console.log('[CopilotApi] submitCopilotQueryStream: aborting previous stream (if any) before new stream for session', params.sessionId);
            this.abortActiveStream();

            console.log('[CopilotApi] submitCopilotQueryStream: starting new stream for session', params.sessionId);
            var _self = this;
            this.currentJobId = null;
            this.currentActiveToolId = null;

            // Capture the session ID for this stream.  The activeStreamSessionId
            // property is updated every time a new stream starts.  Callbacks
            // compare their captured value against the live property and
            // silently bail out if a session switch occurred mid-stream.
            var streamSessionId = params.sessionId;
            this.activeStreamSessionId = streamSessionId;
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
            if (Array.isArray(params.selected_jobs) && params.selected_jobs.length > 0) {
                data.selected_jobs = params.selected_jobs;
            }
            if (Array.isArray(params.selected_workflows) && params.selected_workflows.length > 0) {
                data.selected_workflows = params.selected_workflows;
            }

            if (Array.isArray(params.images) && params.images.length > 0) {
                data.images = params.images;
                if (Array.isArray(params.image_attachments) && params.image_attachments.length > 0) {
                    data.image_attachments = params.image_attachments;
                }
            }
            if (Array.isArray(params.files) && params.files.length > 0) {
                data.files = params.files;
            }
            if (Array.isArray(params.pdfs) && params.pdfs.length > 0) {
                data.pdfs = params.pdfs;
            }
            // Planning agent routing — passed by plan topic subscribers
            if (params.target_agent) {
                data.target_agent = params.target_agent;
            }
            if (params.workflow_context) {
                data.workflow_context = params.workflow_context;
            }
            // Plan/Execute toggle — a write-through.  The gateway persists it
            // on the session before the turn and reads the mode from Mongo,
            // so a toggle-then-send cannot race the dedicated update call.
            if (params.execution_mode === 'plan' || params.execution_mode === 'execute') {
                data.execution_mode = params.execution_mode;
            }
            // One-shot execute: this turn runs in execute mode; the stored
            // session mode is left untouched.
            if (params.execute_once === true) {
                data.execute_once = true;
            }
            // "Submit this job": the refused calls, run verbatim by the
            // service agent (the gateway checks them against the stored card).
            if (Array.isArray(params.replay_actions) && params.replay_actions.length > 0) {
                data.replay_actions = params.replay_actions;
            }
            var streamEndpoint = this.apiUrlBase + '/copilot-agent';

            // Create abort controller for this request
            this.currentAbortController = new AbortController();

            // Create SSE event handler for this request
            var eventHandler = new CopilotSSEEventHandler();
            eventHandler.resetState();

            // Card metadata is now classified by the gateway and arrives
            // on SSE events as parsed.card { card_type, card_payload }.
            // The legacy CopilotToolHandler is no longer needed.

            fetch(streamEndpoint, {
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
                        var err = new Error(`HTTP error! status: ${response.status}, message: ${text}`);
                        err.status = response.status;
                        // Structured refusals (e.g. 409 PLAN_MODE from a plan
                        // step while the session is in plan mode) carry a
                        // user-facing message — surface that instead.
                        try {
                            var parsed = JSON.parse(text);
                            if (parsed && parsed.code) {
                                err.code = parsed.code;
                                if (parsed.message) { err.message = parsed.message; }
                            }
                        } catch (e) { /* not JSON */ }
                        if (onError) onError(err);
                    });
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';
                let currentEvent = null;

                const processLine = (line) => {
                    console.log('***************** [CopilotApi] Processing line:', line);
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

                        // Session guard: if the user switched sessions since this
                        // stream was started, discard all remaining events silently.
                        if (_self.activeStreamSessionId !== streamSessionId) {
                            console.warn('[CopilotApi] Discarding SSE event for stale session',
                                streamSessionId, '(active:', _self.activeStreamSessionId, ', event:', currentEvent, ')');
                            return;
                        }

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
                                    // Extract text chunk and card metadata from SSE event
                                    var toolMetadata = null;

                                    // Extract gateway-classified card from the SSE event data.
                                    if (parsed && parsed.card && parsed.card.card_type) {
                                        toolMetadata = {
                                            source_tool: parsed.tool || parsed.source_tool || null,
                                            card: parsed.card
                                        };
                                    }

                                    var textChunk = parsed.chunk || parsed.delta || parsed.content || '';
                                    if (typeof textChunk === 'object' && textChunk !== null) {
                                        textChunk = JSON.stringify(textChunk, null, 2);
                                    }
                                    if ((textChunk || toolMetadata) && onData) {
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

                                    if (onEnd) onEnd({ reason: 'done', data: parsed });
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
                                    if (parsed && parsed.tool) {
                                        _self.currentActiveToolId = parsed.tool;
                                    }
                                    if (parsed && parsed.job_id) {
                                        _self.currentJobId = parsed.job_id;
                                    }
                                    break;
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

                                case 'needs_input':
                                    // The agent needs clarification from the user (e.g.
                                    // missing taxon_id for annotation).  Deliver the
                                    // question as a normal text chunk so it renders as
                                    // an assistant message the user can reply to.
                                    var questionText = parsed.message || parsed.question || '';
                                    if (questionText && onData) {
                                        onData(questionText, null);
                                    }
                                    break;

                                case 'session_file_created':
                                    // File creation metadata is handled as a dedicated SSE event.
                                    // Consumers can update the session Files panel immediately.
                                    topic.publish('CopilotSessionFileCreated', parsed);
                                    break;

                                case 'ask_questions':
                                    // Planning agent clarification questions.
                                    if (parsed.questions && parsed.card && onData) {
                                        onData('', {
                                            card: parsed.card,
                                            originalQuery: data.query || ''
                                        });
                                    }
                                    break;

                                case 'plan_created':
                                    // Planning agent produced a plan for approval.
                                    if (parsed.plan && parsed.card && onData) {
                                        onData('', { card: parsed.card });
                                    }
                                    break;

                                case 'execution_blocked':
                                    // A gated tool was refused in plan mode.  The
                                    // card renders a one-shot "Submit this job" button (execute_once).
                                    if (parsed.card && onData) {
                                        onData('', { card: parsed.card });
                                    }
                                    break;

                                case 'plan_step_started':
                                case 'plan_step_completed':
                                case 'plan_step_failed':
                                    // These are handled by CopilotSSEEventHandler
                                    // which publishes CopilotPlanStepUpdate topic
                                    // for PlanCard to consume
                                    if (onStatusMessage) {
                                        var statusResult = eventHandler.handleEvent(currentEvent, parsed);
                                        if (statusResult) {
                                            onStatusMessage(statusResult);
                                        }
                                    }
                                    break;

                                case 'plan_review_ready':
                                    // Route through CopilotSSEEventHandler which
                                    // publishes CopilotPlanReviewReady topic for
                                    // PlanCard to render the review panel.
                                    if (onStatusMessage) {
                                        var reviewResult = eventHandler.handleEvent(currentEvent, parsed);
                                        if (reviewResult) {
                                            onStatusMessage(reviewResult);
                                        }
                                    }
                                    break;

                                case 'plan_workflow_submitted':
                                    // A plan step submitted a long-running workflow.
                                    // Route through CopilotSSEEventHandler which
                                    // publishes CopilotPlanWorkflowSubmitted topic
                                    // for PlanCard to pause and show waiting state.
                                    if (onStatusMessage) {
                                        var wfSubResult = eventHandler.handleEvent(currentEvent, parsed);
                                        if (wfSubResult) {
                                            onStatusMessage(wfSubResult);
                                        }
                                    }
                                    break;

                                case 'workflow_complete':
                                    // A watched workflow reached a terminal state.
                                    // Route through CopilotSSEEventHandler which
                                    // publishes CopilotWorkflowComplete topic for
                                    // PlanCard to show a "Continue Plan" button.
                                    if (onStatusMessage) {
                                        var wfCompResult = eventHandler.handleEvent(currentEvent, parsed);
                                        if (wfCompResult) {
                                            onStatusMessage(wfCompResult);
                                        }
                                    }
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
                    // If the session changed since this stream was started,
                    // stop reading and call onEnd so the UI unlocks (hide
                    // loading indicator, re-enable send button, etc.).
                    if (_self.activeStreamSessionId !== streamSessionId) {
                        console.log('[CopilotApi] Stopping pump for stale session', streamSessionId);
                        reader.cancel();
                        _self.currentAbortController = null;
                        _self.currentActiveToolId = null;
                        _self.currentJobId = null;
                        if (onEnd) onEnd({ reason: 'aborted' });
                        return;
                    }

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
                            if (onEnd) onEnd({ reason: 'done' });
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
                    }).catch(err => {
                        // Handle stream disconnection gracefully
                        console.warn('Stream disconnected:', err.name);
                        _self.currentAbortController = null;
                        _self.currentActiveToolId = null;
                        _self.currentJobId = null;

                        // Only call onError if it's not a user abort
                        if (err.name !== 'AbortError') {
                            var disconnectError = new Error('Connection interrupted. Please reload the session.');
                            disconnectError.isStreamDisconnect = true;
                            if (onError) onError(disconnectError);
                        } else if (onEnd) {
                            // User aborted, just end gracefully
                            onEnd({ reason: 'aborted' });
                        }
                    });
                }

                return pump();

            }).catch(err => {
                console.error('Error submitting copilot query stream:', err);
                _self.currentAbortController = null;
                _self.currentActiveToolId = null;
                _self.currentJobId = null;

                // Provide a more user-friendly error message for common issues
                if (err.name === 'AbortError') {
                    // User cancelled — still call onEnd so the UI unlocks
                    // (hide loading indicator, re-enable send button).
                    if (onEnd) onEnd({ reason: 'aborted' });
                    return;
                }

                var errorToShow = err;
                if (!err.isStreamDisconnect) {
                    // Enhance error message for better user understanding
                    if (err.message && err.message.includes('Failed to fetch')) {
                        errorToShow = new Error('Network error. Please check your connection and reload.');
                    } else if (err.message && err.message.includes('HTTP error')) {
                        errorToShow = err; // Keep detailed HTTP errors
                    }
                }

                if (onError) onError(errorToShow);
            });
        },

        isQueryAbortableTool: function(toolId) {
            if (!toolId || typeof toolId !== 'string') return false;
            var normalized = toolId.split('.').pop();
            return normalized === 'bvbrc_query_collection' ||
                normalized === 'query_collection' ||
                normalized === 'bvbrc_global_data_search' ||
                normalized === 'bvbrc_search_data';
        },

        getCurrentStreamState: function() {
            return {
                job_id: this.currentJobId || null,
                tool_id: this.currentActiveToolId || null,
                has_active_stream: !!this.currentAbortController
            };
        },

        /**
         * Aborts the active SSE stream if one is in progress.
         * Called when switching sessions to prevent stale data from
         * an old stream leaking into the newly-active session.
         */
        abortActiveStream: function() {
            if (this.currentAbortController) {
                console.warn('[CopilotApi] Aborting active SSE stream — STACK TRACE:');
                console.trace('[CopilotApi] abortActiveStream caller');
                this.currentAbortController.abort();
                this.currentAbortController = null;
                this.currentActiveToolId = null;
                this.currentJobId = null;
            } else {
                console.log('[CopilotApi] abortActiveStream called but no active controller');
            }
            // Clear the active stream session so that any in-flight pump()
            // iterations that survive the abort also see the mismatch and
            // stop processing events.
            this.activeStreamSessionId = null;
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
                reason: opts.reason || 'Stopped from chat UI'
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

                // Direct logging of messages
                console.log('[DIRECT LOG] Retrieved messages array:');
                if (response && response.messages) {
                    console.log('[DIRECT LOG] Total messages:', response.messages.length);
                    response.messages.forEach(function(message, index) {
                        console.log(`[DIRECT LOG] Message ${index}:`, message);
                        console.log(`[DIRECT LOG] Message ${index} stringified:`, JSON.stringify(message, null, 2));
                    });
                } else {
                    console.log('[DIRECT LOG] No messages found in response');
                }

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
        /**
         * Persist the Plan/Execute toggle for a session.
         * @param {string} sessionId
         * @param {'plan'|'execute'} mode
         */
        setSessionExecutionMode: function(sessionId, mode) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            return request.post(this.apiUrlBase + '/update-session-execution-mode', {
                data: JSON.stringify({
                    session_id: sessionId,
                    execution_mode: mode,
                    user_id: _self.user_id
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).catch(function(error) {
                console.error('Error updating session execution mode:', error);
                throw error;
            });
        },

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

        // submitWorkflowForExecution, getWorkflowById, getWorkflowStatus,
        // getBatchWorkflowStatus removed — workflow cards have been deleted.
        // Workflow monitoring is handled by the gateway workflow monitor service.

        /**
         * Replays a previously executed MCP tool call through the orchestrator API.
         * Used by tool cards loaded from session history where result payloads are not persisted.
         * @param {Object} toolCall Canonical tool call envelope
         * @param {string|null} sessionId Optional session id for execution context
         * @returns {Promise<Object>} Replay response payload
         */
        replayToolCall: function(toolCall, sessionId) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            if (!toolCall || typeof toolCall !== 'object') {
                return Promise.reject(new Error('toolCall is required'));
            }
            var toolId = toolCall.tool || toolCall.tool_id;
            if (!toolId || typeof toolId !== 'string') {
                return Promise.reject(new Error('toolCall.tool is required'));
            }
            var args = toolCall.arguments_executed;
            if (!args || typeof args !== 'object' || Array.isArray(args)) {
                args = {};
            }

            return request.post(this.apiUrlBase + '/mcp/replay-tool-call', {
                data: JSON.stringify({
                    tool_id: toolId,
                    parameters: args,
                    tool_call: toolCall,
                    session_id: sessionId || null
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                return response;
            }).catch(function(error) {
                console.error('[CopilotApi] Error replaying MCP tool call:', error);
                throw error;
            });
        },

        /**
         * Searches stored RAG chunk references for a message/session scope.
         * @param {Object} filters Query filters (message_id/session_id/user_id/rag_db/etc.)
         * @returns {Promise<Object>} Paginated chunk search response
         */
        searchRagChunkReferences: function(filters) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var safeFilters = (filters && typeof filters === 'object') ? filters : {};
            var queryParts = [];

            var appendQuery = function(key, value) {
                if (value === undefined || value === null) return;
                if (typeof value === 'string' && value.trim() === '') return;
                queryParts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
            };

            appendQuery('chunk_id', safeFilters.chunk_id);
            appendQuery('rag_db', safeFilters.rag_db);
            appendQuery('rag_api_name', safeFilters.rag_api_name);
            appendQuery('doc_id', safeFilters.doc_id);
            appendQuery('source_id', safeFilters.source_id);
            appendQuery('session_id', safeFilters.session_id);
            appendQuery('user_id', safeFilters.user_id);
            appendQuery('message_id', safeFilters.message_id);
            appendQuery('limit', safeFilters.limit);
            appendQuery('offset', safeFilters.offset);
            appendQuery('include_content', typeof safeFilters.include_content === 'boolean' ? String(safeFilters.include_content) : 'true');

            return request.get(this.apiUrlBase + '/rag-chunk-search?' + queryParts.join('&'), {
                headers: {
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                return response;
            }).catch(function(error) {
                console.error('[CopilotApi] Error searching RAG chunk references:', error);
                throw error;
            });
        },

        /**
         * Associates a submitted workflow ID with a chat session so it appears in workflow context.
         * @param {string} sessionId The chat session ID
         * @param {string} workflowId The submitted workflow ID
         * @returns {Promise} A promise that resolves when workflow is associated
         */
        addWorkflowToSession: function(sessionId, workflowId) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            if (!sessionId || !workflowId) return Promise.reject('sessionId and workflowId are required');

            var _self = this;
            return request.post(this.apiUrlBase + '/add-workflow-to-session', {
                data: JSON.stringify({
                    session_id: sessionId,
                    workflow_id: workflowId,
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
                console.error('Error adding workflow to session:', error);
                throw error;
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
        },

        // ==================== Planning Agent API Methods ====================

        /**
         * Submit answers to planning agent clarification questions.
         */
        answerPlanQuestions: function(answers, originalQuery, sessionId) {
            return request.post(this.apiUrlBase + '/answer-questions', {
                data: JSON.stringify({
                    answers: answers,
                    original_query: originalQuery,
                    session_id: sessionId
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            });
        },

        /**
         * Approve a plan and start executing the first step.
         * Returns an SSE stream — use with fetch(), not xhr.
         */
        approvePlan: function(planId, plan, sessionId) {
            return fetch(this.apiUrlBase + '/plan/' + encodeURIComponent(planId) + '/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                body: JSON.stringify({
                    plan: plan,
                    session_id: sessionId
                })
            });
        },

        /**
         * Execute the next step in a plan.
         * Returns an SSE stream — use with fetch(), not xhr.
         */
        executeNextStep: function(planId, plan, currentStepIndex, completedResults, sessionId) {
            return fetch(this.apiUrlBase + '/plan/' + encodeURIComponent(planId) + '/execute-next', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                body: JSON.stringify({
                    plan: plan,
                    current_step_index: currentStepIndex,
                    completed_step_results: completedResults || {},
                    session_id: sessionId
                })
            });
        },

        /**
         * Skip a step during plan execution.
         */
        skipPlanStep: function(planId, stepId, plan, currentStepIndex, completedResults, sessionId) {
            return fetch(this.apiUrlBase + '/plan/' + encodeURIComponent(planId) + '/skip-step/' + encodeURIComponent(stepId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                body: JSON.stringify({
                    plan: plan,
                    current_step_index: currentStepIndex,
                    completed_step_results: completedResults || {},
                    session_id: sessionId
                })
            });
        },

        /**
         * Edit remaining steps of a plan.
         */
        editPlan: function(planId, plan, sessionId) {
            return request.post(this.apiUrlBase + '/plan/' + encodeURIComponent(planId) + '/edit', {
                data: JSON.stringify({
                    plan: plan,
                    session_id: sessionId
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            });
        },

        /**
         * Check the status of a workflow watch (for polling during plan pause).
         * Returns the watch record from MongoDB with current GoWe state.
         *
         * @param {string} submissionId - GoWe submission ID
         * @returns {Promise} Resolves with {status, gowe_state, completed_at, ...}
         */
        checkWorkflowWatchStatus: function(submissionId) {
            return request(this.apiUrlBase + '/workflow-watch/' + encodeURIComponent(submissionId) + '/status', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            });
        },

        /**
         * Fetches all workflow watches for a chat session.
         * Returns watch records with external_ids (BV-BRC job IDs).
         *
         * @param {string} sessionId - Chat session ID
         * @returns {Promise} Resolves with {watches: [...], count: N}
         */
        getSessionWorkflowWatches: function(sessionId) {
            if (!sessionId) return Promise.reject('sessionId is required');
            return request(this.apiUrlBase + '/session/' + encodeURIComponent(sessionId) + '/workflow-watches', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            });
        }
    });
});
