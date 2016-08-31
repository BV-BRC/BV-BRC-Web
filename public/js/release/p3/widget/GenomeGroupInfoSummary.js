define("p3/widget/GenomeGroupInfoSummary", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/dom-class", "dojo/dom-construct", "dojo/on", "dojo/request", "dojo/when",
	"./SummaryWidget", "../WorkspaceManager"

], function(declare, lang,
			domClass, domConstruct, on, xhr, when,
			SummaryWidget, WorkspaceManager){

	return declare([SummaryWidget], {
		dataModel: "",
		query: "",
		baseQuery: "",
		view: "table",
		templateString: '<div class="SummaryWidget"><div data-dojo-attach-point="containerNode"><div class="tableNode" data-dojo-attach-point="tableNode"></div></div></div>',
		columns: [],
		_setStateAttr: function(state){

			var self = this;
			when(WorkspaceManager.getObject(state.ws_path, true), function(data){
				self.set('groupInfo', data);
			})
		},

		_setGroupInfoAttr: function(data){

			domConstruct.empty(this.tableNode);

			var table = domConstruct.create("table", {"class": "p3basic"}, this.tableNode);

			var tr = domConstruct.create("tr", {}, table);
			domConstruct.create("td", {innerHTML: "Name"}, tr);
			domConstruct.create("td", {innerHTML: data.name}, tr);

			tr = domConstruct.create("tr", {}, table);
			domConstruct.create("td", {innerHTML: "Owner"}, tr);
			domConstruct.create("td", {innerHTML: data.owner_id}, tr);

			tr = domConstruct.create("tr", {}, table);
			domConstruct.create("td", {innerHTML: "Members"}, tr);
			domConstruct.create("td", {innerHTML: data.autoMeta.item_count}, tr);

			tr = domConstruct.create("tr", {}, table);
			domConstruct.create("td", {innerHTML: "Created"}, tr);
			domConstruct.create("td", {innerHTML: data.creation_time}, tr);

		},

		onSetQuery: function(attr, oldVal, query){
			// block default action
		},

		processData: function(res){
		},

		render_chart: function(){
		},

		render_table: function(){
		}
	})
});
