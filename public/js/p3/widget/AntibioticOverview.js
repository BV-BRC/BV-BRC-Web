define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/request', 'dojo/dom-construct', 'dojo/dom-class', 'dojo/text!./templates/AntibioticOverview.html',
  'dijit/_WidgetBase', 'dijit/_Templated',
  '../util/PathJoin', './DataItemFormatter', './ExternalItemFormatter'
], function (
  declare, lang,
  xhr, domConstruct, domClass, Template,
  WidgetBase, Templated,
  PathJoin, DataItemFormatter, ExternalItemFormatter
) {

  var xhrOption = {
    handleAs: 'json',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
      'X-Requested-With': null
    }
  };

  return declare([WidgetBase, Templated], {
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    query: null,
    _setStateAttr: function (state) {
      this._set('state', state);
      // console.log("state:", state);

      if (this.query == state.search) {
        return;
      }
      this.query = state.search;


      var antibioticName = state.search.split(',')[1].split(')')[0];
      this.set('publications', antibioticName + '+resistance+pathogen');

      this.getAntibioticData(state.search);
    },

    _setAntibioticSummaryAttr: function (data) {
      domConstruct.empty(this.antibioticSummaryNode);

      domConstruct.place(DataItemFormatter(data, 'antibiotic_data', {}), this.antibioticSummaryNode, 'first');

      // display 2D structure
      // https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=33613&t=l
      var url = 'https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=' + data.pubchem_cid + '&t=l';

      domConstruct.empty(this.structureNode);
      domConstruct.create('img', { src: url }, this.structureNode, 'first');

      // var sdfUrl = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + data['pubchem_cid'] + "/record/SDF/?record_type=3d&response_type=display";

      // xhr.post(sdfUrl, {'X-Requested-With': null})
      //  .then(function(data){
      //   console.log(data);
      //   $3Dmol.viewers.addAsOneMolecule(data, "sdf");
      //   $3Dmol.viewers.zoomTo();
      //   $3Dmol.viewers.render();
      //  });

      // smiles
      // domConstruct.create("h5", {innerHTML: "Canonical smiles"}, this.structureNode);
      // domConstruct.create("span", {innerHTML: data['canonical_smiles']}, this.structureNode);
      // domConstruct.create("h5", {innerHTML: "Isomeric smiles"}, this.structureNode);
      // domConstruct.create("span", {innerHTML: data['isomeric_smiles']}, this.structureNode);
    },

    _setDescriptionAttr: function (data) {

      // section visible
      domClass.remove(this.descNode.parentNode, 'hidden');

      domConstruct.empty(this.descNode);

      data.forEach(function (row) {
        domConstruct.create('div', { 'class': 'far2x', innerHTML: row }, this.descNode);
      }, this);
    },

    _setMechanismAttr: function (data) {

      // section visible
      domClass.remove(this.moaNode.parentNode, 'hidden');

      domConstruct.empty(this.moaNode);

      data.forEach(function (row) {
        domConstruct.create('div', { 'class': 'far2x', innerHTML: row }, this.moaNode);
      }, this);
    },

    _setPharmacologyAttr: function (data) {

      // section visible
      domClass.remove(this.pharmacologyNode.parentNode, 'hidden');

      domConstruct.empty(this.pharmacologyNode);

      data.pharmacology.forEach(function (row) {
        domConstruct.create('div', { 'class': 'far2x', innerHTML: row }, this.pharmacologyNode);
      }, this);

      if (Object.prototype.hasOwnProperty.call(data, 'pharmacological_classes')) {
        domConstruct.create('h5', { 'class': 'close2x', innerHTML: 'Pharmacological Classes' }, this.pharmacologyNode);
        data.pharmacological_classes.forEach(function (row) {
          domConstruct.create('div', { 'class': 'close', innerHTML: row }, this.pharmacologyNode);
        }, this);
      }
    },

    _setSynonymsAttr: function (data) {

      // section visible
      domClass.remove(this.synonymsNode.parentNode, 'hidden');

      domConstruct.empty(this.synonymsNode);

      data.forEach(function (row) {
        domConstruct.create('div', { 'class': 'keyword medium', innerHTML: row }, this.synonymsNode);
      }, this);
    },

    _setPublicationsAttr: function (keyword) {
      domConstruct.empty(this.pubmedSummaryNode);

      domConstruct.place(ExternalItemFormatter(keyword, 'pubmed_data', {}), this.pubmedSummaryNode, 'first');
    },

    getAntibioticData: function (query) {
      xhr.get(PathJoin(this.apiServiceUrl, 'antibiotics', '?' + query), xhrOption)
        .then(lang.hitch(this, function (data) {

          if (data.length === 0) {
            domConstruct.empty(this.antibioticSummaryNode);
            domConstruct.create('h2', { innerHTML: 'No summary data available.' }, this.antibioticSummaryNode, 'first');

            domConstruct.empty(this.structureNode);
            return;
          }

          var d = data[0];
          var summary = lang.mixin({}, {
            pubchem_cid: d.pubchem_cid,
            cas_id: d.cas_id,
            antibiotic_name: d.antibiotic_name,
            molecular_formula: d.molecular_formula,
            molecular_weight: d.molecular_weight,
            inchi_key: d.inchi_key,
            // canonical_smiles: d['canonical_smiles'],
            // isomeric_smiles: d['isomeric_smiles'],
            atc_classification: d.atc_classification
          });

          this.set('antibioticSummary', summary);

          if (Object.prototype.hasOwnProperty.call(d, 'description')) {
            this.set('description', d.description);
          }
          if (Object.prototype.hasOwnProperty.call(d, 'mechanism_of_action')) {
            this.set('mechanism', d.mechanism_of_action);
          }
          if (Object.prototype.hasOwnProperty.call(d, 'pharmacology')) {
            this.set('pharmacology', d);
          }
          if (Object.prototype.hasOwnProperty.call(d, 'synonyms')) {
            this.set('synonyms', d.synonyms);
          }
        }));
    }
  });
});
