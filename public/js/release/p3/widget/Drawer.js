define("p3/widget/Drawer", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_WidgetsInTemplateMixin",
	"dijit/_TemplatedMixin","dojo/topic"
],function(
	declare, WidgetBase, on,
	domClass,WiT,
	Templated,Topic
){
	return declare([WidgetBase,Templated], {
		templateString: "<div><div data-dojo-attach-event='click:toggle' class='handle'><div>${title}</div></div><div data-dojo-attach-point='panelContainer' class='PanelContainer'></div></div>",
		baseClass: "Drawer",
		"class": "LeftDrawer",
		title: "FILTERS",
		topic: "/overlay",
		postCreate: function(){
			console.log("POSTCREATE");
			this.inherited(arguments);

			domClass.add(this.domNode,"dijitHidden");
			var _self=this;
			Topic.subscribe(this.topic, function(msg){
				console.log("DrawerMessage: ", msg)
				if (msg.action && msg.action=="hide") {
					domClass.add(_self.domNode, "dijitHidden");
					return;
				}

				if (msg.action && msg.action=="set" && msg.panel) {
					_self.set('panel', msg.panel);
					domClass.remove(_self.domNode, "dijitHidden");
					if (_self.currentPanel && (_self.currentPanel instanceof msg.panel)) {
						console.log("existing Panel in place");
					}else{
						_self.setupPanel(msg.panel);	
					}
					return;
				}
	
			});
		},
		toggle: function(){
			domClass.toggle(this.domNode,"Closed");
			if (!domClass.contains(this.domNode, "Closed")){
				console.log("Startup CurrentPanel");
				this.currentPanel.startup();
				this.currentPanel.resize();
			}
	
		},

		setupPanel: function(Panel){
			console.log("Setup Drawer Panel: ", Panel);
			this.currentPanel = new Panel({"class": "PanelContent", content: "Loading Panel Content"}).placeAt(this.panelContainer);

			if (!domClass.contains(this.domNode,"Closed")) {
				console.log("Startup on Startup CurrentPanel");
				this.currentPanel.startup();
				this.currentPanel.resize();
			}
		}
	});
});
