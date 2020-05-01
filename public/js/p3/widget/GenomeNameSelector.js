define([
  'dijit/form/FilteringSelect', 'dojo/_base/declare',
  'dojo/store/JsonRest', 'dojo/dom-construct', 'dijit/TooltipDialog',
  'dojo/on', 'dijit/popup', 'dojo/_base/lang', 'dojo/dom-construct',
  'dijit/form/CheckBox', 'dojo/string', 'dojo/when', 'dijit/form/_AutoCompleterMixin',
  '../util/PathJoin', 'dojo/request', 'dojo/store/Memory'
], function (
  FilteringSelect, declare,
  Store, domConstr, TooltipDialog,
  on, popup, lang, domConstr, Checkbox,
  string, when, AutoCompleterMixin,
  PathJoin, request, Memory
) {

  return declare([FilteringSelect, AutoCompleterMixin], {
    apiServiceUrl: window.App.dataServiceURL,
    promptMessage: 'Genome name.',
    missingMessage: 'Specify genome name.',
    placeHolder: 'e.g. Mycobacterium tuberculosis H37Rv',
    searchAttr: 'genome_name',
    extraSearch: ['genome_id'],
    queryExpr: '*${0}*',
    queryFilter: '',
    resultFields: ['genome_id', 'genome_name', 'strain', 'public', 'owner', 'reference_genome', 'taxon_id'],
    includePrivate: true,
    includeOtherPublic: true,
    referenceOnly: true,
    ncbiHost: true,
    representativeOnly: true,
    pageSize: 25,
    highlightMatch: 'all',
    autoComplete: false,
    store: null,
    hostStore: null,
    labelType: 'html',
    constructor: function () {
      var _self = this;

      this.apiStore = new Store({
        target: PathJoin(this.apiServiceUrl, 'genome') + '/',
        idProperty: 'genome_id',
        headers: { accept: 'application/json', Authorization: (window.App.authorizationToken || '') }
      });
      // Fancy footwork for modified api query
      var api_query = this.apiStore.query;
      this.apiStore.query = lang.hitch(this.apiStore, function (query, options) {
        // console.log("query: ", query);
        // console.log("Store Headers: ", _self.store.headers);
        var q = '';
        var searchAttrStripped = '';

        if (query[_self.searchAttr] && query[_self.searchAttr] != '') {

          // strip the non-alphanumeric characters from the query string
          searchAttrStripped = '*'.concat(query[_self.searchAttr].toString().replace(/[`~!@#$%^&*()_|+\-=?;:'",<>\s]/g, ''), '*');
          // unfooling the highlighting `~!@#$%^&*()_|+\-=?;:'",<>\s]/g, ''), '*');

          if (_self.extraSearch) {
            var components = ['eq(' + _self.searchAttr + ',' + searchAttrStripped + ')'];
            _self.extraSearch.forEach(lang.hitch(this, function (attr) {
              components.push('eq(' + attr, searchAttrStripped + ')');
            }));
            q = '?or(' + components.join(',') + ')';
          }
          else {
            q = '?eq(' + _self.searchAttr + ',' + searchAttrStripped + ')';
          }
        }
        else {
          return [];
        }
        if (_self.queryFilter) {
          q += _self.queryFilter;
        }

        if (_self.resultFields && _self.resultFields.length > 0) {
          q += '&select(' + _self.resultFields.join(',') + ')';
        }
        // console.log("Q: ", q);
        return api_query.apply(_self.store, [q, options]);
      });


      if (_self.ncbiHost) {

        request.get(PathJoin(_self.apiServiceUrl, 'content', 'host/patric_host_summary.json'), {
          headers: { accept: 'application/json' },
          handleAs: 'json'
        }).then(lang.hitch(_self, function (hostDat) {
          _self.hostInfo = new Memory({ data: hostDat.genomes, idProperty: 'species_taxid' });
          console.log('Set host memory store');
        }), lang.hitch(_self, function (err) {
          console.log('Error retreiving host info ', err);
        }));
      }
      if (!this.store) {
        this.store = this.apiStore;
      }

      // var conditionList = this.conditionStore.query({ id: query_id });
      // this.conditionStore.put(record);
      // var lrec = { count: 0, type: 'condition' }; // initialized to the number of libraries assigned


    },

    _setIncludeOtherPublicAttr: function (val) {
      this.includeOtherPublic = val;
      this._setQueryFilter();
    },

    _setIncludePrivateAttr: function (val) {
      this.includePrivate = val;
      this._setQueryFilter();
    },

    _setReferenceOnlyAttr: function (val) {
      this.referenceOnly = val;
      this._setQueryFilter();
    },

    _setRepresentativeOnlyAttr: function (val) {
      this.representativeOnly = val;
      this._setQueryFilter();
    },

    _setQueryFilter: function () {
      var queryFilterComponents = [];

      // this block should include all 4 combinations of selection of public
      // and private;
      // will use logic OR for selections

      if (this.includeOtherPublic && this.representativeOnly && this.referenceOnly) {
        queryFilterComponents.push('eq(public,true)');
      }
      else if (this.representativeOnly && this.referenceOnly) {
        queryFilterComponents.push('and(or(eq(reference_genome,%22Reference%22),eq(reference_genome,%22Representative%22)),eq(public,true))');
      }
      else if (this.includeOtherPublic && this.referenceOnly) {
        queryFilterComponents.push('and(not(reference_genome,%22Representative%22),eq(public,true))');
      }
      else if (this.includeOtherPublic && this.representativeOnly) {
        queryFilterComponents.push('and(not(reference_genome,%22Reference%22),eq(public,true))');
      }
      else if (this.referenceOnly) {
        queryFilterComponents.push('and(eq(reference_genome,%22Reference%22),eq(public,true))');
      }
      else if (this.representativeOnly) {
        queryFilterComponents.push('and(eq(reference_genome,%22Representative%22),eq(public,true))');
      }
      else if (this.includeOtherPublic) {
        queryFilterComponents.push('and(not(reference_genome,%22Reference%22),not(reference_genome,%22Representative%22), eq(public,true))');
      }

      if (this.includePrivate) {
        queryFilterComponents.push('eq(public,false)');
      }

      // if the user accidentally unchecks everything, we'll provide all genomes

      // assemble the query filter
      if (queryFilterComponents.length == 0) {
        this.queryFilter = '';
      } else if (queryFilterComponents.length == 1) {
        this.queryFilter = queryFilterComponents.join('');
      } else {
        this.queryFilter = '&or(' + queryFilterComponents.join(',') + ')';
      }

      // console.log("Query Filter set to: " + this.queryFilter);
    },
    onChange: function () {
      var tax_id = this.item.taxon_id;
      if (tax_id in this.hostInfo.index) {
        var ncbi_idx = this.hostInfo.index[tax_id];
        var ncbi_rec = this.hostInfo.data[ncbi_idx];
        this.item.host = true;
        this.item.ftp = ncbi_rec['patric_ftp'];
      }
    },

    postCreate: function () {
      this.inherited(arguments);
      this.filterButton = domConstr.create('i', {
        'class': 'fa icon-filter fa-1x',
        style: { 'float': 'left', 'font-size': '1.2em', margin: '2px' }
      });
      domConstr.place(this.filterButton, this.domNode, 'first');

      // var dfc = '<div>Filter Genomes</div><div class="wsActionTooltip" rel="Public">Public</div><div class="wsActionTooltip" rel="private">My Genomes</div>'
      var dfc = domConstr.create('div');
      domConstr.create('div', { innerHTML: 'Include in Search', style: { 'font-weight': 900 } }, dfc);
      domConstr.create('div', { innerHTML: 'Public Genomes:', style: { 'font-weight': 900 } }, dfc);

      // reference genomes
      var referenceDiv = domConstr.create('div', {});
      domConstr.place(referenceDiv, dfc, 'last');
      var referenceCB = new Checkbox({ checked: true, style: { 'margin-left': '10px' } });
      referenceCB.on('change', lang.hitch(this, function (val) {
        // console.log("Toggle Reference Genomes to " + val);
        this.set('referenceOnly', val);
      }));
      domConstr.place(referenceCB.domNode, referenceDiv, 'first');
      domConstr.create('span', { innerHTML: 'Reference Genomes' }, referenceDiv);

      // representative genomes
      var representativeDiv = domConstr.create('div', {});
      domConstr.place(representativeDiv, dfc, 'last');
      var representativeCB = new Checkbox({ checked: true, style: { 'margin-left': '10px' } });
      representativeCB.on('change', lang.hitch(this, function (val) {
        // console.log("Toggle Representative Genomes to " + val);
        this.set('representativeOnly', val);
      }));
      domConstr.place(representativeCB.domNode, representativeDiv, 'first');
      domConstr.create('span', { innerHTML: 'Representative Genomes' }, representativeDiv);

      // Other public genomes
      var otherPublicDiv = domConstr.create('div', {});
      domConstr.place(otherPublicDiv, dfc, 'last');

      var otherPublicCB = new Checkbox({ checked: true, style: { 'margin-left': '10px' } });
      otherPublicCB.on('change', lang.hitch(this, function (val) {
        // console.log("Toggle Other Public Genomes to " + val);
        this.set('includeOtherPublic', val);
      }));
      domConstr.place(otherPublicCB.domNode, otherPublicDiv, 'first');
      domConstr.create('span', { innerHTML: 'All Other Public Genomes' }, otherPublicDiv);

      // private genomes
      domConstr.create('div', { innerHTML: 'Private Genomes:', style: { 'font-weight': 900 } }, dfc);
      var privateDiv = domConstr.create('div', {});
      domConstr.place(privateDiv, dfc, 'last');

      var privateCB = new Checkbox({ checked: true, style: { 'margin-left': '10px' } });
      privateCB.on('change', lang.hitch(this, function (val) {
        // console.log("Toggle Private Genomes to " + val);
        this.set('includePrivate', val);
      }));
      domConstr.place(privateCB.domNode, privateDiv, 'first');
      domConstr.create('span', { innerHTML: 'My Genomes' }, privateDiv);

      var filterTT = new TooltipDialog({
        content: dfc,
        onMouseLeave: function () {
          popup.close(filterTT);
        }
      });

      on(this.filterButton, 'click', lang.hitch(this, function () {
        popup.open({
          popup: filterTT,
          around: this.domNode,
          orient: ['below']
        });
      }));
    },

    /* isValid: function(){
      return (!this.required || this.get('displayedValue') != "");
    }, */
    labelFunc: function (item, store) {
      var label = '';
      if (!item['public'] && (typeof item['public'] != 'undefined')) {
        label += "<i class='fa icon-lock fa-1x' />&nbsp;";
      }
      else {
        label += "<i class='fa fa-1x'> &nbsp; </i>&nbsp;";
      }

      if (item.reference_genome == 'Reference') {
        label += '[Ref] ';
      }

      else if (item.reference_genome == 'Representative') {
        label += '[Rep] ';
      }

      label += item.genome_name;

      var strainAppended = false;
      if (item.strain) {
        strainAppended = (item.genome_name.indexOf(item.strain, item.genome_name.length - item.strain.length) !== -1);
        if (!strainAppended) {
          label += ' ' + item.strain;
          strainAppended = true;
        }
      }
      label += ' [' + item.genome_id + ']';

      return label;
    }

  });
});
