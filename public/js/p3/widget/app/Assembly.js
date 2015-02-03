define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Assembly.html","./AppBase",
	"dgrid/Grid","dgrid/extensions/DijitRegistry",
        "dgrid/Keyboard", "dgrid/Selection","dgrid/extensions/ColumnResizer","dgrid/extensions/ColumnHider",
        "dgrid/extensions/DnD","dojo/dnd/Source","dojo/_base/Deferred","dojo/aspect","dojo/_base/lang","dojo/domReady!"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,AppBase,
        Grid,Store,DijitRegistry,
        Keyboard,Selection,formatter,ColumnResizer,
        ColumnHider,DnD,DnDSource,
        Deferred,aspect,lang,domReady
){
	return declare([Grid,DnD,Keyboard,ColumnResizer,DijitRegistry,AppBase], {
		"baseClass": "App Assembly",
		templateString: Template,
		applicationName: "Assembly",
		constructor: function(){
            		this.libraryData = [
				{ first: 'Bob', last: 'Barker', age: 89 },
				{ first: 'Vanna', last: 'White', age: 55 },
				{ first: 'Pat', last: 'Sajak', age: 65 }
			];
		},
                startup: function(){
                        if (this._started) { return; }
                        this.inherited(arguments);


			this.libraryGrid = new Grid({
				columns: {'first': 'Libraries in assembly'}
			}, this.gridNode);

			this.libraryGrid.startup();
			this.libraryGrid.renderArray(this.libraryData);
			
			this._started=true;
		}
		
	});
});

