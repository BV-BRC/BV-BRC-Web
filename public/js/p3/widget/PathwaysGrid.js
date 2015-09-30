define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"dojo/_base/xhr", "dojo/_base/lang", "./PageGrid", "./formatter", "dojo/store/JsonRest", "dojo/store/util/QueryResults", "dojo/request"
], function(declare, BorderContainer, on,
			domClass, ContentPane, domConstruct,
			xhr, lang, Grid, formatter, Store, QueryResults, request) {
	return declare([Grid], {
		region: "center",
		query: (this.query || ""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataAPI,
		store: null,
		dataModel: "pathway",
		primaryKey: "id",
		deselectOnRefresh: true,
		columns: {
			pathway_id: {label: 'Pathway ID', field: 'pathway_id'},
			pathway_name: {label: 'Pathway Name', field: 'pathway_name'},
			pathway_class: {label: 'Pathway Class', field: 'pathway_class'},
			annotation: {label: 'Annotation', field: 'annotation'},
			genome_count: {label: 'Unique Genome Count', field: 'genome_count'},
			gene_count: {label: 'Unique Gene Count', field: 'gene_count'},
			ec_count: {label: 'Unique EC Count', field: 'ec_count'},
			ec_cons: {label: 'EC Conservation', field: 'ec_cons'},
			gene_cons: {label: 'Gene Conservation', field: 'gene_cons'}
		},
		startup: function() {
			var _self = this;

			this.on(".dgrid-content .dgrid-row:dblclick", function(evt) {
				var row = _self.row(evt);
				//console.log("dblclick row:", row);
				on.emit(_self.domNode, "ItemDblClick", {
					item_path: row.data.path,
					item: row.data,
					bubbles: true,
					cancelable: true
				});
				console.log('after emit');
			});

			this.on("dgrid-select", function(evt) {
				//console.log('dgrid-select: ', evt);
				var newEvt = {
					rows: evt.rows,
					selected: evt.grid.selection,
					grid: _self,
					bubbles: true,
					cancelable: true
				};
				on.emit(_self.domNode, "select", newEvt);
			});

			this.on("dgrid-deselect", function(evt) {
				//console.log("dgrid-deselect");
				var newEvt = {
					rows: evt.rows,
					selected: evt.grid.selection,
					grid: _self,
					bubbles: true,
					cancelable: true
				};
				on.emit(_self.domNode, "deselect", newEvt);
			});

			this.inherited(arguments);
			this.refresh();
		},
		createStore: function(dataModel, pk, token) {
			var self = this;
			console.log("Create Store for ", dataModel, " at ", this.apiServer, " TOKEN: ", token);
			var store = new Store({
				target: (this.apiServer ? (this.apiServer) : "") + "/" + dataModel + "/",
				idProperty: pk,
				headers: {
					'Accept': "application/solr+json",
					'Content-Type': "application/solrquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': token ? token : (window.App.authorizationToken || "")
				}
			});
			store.query = function(query, options) {
				// execute original query method
				var results = Store.prototype.query.call(this, query, options);

				// customize data structure
				var newResults = results.then(function(response) {
					var pathwayIdList = [];
					response.facets.stat.buckets.forEach(function(element) {
						pathwayIdList.push(element.val);
					});
					// sub query
					var pathwayRefHash = {};
					request.post(self.apiServer + '/pathway_ref/', {
						handleAs: 'json',
						headers: {
							'Accept': "application/solr+json",
							'Content-Type': "application/solrquery+x-www-form-urlencoded",
							'X-Requested-With': null,
							'Authorization': token ? token : (window.App.authorizationToken || "")
						},
						sync: true,
						data: {
							q: 'pathway_id:(' + pathwayIdList.join(' OR ') + ')',
							rows: 1000000
						}
					}).then(function(res) {
						res.response.docs.forEach(function(el) {
							if(pathwayRefHash[el.pathway_id] == null){
								pathwayRefHash[el.pathway_id] = {
									pathway_name: el.pathway_name,
									pathway_class: el.pathway_class
								};
							}
						});
					});
					//console.log(pathwayRefHash);
					var data = [];
					response.facets.stat.buckets.forEach(function(element) {
						var ec_cons = 0, gene_cons = 0;
						if(element.genome_count > 0 && element.ec_count > 0){
							ec_cons = element.genome_ec / element.genome_count / element.ec_count * 100;
							gene_cons = element.gene_count / element.genome_count / element.ec_count;
						}
						var el = {pathway_id: element.val, ec_cons: ec_cons, gene_cons: gene_cons};
						el.pathway_name = pathwayRefHash[element.val].pathway_name;
						el.pathway_class = pathwayRefHash[element.val].pathway_class;
						//el.annotation = self.params.annotation;
						delete element.val;
						data.push(lang.mixin(el, element));
					});
					//console.log(data);
					return data;
				});
				return QueryResults(newResults);
			};
			return store;
		}
	});
});
