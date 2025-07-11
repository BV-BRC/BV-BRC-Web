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
    'dijit/Dialog'
], function(
    declare, _WidgetBase, request, lang, topic, Dialog
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
                // Additionally show a dialog to the user
                new Dialog({
                    title: 'Service Unavailable',
                    content: 'The BV-BRC Copilot service is currently unavailable. Please try again later.',
                    style: 'width: 300px'
                }).show();
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
        submitCopilotQuery: function(inputText, sessionId, systemPrompt, model, save_chat = true, ragDb, numDocs, image, enhancedPrompt = null) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            console.log('query');
            var data = {
                query: inputText,
                model: model,
                session_id: sessionId,
                user_id: _self.user_id,
                save_chat: save_chat,
                enhanced_prompt: enhancedPrompt
            };

            if (systemPrompt) {
                data.system_prompt = systemPrompt;
            } else {
                data.system_prompt = '';
            }

            // Add RAG functionality if ragDb is provided
            if (ragDb) {
                data.rag_db = ragDb;
                if (numDocs) {
                    data.num_docs = numDocs;
                }
            }

            // Add image functionality if image is provided
            if (image) {
                data.image = image;
            }

            return request.post(this.apiUrlBase + '/copilot', {
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
        getSessionMessages: function(sessionId) {
            if (!this._checkLoggedIn()) return Promise.reject('Not logged in');
            var _self = this;
            return request.get(this.apiUrlBase + `/get-session-messages?session_id=${encodeURIComponent(sessionId)}`, {
                headers: {
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                console.log('Session messages retrieved:', response);
                return response;
            }).catch(function(error) {
                console.error('Error getting session messages:', error);
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
