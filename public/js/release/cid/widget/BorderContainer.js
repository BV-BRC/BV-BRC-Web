define("cid/widget/BorderContainer", [
	"dojo/_base/declare","dijit/layout/BorderContainer","dijit/layout/utils",
	"dojo/dom-style","dojo/dom-class"

], function(
	declare,BorderContainer,layoutUtils,
	domStyle,domClass
) {

	return declare(BorderContainer, {
		layout: function(){
			console.log("layout()");
			layoutUtils.layoutChildren(this.domNode, this._contentBox, this._getOrderedChildren());
		},

		addChild: function(/*dijit/_WidgetBase*/ child, /*Integer?*/ insertIndex){
			this.inherited(arguments);
			if(this._started){
				this.layout();
			}
		},

		removeChild: function(/*dijit/_WidgetBase*/ child, skipLayout){
			console.log("removeChild child: ", child);
			this.inherited(arguments);
			if(this._started && !skipLayout){
				this.layout();
			}

			// Clean up whatever style changes we made to the child pane.
			// Unclear how height and width should be handled.
			domClass.remove(child.domNode, this.baseClass + "Pane");
			domStyle.set(child.domNode, {
				top: "auto",
				bottom: "auto",
				left: "auto",
				right: "auto",
				position: "static"
			});
			domStyle.set(child.domNode, /top|bottom/.test(child.region) ? "width" : "height", "auto");
		}
	});

});
