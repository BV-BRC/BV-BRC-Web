define("cid/app/patric", [
	"dojo/_base/declare","dojo/parser",
	"dojo/topic","dojo/on","dojo/dom","dojo/dom-class","dojo/dom-attr",
	"dijit/registry","dojo/request","dijit/layout/ContentPane",
	"dojo/_base/Deferred","../widget/Drawer","../widget/WorkspaceManager",
	"dojo/ready","dojo/parser","rql/query","../widget/GenomeList","./App"
],function(
	declare,parser,
	Topic,on,dom,domClass,domAttr,
	Registry,xhr,ContentPane,
	Deferred,Drawer,WorkspaceManager,
	Ready,Parser,rql,App
) {
	return declare([App], {
		startup: function() {	
			this.inherited(arguments);
//                      console.log("Application Startup()");
                        var drawer = new Drawer({class: "RightDrawer Closed",topic: "/overlay/right"}).placeAt(document.body);
                        var drawer = new Drawer({class: "LeftDrawer Closed",topic:"/overlay/left"}).placeAt(document.body);
//                      console.log("Drawer: ", drawer);
                        drawer.startup();
                        var current = _self.getCurrentContainer();
//                      console.log("CurrentContainer",current);
                                if (current && current.getFilterPanel){
                                        var panel = current.getFilterPanel();
                                        //console.log("Got Panel: ", panel);
                                        if (panel) {
                                                Topic.publish("/overlay/left",{action: "set", panel: panel});
                                                return;
                                        }
                                }else{
                                                Topic.publish("/overlay/left",{action: "hide"});
                                }

		}
	});
});
