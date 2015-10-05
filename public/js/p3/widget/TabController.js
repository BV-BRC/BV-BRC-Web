define([
        "dojo/_base/declare","dijit/_WidgetBase","dijit/layout/TabController",
        "dijit/focus",
        "dijit/registry",
	"dojo/topic"
], function(
        declare, WidgetBase, TabController,
	focus,
	registry,
	Topic
){
        return declare([TabController], {
                onSelectChild: function(/*dijit/_WidgetBase*/ page){
                        // summary:
                        //              Called when a page has been selected in the StackContainer, either by me or by another StackController
                        // tags:
                        //              private

                        if(!page){
                                return;
                        }

                        console.log("Select Page ID: ", page.id, page)
                        
                        if(this._currentChild){
                                var oldButton = this.pane2button(this._currentChild.id);
                                oldButton.set('checked', false);
                                oldButton.focusNode.setAttribute("tabIndex", "-1");
                        }

                        var newButton = this.pane2button(page.id);
                        console.log("Button: ", newButton);
                        if (newButton){
                                newButton.set('checked', true);
                                newButton.focusNode.setAttribute("tabIndex", "0");
                        }
                        this._currentChild = page;
                    
                        var container = registry.byId(this.containerId);
                },

                onButtonClick: function(/*dijit/_WidgetBase*/ page){
                        // summary:
                        //              Called whenever one of my child buttons is pressed in an attempt to select a page
                        // tags:
                        //              private

                        var button = this.pane2button(page.id);

                        // For TabContainer where the tabs are <span>, need to set focus explicitly when left/right arrow
                        focus.focus(button.focusNode);

                        if(this._currentChild && this._currentChild.id === page.id){
                                //In case the user clicked the checked button, keep it in the checked state because it remains to be the selected stack page.
                                button.set('checked', true);
                        }
                        var container = registry.byId(this.containerId);

			console.log("Select Child: ", page.id,  " ContainerId: ", this.containerId);
			console.log("Nav to: ", window.location.pathname + window.location.search + "#view_tab=" + page.id.replace(this.containerId + "_",""));
			var location = window.location.pathname + window.location.search + "#view_tab=" + page.id.replace(this.containerId + "_","");
			Topic.publish("/navigate", {href: location});	

//                        container.selectChild(page);
                }

	});
});
