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
        apiUrlBase: 'https://dev-3.bv-brc.org/copilot-api/chatbrc',

        /** Base URL for database-related endpoints */
        dbUrlBase: 'https://dev-3.bv-brc.org/copilot-api/db',

        /** Caches the most recent API response */
        storedResult: null,

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
         * Currently just logs creation event
         */
        postCreate: function() {
            this.inherited(arguments);
            console.log('CopilotAPI postCreate');
        },

        /**
         * Fetches all chat sessions for current user
         * Implementation:
         * - Makes GET request to sessions endpoint
         * - Handles auth via headers
         * - Parses JSON response
         * - Returns empty array if no sessions found
         */
        getUserSessions: function() {
            var _self = this;
            console.log('getUserSessions', _self.user_id);
            return request.get(this.apiUrlBase + `/get-all-sessions?user_id=${encodeURIComponent(_self.user_id)}`, {
                headers: {
                    Authorization: ('')
                }
            }).then(lang.hitch(this, function(response) {
                var data = JSON.parse(response);
                if (data.sessions && data.sessions.length > 0) {
                    return data.sessions;
                } else {
                    return [];
                }
            }));
        },

        /**
         * Starts a new chat session
         * Implementation:
         * - Makes GET request to start-chat endpoint
         * - Returns new session ID on success
         * - Publishes error events on failure
         */
        getNewSessionId: function() {
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
         * Submits a regular chat query
         * Implementation:
         * - Builds query data object with text, model, session
         * - Optionally includes system prompt if provided
         * - Makes POST request to chat endpoint
         * - Caches response in storedResult
         * - Handles errors with detailed logging
         */
        submitQuery: function(inputText, sessionId, systemPrompt, model) {
            var _self = this;
            console.log('query');
            var data = {
                query: inputText,
                model: model,
                session_id: sessionId,
                user_id: _self.user_id
            };

            if (systemPrompt) {
                data.system_prompt = systemPrompt;
            }

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
        submitRagQuery: function(inputQuery, ragDb, sessionId, model) {
            var _self = this;
            var data = {
                query: inputQuery,
                rag_db: ragDb,
                user_id: _self.user_id,
                model: model
            };
            return request.post(this.apiUrlBase + '/rag', {
                data: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(lang.hitch(this, function(response) {
                _self.storedResult = response;
                if (response['message'] == 'success') {
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
         * Retrieves all messages for a session
         * Implementation:
         * - Makes GET request with session ID
         * - Returns full message history
         * - Includes detailed error logging
         */
        getSessionMessages: function(sessionId) {
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
         * Generates a title from chat messages
         * Implementation:
         * - Posts messages to title generation endpoint
         * - Uses specified model for generation
         * - Returns generated title string
         */
        generateTitleFromMessages: function(messages, model) {
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
                if (error.response.status === 413) {
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
        }
    });
});
