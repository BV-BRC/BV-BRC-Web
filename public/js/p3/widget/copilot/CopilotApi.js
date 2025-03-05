/**
 * @module p3/widget/CopilotApi
 * @description A widget that handles API communication between the frontend and the PATRIC Copilot backend service.
 * Provides methods for managing chat sessions, submitting queries, and retrieving messages.
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
     */
    return declare([_WidgetBase], {
        /** @property {string} apiUrlBase - Base URL for the Copilot API endpoints */
        apiUrlBase: 'https://dev-3.bv-brc.org/copilot-api/chatbrc',
        dbUrlBase: 'https://dev-3.bv-brc.org/copilot-api/db',

        /** @property {Object} storedResult - Stores the last API response */
        storedResult: null,

        /**
         * @constructor
         * @param {Object} opts - Configuration options
         * @description Initializes the widget and mixes in provided options
         */
        constructor: function(opts) {
            this.inherited(arguments);
            lang.mixin(this, opts);
        },

        /**
         * @method postCreate
         * @description Lifecycle method called after widget creation
         */
        postCreate: function() {
            this.inherited(arguments);
            console.log('CopilotAPI postCreate');
        },

        /**
         * @method getUserSessions
         * @returns {Promise<Array>} Promise resolving to array of user's chat sessions
         * @description Fetches all chat sessions for the current user
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
         * @method getNewSessionId
         * @returns {Promise<string>} Promise resolving to new session ID
         * @description Initiates a new chat session and returns its ID
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
         * @method submitQuery
         * @param {string} inputText - User's query text
         * @param {string} sessionId - Current session identifier
         * @param {string} systemPrompt - Optional system prompt to use
         * @returns {Promise<Object>} Promise resolving to API response
         * @description Submits a user query to the Copilot chat service
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
         * @method submitRagQuery
         * @param {string} inputQuery - User's query text
         * @param {string} ragDb - RAG database to use
         * @returns {Promise<Object>} Promise resolving to API response
         * @description Submits a user query to the Copilot chat service with RAG
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
         * @method getSessionMessages
         * @param {string} sessionId - Session identifier
         * @returns {Promise<Object>} Promise resolving to session messages
         * @description Retrieves all messages for a given chat session
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
         * @method updateSessionTitle
         * @param {string} sessionId - Session identifier
         * @param {string} newTitle - New title for the session
         * @returns {Promise<Object>} Promise resolving to updated session data
         * @description Updates the title of a chat session
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
