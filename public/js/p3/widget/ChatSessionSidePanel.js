
define([
    'dojo/_base/declare',
    './ChatSessionContainer',
    'dojo/_base/lang',
    'dojo/dom-class'
], function(
    declare,
    ChatSessionContainer,
    lang,
    domClass
) {
    return declare([ChatSessionContainer], {
        selection: null,
        gutters: false,
        liveSplitters: true,
        style: 'height: 100%; width: 100%;',

        postCreate: function() {
            this.inherited(arguments);

            this.watch('containerSelection', lang.hitch(this, function(prop, oldVal, selection) {
                if (this.inputWidget) {
                    this.inputWidget.setSystemPromptWithData(selection);
                }
            }));
        },

        clearSelection: function() {
            // Clear the display
            this.set('content', 'No selection');
        },

        displaySelection: function(item) {
            // Display single item details
            // You can customize this based on your needs
            var content = ['<div class="selectionPane">'];
            content.push('<div class="selectionTitle">Selected Item:</div>');

            // Add item properties you want to display
            Object.keys(item).forEach(function(key) {
                content.push('<div class="selectionField">' + key + ': ' + item[key] + '</div>');
            });

            content.push('</div>');
            this.set('content', content.join(''));
        },

        displayMultipleSelection: function(items) {
            // Display multiple items summary
            var content = ['<div class="selectionPane">'];
            content.push('<div class="selectionTitle">' + items.length + ' items selected</div>');
            // Add any summary information you want to display
            content.push('</div>');
            this.set('content', content.join(''));
        }
    });
});