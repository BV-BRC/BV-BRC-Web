define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dojo/request',
    'dojo/_base/lang'
], function(declare, _WidgetBase, request, lang) {

    return declare([_WidgetBase], {
        apiUrl: 'http://195.88.24.64:80/v1',
        apiKey: 'cmsc-35360',
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
        storedResult: null,

        constructor: function(opts) {
            this.inherited(arguments);
            lang.mixin(this, opts);
        },

        submitQuery: function(inputText) {
            var _self = this;
            return request.post(this.apiUrl + '/chat/completions', {
                data: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: inputText }]
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.apiKey
                },
                handleAs: 'json'
            }).then(function(response) {
                console.log(response);
                _self.storedResult = response;
                return response;
            }).catch(function(error) {
                console.error('Error submitting query:', error);
                throw error;
            });
        },

        getStoredResult: function() {
            return this.storedResult;
        }
    });
});
