define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dojo/request',
    'dojo/_base/lang',
    'dojo/topic'
], function(declare, _WidgetBase, request, lang, topic) {

    return declare([_WidgetBase], {
        // apiUrl: 'http://195.88.24.64:80/v1',
        apiUrlBase: 'https://p3cp.theseed.org/api',
        // apiKey: 'cmsc-35360',
        // model: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
        storedResult: null,

        constructor: function(opts) {
            this.inherited(arguments);
            lang.mixin(this, opts);
        },

        postCreate: function() {
            this.inherited(arguments);
            console.log('CopilotAPI postCreate');
        },

        getUserSessions: function() {
            var _self = this;
            console.log('getUserSessions', _self.user_id);
            return request.get(this.apiUrlBase + `/get-all-sessions?user_id=${encodeURIComponent(_self.user_id)}`, {
                headers: {
                    Authorization: (window.App.authorizationToken || '')
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

        getNewSessionId: function() {
            return request.get(this.apiUrlBase + '/start-chat', {
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

        submitQuery: function(inputText, sessionId) {
            var _self = this;
            return request.post(this.apiUrlBase + '/copilot-chat', {
                data: JSON.stringify({
                    query: inputText,
                    session_id: sessionId,
                    user_id: _self.user_id
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                _self.storedResult = response;
                return response;
            }).catch(function(error) {
                console.error('Error submitting query:', error);
                throw error;
            });
        },

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

        // NOPE: going to have to do this on the server side
        getTitleFromMessage: function(message) {
            var _self = this;
            debugger;
            return request.post(this.apiUrlBase + '/generate-title', {
                data: JSON.stringify({
                    content: message,
                    user_id: _self.user_id
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
            }).then(function(response) {
                return response.title;
            }).catch(function(error) {
                console.error('Error getting session title:', error);
                throw error;
            });
        }
    });
});
