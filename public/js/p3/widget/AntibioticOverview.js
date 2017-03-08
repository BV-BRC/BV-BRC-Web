define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/request", "dojo/dom-construct", "dojo/text!./templates/AntibioticOverview.html",
	"dijit/_WidgetBase", "dijit/_Templated",
	"../util/PathJoin", "./DataItemFormatter"
], function(declare, lang,
			xhr, domConstruct, Template,
			WidgetBase, Templated,
			PathJoin, DataItemFormatter){

	var xhrOption = {
		handleAs: "json",
		headers: {
			'Accept': 'application/json',
			'Content-Type': "application/rqlquery+x-www-form-urlencoded",
			'X-Requested-With': null
		}
	};

	return declare([WidgetBase, Templated], {
		templateString: Template,
		apiServiceUrl: window.App.dataAPI,
		_setStateAttr: function(state){
			this._set("state", state);
			// console.log("state:", state);

			this.getAntibioticData(state.search);
		},

		_setAntibioticSummaryAttr: function(data){
			domConstruct.empty(this.antibioticSummaryNode);

			domConstruct.place(DataItemFormatter(data, "antibiotic_data", {}), this.antibioticSummaryNode, "first");

			// display 2D structure
			// https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=33613&t=l
			/*
			var url = "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=" + data['pubchem_cid'] + "&t=l";
			xhr.get(url, {
				headers: {
					'X-Requested-With': null
				}
			})
				.then(lang.hitch(this, function(img){
					// console.log(data);
					// console.log(this.structureNode.domNode);
					var canvas = domConstruct.create("canvas");
					canvas.width = img.width;
					canvas.height = img.height;
					var ctx = canvas.getContext("2d");
					ctx.drawImage(img, 0, 0);

					domConstruct.place(canvas.domNode, this.structureNode, "first");
				}));
			*/
		},

		_setDescriptionAttr: function(data){

			domConstruct.empty(this.descNode);

			var table = domConstruct.create("table", {"class": "p3basic"}, this.descNode);
			var tbody = domConstruct.create("tbody", {}, table);

			data.forEach(function(row){
				var tr = domConstruct.create('tr', {}, tbody);
				domConstruct.create("td", {innerHTML: row}, tr);
			});
		},

		_setMechanismAttr: function(data){

			domConstruct.empty(this.moaNode);

			var table = domConstruct.create("table", {"class": "p3basic"}, this.moaNode);
			var tbody = domConstruct.create("tbody", {}, table);

			data.forEach(function(row){
				var tr = domConstruct.create('tr', {}, tbody);
				domConstruct.create("td", {innerHTML: row}, tr);
			});
		},

		_setPharmacologyAttr: function(data){

			domConstruct.empty(this.pharmacologyNode);

			var table = domConstruct.create("table", {"class": "p3basic"}, this.pharmacologyNode);
			var tbody = domConstruct.create("tbody", {}, table);

			data.forEach(function(row){
				var tr = domConstruct.create('tr', {}, tbody);
				domConstruct.create("td", {innerHTML: row}, tr);
			});
		},

		getAntibioticData: function(name){
			xhr.get(PathJoin(this.apiServiceUrl, "antibiotics", "?eq(antibiotic_name," + name + ")"), xhrOption)
				.then(lang.hitch(this, function(data){

					var d = data[0];
					var summary = lang.mixin({}, {
						pubchem_cid: d['pubchem_cid'],
						cas_id: d['cas_id'],
						antibiotic_name: d['antibiotic_name'],
						molecular_formula: d['molecular_formula'],
						molecular_weight: d['molecular_weight'],
						inchi_key: d['inchi_key'],
						// canonical_smiles: d['canonical_smiles'],
						// isomeric_smiles: d['isomeric_smiles'],
						mesh_tree: d['mesh_tree']
					});

					this.set('antibioticSummary', summary);

					this.set('description', d['description']);
					this.set('mechanism', d['mechanism_of_action']);
					this.set('pharmacology', d['pharmacology']);

				}))
		}
	})
});