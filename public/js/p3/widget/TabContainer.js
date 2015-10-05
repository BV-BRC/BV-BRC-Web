define([
        "dojo/_base/declare","dijit/_WidgetBase","dijit/layout/TabContainer",
	"./TabController"
], function(
        declare, WidgetBase, TabContainer,
	TabController
){
        return declare([TabContainer], {
		controllerWidget: TabController
	});
})
