define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/dom-construct', 'dojo/topic',
  'dojo/request', 'dojo/store/Memory',
  'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/IrdSequenceSearch.html',
  './FacetStoreBuilder', './HostGroups', './TextInputEncoder',
  '../../auth/authHeaders', '../../util/irdSequenceQuery',
  'dijit/form/FilteringSelect', 'dijit/form/TextBox', 'dijit/form/ValidationTextBox', './MultiValueSelect'
], function (
  declare, lang, on, domConstruct, Topic,
  request, Memory,
  WidgetBase, Templated, WidgetsInTemplate,
  template,
  storeBuilder, hostGroupStore, TextInputEncoder,
  authHeader, irdSequenceQuery
) {

  /**
   * The IRD-style influenza sequence search (Option C, Phase 1b), served at
   * /ird/search/sequences behind enableIrdSearch.
   *
   * A form only: it turns the fields into state for util/irdSequenceQuery and
   * opens the matching BV-BRC list view. Deliberately separate from
   * InfluenzaSearch (decision D3), though it reuses the same pick-list
   * building blocks (FacetStoreBuilder, HostGroups, MultiValueSelect).
   */

  var SEGMENTS = irdSequenceQuery.SEGMENTS;

  var RESULT_VIEW = {
    strain: { base: '/view/GenomeList/?', hash: '#view_tab=genomes' },
    segment: { base: '/view/SequenceList/?', hash: '#view_tab=sequences' },
    protein: { base: '/view/FeatureList/?', hash: '#view_tab=features' }
  };

  // Pick lists are scoped by lineage, not by exact taxon ID. Reorganized
  // genomes are often assigned strain-level taxa: on alpha an exact-ID scope
  // covers 234,840 of 360,452 Influenza A genomes and lists 118 countries of
  // 168. (InfluenzaSearch scopes by exact ID.)
  function lineageCondition(types) {
    var ids = types.map(function (t) { return irdSequenceQuery.FLU_TAXON_IDS[t]; });
    return 'taxon_lineage_ids:(' + ids.join(' OR ') + ')';
  }

  var ALL_TYPES = ['A', 'B', 'C', 'D'];

  function range(n, prefix) {
    var out = [];
    for (var i = 1; i <= n; i++) out.push({ id: String(i), name: prefix + i });
    return out;
  }

  function textValue(widget) {
    var v = widget && widget.get('value');
    return typeof v === 'string' ? v.trim() : v;
  }

  return declare([WidgetBase, Templated, WidgetsInTemplate], {
    templateString: template,
    baseClass: 'IrdSequenceSearch',
    pageTitle: 'Search Sequences | Influenza Research Database',

    postCreate: function () {
      this.inherited(arguments);
      window.document.title = this.pageTitle;

      this._buildSegmentRows();

      this.haSubtypeNode.set('store', new Memory({ data: range(18, 'H') }));
      this.naSubtypeNode.set('store', new Memory({ data: range(11, 'N') }));
      this.hostGroupNode.set('store', hostGroupStore);

      var flu = lineageCondition(ALL_TYPES);
      var fluA = lineageCondition(['A']);
      var fluB = lineageCondition(['B']);
      [
        ['genome', 'subtype', 'fullSubtypeNode', fluA],
        ['genome', 'subtype', 'fluBLineageNode', fluB],
        ['genome', 'h5_clade', 'h5CladeNode', fluA],
        ['genome', 'h1_clade_global', 'h1CladeGlobalNode', fluA],
        ['genome', 'h1_clade_us', 'h1CladeUsNode', fluA],
        ['genome', 'h3_clade', 'h3CladeNode', fluA],
        ['genome', 'subclade', 'subcladeNode', fluA],
        ['genome', 'geographic_group', 'geographicGroupNode', flu],
        ['genome', 'state_province', 'stateProvinceNode', flu],
        ['genome', 'season', 'seasonNode', flu],
        ['genome', 'isolation_source', 'isolationSourceNode', flu],
        ['genome', 'passage', 'passageNode', flu],
        // Protein records have no lineage field; gene symbols are the same
        // across influenza, so the CDS/peptide scope is enough.
        ['genome_feature', 'gene', 'genesNode', '(feature_type:CDS OR feature_type:mat_peptide) AND taxon_id:(11320 OR 2955291 OR 11520 OR 2955465)']
      ].forEach(lang.hitch(this, function (b) {
        this._bindFacet(b[0], b[1], b[2], b[3]);
      }));

      this.own(this.hostGroupNode.on('change', lang.hitch(this, '_updateHostOptions')));
      this._updateHostOptions();
      this.own(this.geographicGroupNode.on('change', lang.hitch(this, '_updateCountryOptions')));
      this._updateCountryOptions();

      [this.grainSegmentNode, this.grainProteinNode, this.grainStrainNode].forEach(lang.hitch(this, function (node) {
        this.own(on(node, 'change', lang.hitch(this, '_syncGrain')));
      }));
      this._syncGrain();
    },

    _buildSegmentRows: function () {
      this._segmentInputs = {};
      SEGMENTS.forEach(lang.hitch(this, function (seg) {
        var tr = domConstruct.create('tr', null, this.segmentRowsNode);
        var check = domConstruct.create('input', { type: 'checkbox', value: seg }, domConstruct.create('td', null, tr));
        domConstruct.create('td', { textContent: seg }, tr);
        var from = domConstruct.create('input', {
          type: 'number', min: 0, 'class': 'ird-seg-input', 'aria-label': seg + ' length from'
        }, domConstruct.create('td', { 'class': 'ird-seg-length' }, tr));
        var to = domConstruct.create('input', {
          type: 'number', min: 0, 'class': 'ird-seg-input', 'aria-label': seg + ' length to'
        }, domConstruct.create('td', { 'class': 'ird-seg-length' }, tr));
        this._segmentInputs[seg] = { check: check, from: from, to: to };
      }));
    },

    _bindFacet: function (core, field, nodeName, condition) {
      storeBuilder(core, field, condition).then(lang.hitch(this, function (store) {
        if (!this._destroyed) this[nodeName].set('store', store);
      }), function (error) {
        console.error('IRD search: unable to load options for ' + field, error);
      });
    },

    // Hosts follow the host group, as in InfluenzaSearch.
    _updateHostOptions: function () {
      var group = textValue(this.hostGroupNode) || '';
      var requestId = this._hostRequestId = (this._hostRequestId || 0) + 1;
      var condition = 'in(taxon_lineage_ids,(' + ALL_TYPES.map(function (t) { return irdSequenceQuery.FLU_TAXON_IDS[t]; }).join(',') + '))';
      if (group) {
        condition += '&eq(host_group,' + TextInputEncoder('"' + group.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"') + ')';
      }
      this.hostNameNode.set('value', []);
      this.hostNameNode.set('store', new Memory({ data: [] }));
      var url = window.App.dataServiceURL.replace(/\/$/, '') + '/genome/?' + condition
        + '&limit(0)&facet((field,host_common_name),(mincount,1),(limit,-1))&json(nl,map)';
      request.get(url, {
        handleAs: 'json',
        headers: { Accept: 'application/solr+json', 'X-Requested-With': null, Authorization: authHeader() }
      }).then(lang.hitch(this, function (response) {
        if (this._destroyed || requestId !== this._hostRequestId) return;
        var counts = (response.facet_counts && response.facet_counts.facet_fields.host_common_name) || {};
        this.hostNameNode.set('store', new Memory({
          data: Object.keys(counts).filter(Boolean).map(function (h) { return { id: h, name: h }; })
        }));
      }), function (error) {
        console.error('IRD search: unable to load hosts', error);
      });
    },

    // Countries follow the geographic grouping.
    _updateCountryOptions: function () {
      var region = textValue(this.geographicGroupNode) || '';
      var requestId = this._countryRequestId = (this._countryRequestId || 0) + 1;
      var condition = lineageCondition(ALL_TYPES);
      if (region) condition += ' AND geographic_group:"' + region.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
      this.countryNode.set('value', []);
      this.countryNode.set('store', new Memory({ data: [] }));
      storeBuilder('genome', 'isolation_country', condition).then(lang.hitch(this, function (store) {
        if (!this._destroyed && requestId === this._countryRequestId) this.countryNode.set('store', store);
      }), function (error) {
        console.error('IRD search: unable to load countries', error);
      });
    },

    _grain: function () {
      if (this.grainProteinNode.checked) return 'protein';
      if (this.grainStrainNode.checked) return 'strain';
      return 'segment';
    },

    /** Show only the controls that apply to the chosen result type. */
    _syncGrain: function () {
      var grain = this._grain();
      this.proteinBox.style.display = grain === 'protein' ? '' : 'none';
      // Protein records have no segment field; proteins are chosen by gene.
      this.segmentBox.style.display = grain === 'protein' ? 'none' : '';
      this.segmentSetCompleteLabel.style.display = grain === 'strain' ? '' : 'none';
      // Per-segment lengths apply to segment records only.
      var showLengths = grain === 'segment';
      Array.prototype.forEach.call(this.segmentBox.querySelectorAll('.ird-seg-length'), function (cell) {
        cell.style.display = showLengths ? '' : 'none';
      });
    },

    _virusTypes: function () {
      return [this.typeANode, this.typeBNode, this.typeCNode, this.typeDNode]
        .filter(function (n) { return n.checked; })
        .map(function (n) { return n.value; });
    },

    /** The form, as state for irdSequenceQuery. */
    getState: function () {
      var grain = this._grain();
      var segments = [];
      var segmentLengths = {};
      SEGMENTS.forEach(lang.hitch(this, function (seg) {
        var row = this._segmentInputs[seg];
        if (row.check.checked) segments.push(seg);
        if (row.from.value || row.to.value) segmentLengths[seg] = { from: row.from.value, to: row.to.value };
      }));

      return {
        grain: grain,
        virusTypes: this._virusTypes(),
        segments: grain === 'protein' ? [] : segments,
        segmentLengths: grain === 'segment' ? segmentLengths : {},
        segmentSetComplete: grain === 'strain' && this.segmentSetCompleteNode.checked,
        sequenceComplete: grain !== 'protein' && this.sequenceCompleteNode.checked,
        genes: grain === 'protein' ? this.genesNode.get('value') : [],
        product: grain === 'protein' ? textValue(this.productNode) : '',
        annotation: this.annotationNode.value,
        fullSubtype: this.fullSubtypeNode.get('value'),
        haSubtype: this.haSubtypeNode.get('value'),
        naSubtype: this.naSubtypeNode.get('value'),
        fluBLineage: this.fluBLineageNode.get('value'),
        h5Clade: textValue(this.h5CladeNode),
        h1CladeGlobal: textValue(this.h1CladeGlobalNode),
        h1CladeUs: textValue(this.h1CladeUsNode),
        h3Clade: textValue(this.h3CladeNode),
        subclade: textValue(this.subcladeNode),
        ph1n1Like: this.ph1n1LikeNode.value,
        hostGroup: textValue(this.hostGroupNode),
        hostName: this.hostNameNode.get('value'),
        hostGender: this.hostGenderNode.value,
        hostHealth: textValue(this.hostHealthNode),
        geographicGroup: textValue(this.geographicGroupNode),
        country: this.countryNode.get('value'),
        stateProvince: textValue(this.stateProvinceNode),
        collectionYear: { from: textValue(this.collectionYearFromNode), to: textValue(this.collectionYearToNode) },
        collectionDate: { from: textValue(this.collectionDateFromNode), to: textValue(this.collectionDateToNode) },
        fullCollectionDate: this.fullCollectionDateNode.checked,
        season: textValue(this.seasonNode),
        submissionDate: { from: textValue(this.submissionDateFromNode), to: textValue(this.submissionDateToNode) },
        strainName: textValue(this.strainNameNode),
        accessions: this.accessionsNode.value,
        bioproject: textValue(this.bioprojectNode),
        isolationSource: textValue(this.isolationSourceNode),
        passage: textValue(this.passageNode),
        keyword: textValue(this.keywordNode),
        excludeDeprecated: this.excludeDeprecatedNode.checked
      };
    },

    _showMessage: function (text) {
      this.messageNode.textContent = text || '';
      this.messageNode.style.display = text ? '' : 'none';
    },

    _post: function (collection, query) {
      return request.post(window.App.dataServiceURL.replace(/\/$/, '') + '/' + collection + '/', {
        data: query,
        handleAs: 'json',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: authHeader()
        }
      });
    },

    /** Genome IDs for a strain search by accession (see accessionLookup). */
    _resolveAccessions: function (state) {
      var lookup = irdSequenceQuery.accessionLookup(state);
      if (!lookup) return Promise.resolve(state);
      return Promise.resolve(this._post(lookup.collection, lookup.query)).then(function (rows) {
        var ids = (rows || []).map(function (r) { return r.genome_id; })
          .filter(function (id, i, all) { return id && all.indexOf(id) === i; });
        if (!ids.length) throw new Error('No genomes contain those accessions.');
        return lang.mixin({}, state, { genomeIds: ids });
      });
    },

    /**
     * Count before navigating. A refused query (the API's 150,000-genome join
     * limit) or an empty one is reported here, on the form, instead of opening
     * a grid that looks like "no data".
     */
    _preflight: function (built) {
      var req = this._post(built.collection, built.query + '&limit(1)');
      return Promise.resolve(req.response).then(function (response) {
        var range = response.getHeader('Content-Range') || '';
        return parseInt(range.split('/')[1]);
      }, function (err) {
        var data = err && err.response && err.response.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (e) { data = null; }
        }
        if (data && data.error === 'join_too_broad') {
          throw new Error('This search matches ' + Number(data.genomeCount).toLocaleString()
            + ' genomes, more than can be searched at once. Narrow it with a subtype, host, place or date.');
        }
        throw new Error((data && data.message) || 'The search could not be run. Please try again.');
      });
    },

    onSubmit: function (evt) {
      if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
      }
      this._showMessage('');
      var invalid = [
        this.collectionYearFromNode, this.collectionYearToNode, this.collectionDateFromNode,
        this.collectionDateToNode, this.submissionDateFromNode, this.submissionDateToNode
      ].filter(function (w) { return textValue(w) && !w.isValid(); });
      if (invalid.length) {
        // A mistyped date would otherwise be dropped and the search widened.
        invalid[0].focus();
        this._showMessage('Check the highlighted date: ' + invalid[0].get('invalidMessage') + '.');
        return Promise.resolve();
      }
      var state = this.getState();
      if (!state.virusTypes.length) {
        this._showMessage('Choose at least one virus type.');
        return Promise.resolve();
      }
      this.submitNode.disabled = true;
      return this._resolveAccessions(state).then(lang.hitch(this, function (resolved) {
        var built = irdSequenceQuery.buildQuery(resolved);
        return this._preflight(built).then(function (count) {
          if (count === 0) throw new Error('No records match this search.');
          var view = RESULT_VIEW[resolved.grain];
          Topic.publish('/navigate', { href: view.base + built.query + view.hash });
        });
      })).then(null, lang.hitch(this, function (err) {
        this._showMessage(err.message);
      })).then(lang.hitch(this, function () {
        this.submitNode.disabled = false;
      }));
    },

    onReset: function () {
      this.containerNode.reset();
      [
        'genesNode', 'fullSubtypeNode', 'haSubtypeNode', 'naSubtypeNode', 'fluBLineageNode',
        'hostNameNode', 'countryNode'
      ].forEach(lang.hitch(this, function (n) { this[n].set('value', []); }));
      [
        'productNode', 'h5CladeNode', 'h1CladeGlobalNode', 'h1CladeUsNode', 'h3CladeNode', 'subcladeNode',
        'hostGroupNode', 'hostHealthNode', 'geographicGroupNode', 'stateProvinceNode',
        'collectionYearFromNode', 'collectionYearToNode', 'collectionDateFromNode', 'collectionDateToNode',
        'seasonNode', 'submissionDateFromNode', 'submissionDateToNode', 'strainNameNode', 'bioprojectNode',
        'isolationSourceNode', 'passageNode', 'keywordNode'
      ].forEach(lang.hitch(this, function (n) { this[n].set('value', ''); }));
      this._showMessage('');
      this._syncGrain();
    }
  });
});
