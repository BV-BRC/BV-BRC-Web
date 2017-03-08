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
			var url = "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=" + data['pubchem_cid'] + "&t=l";

			domConstruct.empty(this.structureNode);
			domConstruct.create("img", {"src": url}, this.structureNode, "first");

			// smiles
			// domConstruct.create("h5", {innerHTML: "Canonical smiles"}, this.structureNode);
			// domConstruct.create("span", {innerHTML: data['canonical_smiles']}, this.structureNode);
			// domConstruct.create("h5", {innerHTML: "Isomeric smiles"}, this.structureNode);
			// domConstruct.create("span", {innerHTML: data['isomeric_smiles']}, this.structureNode);
		},

		_setDescriptionAttr: function(data){

			domConstruct.empty(this.descNode);

			data.forEach(function(row){
				domConstruct.create("div", {"class": "far2x", innerHTML: row}, this.descNode);
			}, this);
		},

		_setMechanismAttr: function(data){

			domConstruct.empty(this.moaNode);

			data.forEach(function(row){
				domConstruct.create("div", {"class": "far2x", innerHTML: row}, this.moaNode);
			}, this);
		},

		_setPharmacologyAttr: function(data){

			domConstruct.empty(this.pharmacologyNode);

			data['pharmacology'].forEach(function(row){
				domConstruct.create("div", {"class": "far2x", innerHTML: row}, this.pharmacologyNode);
			}, this);

			domConstruct.create("h5", {innerHTML: "Pharmacological Classes"}, this.pharmacologyNode)
			data['pharmacological_classes'].forEach(function(row){
				domConstruct.create("div", {"class": "close", innerHTML: row}, this.pharmacologyNode);
			}, this);
		},

		getAntibioticData: function(query){
			xhr.get(PathJoin(this.apiServiceUrl, "antibiotics", "?" + query), xhrOption)
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
						atc_classification: d['atc_classification']
					});

					this.set('antibioticSummary', summary);

					this.set('description', d['description']);
					this.set('mechanism', d['mechanism_of_action']);
					this.set('pharmacology', d);

				}))
		}
	})
});