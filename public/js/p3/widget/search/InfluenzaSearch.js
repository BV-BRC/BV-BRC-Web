define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dijit/popup', 'dojo/on', 'dojo/dom', 'dojo/dom-class', 'dojo/query',
  'dojo/store/Memory', 'dijit/Calendar', 'dijit/TooltipDialog', './SearchBase', './TextInputEncoder',
  './FacetStoreBuilder', './HostGroups', 'dojo/text!./templates/InfluenzaSearch.html'
], function (
  declare, lang, popup, on, dom, domClass, query,
  Memory, Calendar, TooltipDialog, SearchBase, TextInputEncoder,
  storeBuilder, hostGroupStore, template
) {

  // Legacy + updated NCBI Taxonomy IDs — both needed for facet store scoping
  var FLU_TAXON_IDS_ALL = {
    A: ['11320', '2955291'],
    B: ['11520', '2955465'],
    C: ['11552', '2955935'],
    D: ['1513237', '2955744']
  };

  // Updated IDs only — used in search queries (last entry of each list)
  var FLU_TAXON_IDS = {
    A: '2955291',
    B: '2955465',
    C: '2955935',
    D: '2955744'
  };

  // Build taxon facet condition strings from the ID maps so all four flu types
  // (and the legacy IDs) stay in lockstep automatically.
  function buildTaxonCondition(types) {
    var parts = [];
    types.forEach(function (t) {
      FLU_TAXON_IDS_ALL[t].forEach(function (id) {
        parts.push('taxon_id:' + id);
      });
    });
    return parts.join(' OR ');
  }

  // HA subtypes: stored as numbers in DB
  var HA_SUBTYPES = [];
  for(var h = 1; h <= 18; h++) {
    HA_SUBTYPES.push({ id: String(h), name: 'H' + h });
  }

  // NA subtypes: stored as numbers in DB
  var NA_SUBTYPES = [];
  for(var n = 1; n <= 11; n++) {
    NA_SUBTYPES.push({ id: String(n), name: 'N' + n });
  }

  // Segment name to number mapping (DB stores numbers 1-8)
  var SEGMENT_NUMBERS = {
    PB2: '1', PB1: '2', PA: '3', HA: '4',
    NP: '5', NA: '6', M: '7', NS: '8'
  };

  // Predefined search presets
  // Keys (except 'label', 'virusType', 'dataType') map to attach points as: key + 'Node'
  // e.g. fullSubtype → this.fullSubtypeNode, h5Clade → this.h5CladeNode
  var PRESETS = [
    {
      id: 'h5n1_2024',
      label: 'H5N1 Outbreak 2024',
      virusType: 'A',
      fullSubtype: 'H5N1',
      collectionDateFrom: '2024-01-01',
      collectionDateTo: '2026-12-31',
      completeGenome: true
    },
    {
      id: 'h5n1_2321e',
      label: 'H5N1 Avian 2.3.2.1e',
      virusType: 'A',
      fullSubtype: 'H5N1',
      hostGroup: 'Avian',
      h5Clade: '2.3.2.1e'
    },
    {
      id: 'h5n1_2344b',
      label: 'H5N1 Human 2.3.4.4b',
      virusType: 'A',
      fullSubtype: 'H5N1',
      hostGroup: 'Human',
      hostName: 'Human',
      h5Clade: '2.3.4.4b'
    }
  ];

  // Reserved keys that are not node mappings
  var PRESET_SPECIAL_KEYS = { id: 1, label: 1, virusType: 1, dataType: 1 };

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\*|\||\[|\]/g, '');
  }

  // Push an eq(field,value) clause if the dijit node has a non-empty value.
  // useEncoder=true wraps the value in TextInputEncoder (for free-text fields).
  function pushEq(arr, field, node, useEncoder) {
    if (!node) return;
    var v = node.get('value');
    if (v === undefined || v === null || v === '') return;
    if (typeof v === 'string') v = v.trim();
    if (v === '') return;
    var clean = sanitizeInput(String(v));
    arr.push('eq(' + field + ',' + (useEncoder ? TextInputEncoder(clean) : clean) + ')');
  }

  function toSolrDateLower(dateStr) {
    var parts = dateStr.split('-');
    if (parts.length === 1) return parts[0] + '-01-01T00:00:00Z';
    if (parts.length === 2) return parts[0] + '-' + parts[1] + '-01T00:00:00Z';
    return parts[0] + '-' + parts[1] + '-' + parts[2] + 'T00:00:00Z';
  }

  function toSolrDateUpper(dateStr) {
    var parts = dateStr.split('-');
    if (parts.length === 1) return parts[0] + '-12-31T23:59:59Z';
    if (parts.length === 2) {
      var y = parseInt(parts[0]), m = parseInt(parts[1]);
      var lastDay = new Date(y, m, 0).getDate();
      return parts[0] + '-' + parts[1] + '-' + ('0' + lastDay).slice(-2) + 'T23:59:59Z';
    }
    return parts[0] + '-' + parts[1] + '-' + parts[2] + 'T23:59:59Z';
  }

  function setupCalendarPopup(iconNode, textBoxNode) {
    var calendar = new Calendar({
      onValueSelected: function (date) {
        var y = date.getFullYear();
        var m = ('0' + (date.getMonth() + 1)).slice(-2);
        var d = ('0' + date.getDate()).slice(-2);
        textBoxNode.set('value', y + '-' + m + '-' + d);
        popup.close(tooltipDialog);
      }
    });
    var tooltipDialog = new TooltipDialog({ content: calendar });
    on(iconNode, 'click', function (e) {
      e.stopPropagation();
      popup.open({ popup: tooltipDialog, around: iconNode });
      var closeHandle = on(document, 'click', function (evt) {
        if (!dom.isDescendant(evt.target, tooltipDialog.domNode) && evt.target !== iconNode) {
          popup.close(tooltipDialog);
          closeHandle.remove();
        }
      });
    });
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Influenza Search',
    pageTitle: 'Influenza Search | BV-BRC',
    dataKey: 'genome',
    resultUrlBase: '/view/GenomeList/?',
    resultUrlHash: '#view_tab=genomes',

    // Current state
    selectedDataType: 'genome',
    selectedVirusTypes: null,

    postCreate: function () {
      this.inherited(arguments);
      var self = this;

      // Facet scoping conditions (use both legacy + updated IDs)
      var fluCondition = buildTaxonCondition(['A', 'B', 'C', 'D']);
      var fluACondition = buildTaxonCondition(['A']);
      var fluBCondition = buildTaxonCondition(['B']);

      // ===== Static stores =====
      this.haSubtypeNode.store = new Memory({ data: HA_SUBTYPES });
      this.naSubtypeNode.store = new Memory({ data: NA_SUBTYPES });
      this.hostGroupNode.store = hostGroupStore;

      // Reference/Representative store
      this.referenceNode.store = new Memory({
        data: [
          { id: 'Reference', name: 'Reference' },
          { id: 'Representative', name: 'Representative' }
        ]
      });

      // Vaccine strain store
      this.vaccineStrainNode.store = new Memory({
        data: [
          { id: 'Yes', name: 'Yes' },
          { id: 'No', name: 'No' }
        ]
      });

      // ===== Facet-built stores =====
      // [core, facet_field, attach_point_name, condition]
      var facetBindings = [
        ['genome', 'host_common_name', 'hostNameNode', fluCondition],
        ['genome', 'geographic_group', 'geographicGroupNode', fluCondition],
        ['genome', 'isolation_country', 'isolationCountryNode', fluCondition],
        ['genome', 'state_province', 'stateProvinceNode', fluCondition],
        ['genome', 'subtype', 'fullSubtypeNode', fluACondition],
        ['genome', 'subtype', 'fluBSubtypeNode', fluBCondition],
        ['genome', 'h1_clade_global', 'h1CladeGlobalNode', fluACondition],
        ['genome', 'h1_clade_us', 'h1CladeUsNode', fluACondition],
        ['genome', 'h3_clade', 'h3CladeNode', fluACondition],
        ['genome', 'h5_clade', 'h5CladeNode', fluACondition],
        ['genome', 'subclade', 'subcladeNode', fluACondition],
        ['genome', 'season', 'seasonNode', fluCondition],
        ['genome', 'isolation_source', 'isolationSourceNode', fluCondition],
        ['genome', 'passage', 'passageNode', fluCondition],
        ['genome_feature', 'gene', 'geneNode', fluCondition],
        ['genome_feature', 'product', 'productNode', fluCondition]
      ];
      facetBindings.forEach(lang.hitch(this, function (b) {
        var core = b[0], field = b[1], nodeName = b[2], condition = b[3];
        storeBuilder(core, field, condition).then(lang.hitch(this, function (store) {
          this[nodeName].store = store;
        }));
      }));

      // ===== Calendar popups =====
      setupCalendarPopup(this.collectionDateFromCalendarIcon, this.collectionDateFromNode);
      setupCalendarPopup(this.collectionDateToCalendarIcon, this.collectionDateToNode);
      setupCalendarPopup(this.submissionDateFromCalendarIcon, this.submissionDateFromNode);
      setupCalendarPopup(this.submissionDateToCalendarIcon, this.submissionDateToNode);

      // ===== State field visibility (US only) =====
      this.geographicGroupNode.on('change', lang.hitch(this, '_updateStateVisibility'));
      this.isolationCountryNode.on('change', lang.hitch(this, '_updateStateVisibility'));

      // ===== Clade visibility based on H subtype =====
      this.haSubtypeNode.on('change', lang.hitch(this, '_updateCladeVisibility'));
      this.fullSubtypeNode.on('change', lang.hitch(this, '_updateCladeVisibility'));

      // ===== Complete genome disables length fields =====
      this.completeGenomeNode.on('change', lang.hitch(this, function (checked) {
        this.seqLengthFromNode.set('disabled', checked);
        this.seqLengthToNode.set('disabled', checked);
        if (checked) {
          this.seqLengthFromNode.set('value', '');
          this.seqLengthToNode.set('value', '');
        }
      }));

      // ===== Select all segments =====
      this._segmentNodes = [
        this.segPB2Node, this.segPB1Node, this.segPANode, this.segHANode,
        this.segNPNode, this.segNANode, this.segMNode, this.segNSNode
      ];
      this.segSelectAllNode.on('change', lang.hitch(this, function (checked) {
        if (this._syncingSegSelectAll) return;
        this._syncingSegSelectAll = true;
        var self2 = this;
        this._segmentNodes.forEach(function (node) {
          // Skip NA when hidden for Flu C/D
          if (node === self2.segNANode && self2.segNALabel.style.display === 'none') return;
          node.set('value', checked);
        });
        this._syncingSegSelectAll = false;
      }));
      // Keep "Select all" state in sync with individual toggles
      this._segmentNodes.forEach(lang.hitch(this, function (node) {
        node.on('change', lang.hitch(this, function () {
          if (this._syncingSegSelectAll) return;
          var self2 = this;
          var all = this._segmentNodes.every(function (n) {
            if (n === self2.segNANode && self2.segNALabel.style.display === 'none') return true;
            return n.get('value');
          });
          this._syncingSegSelectAll = true;
          this.segSelectAllNode.set('value', all);
          this._syncingSegSelectAll = false;
        }));
      }));

      // ===== Data type buttons =====
      var dataTypeBtns = [this.dataTypeGenomeBtn, this.dataTypeSegmentBtn, this.dataTypeProteinBtn];
      dataTypeBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          self._selectDataType(btn.getAttribute('data-value'));
        });
      });

      // ===== Virus type buttons =====
      var virusTypeBtns = [this.btnFluA, this.btnFluB, this.btnFluC, this.btnFluD];
      virusTypeBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          self._toggleVirusType(btn.getAttribute('data-value'));
        });
      });
      // Initialize default selection
      this._setVirusTypes(['A']);

      // ===== Accordion toggles =====
      on(this.subtypeAccordionHeader, 'click', lang.hitch(this, function () {
        this._toggleAccordion(this.subtypeAccordionBody, this.subtypeAccordionIcon);
      }));
      on(this.completenessAccordionHeader, 'click', lang.hitch(this, function () {
        this._toggleAccordion(this.completenessAccordionBody, this.completenessAccordionIcon);
      }));
      on(this.proteinAccordionHeader, 'click', lang.hitch(this, function () {
        this._toggleAccordion(this.proteinAccordionBody, this.proteinAccordionIcon);
      }));

      // ===== Advanced section toggle =====
      on(this.advancedToggleBtn, 'click', lang.hitch(this, function () {
        if (this.advancedSection.style.display === 'none') {
          this.advancedSection.style.display = 'block';
          this.advancedToggleBtn.textContent = 'Hide advanced';
        } else {
          this.advancedSection.style.display = 'none';
          this.advancedToggleBtn.textContent = 'Show advanced';
        }
      }));

      // ===== Reset button =====
      on(this.resetButton, 'click', lang.hitch(this, '_resetForm'));

      // ===== Generate preset chips from PRESETS array =====
      PRESETS.forEach(function (preset, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bvs-chip';
        btn.setAttribute('data-preset-index', idx);
        btn.textContent = preset.label;
        self.presetChoiceGroup.appendChild(btn);
        on(btn, 'click', function () {
          self._applyPreset(idx, btn);
        });
      });

      this._syncSubtypeAndProteinUI();
    },

    // ===== Accordion toggle helper =====
    _toggleAccordion: function (bodyNode, iconNode) {
      if (bodyNode.style.display === 'none') {
        bodyNode.style.display = '';
        iconNode.innerHTML = '&minus;';
      } else {
        bodyNode.style.display = 'none';
        iconNode.innerHTML = '+';
      }
    },

    // ===== Data type switching =====
    _selectDataType: function (type) {
      this.selectedDataType = type;

      // Update button styles
      var btns = [this.dataTypeGenomeBtn, this.dataTypeSegmentBtn, this.dataTypeProteinBtn];
      btns.forEach(function (btn) {
        if (btn.getAttribute('data-value') === type) {
          domClass.add(btn, 'is-active');
        } else {
          domClass.remove(btn, 'is-active');
        }
      });

      // Sync hidden radio buttons
      this.dataTypeGenome.set('value', type === 'genome');
      this.dataTypeSegment.set('value', type === 'segment');
      this.dataTypeProtein.set('value', type === 'protein');


      if (type === 'genome') {
        this.resultUrlBase = '/view/GenomeList/?';
        this.resultUrlHash = '#view_tab=genomes';
      } else if (type === 'segment') {
        this.resultUrlBase = '/view/SequenceList/?';
        this.resultUrlHash = '#view_tab=sequences';
      } else {
        this.resultUrlBase = '/view/FeatureList/?';
        this.resultUrlHash = '#view_tab=features';
      }

      this._syncSubtypeAndProteinUI();
    },

    // ===== Virus type button selection =====
    _toggleVirusType: function (type) {
      var types = (this.selectedVirusTypes || []).slice();
      var idx = types.indexOf(type);
      if (idx === -1) {
        types.push(type);
      } else {
        // Prevent deselecting last selection
        if (types.length === 1) return;
        types.splice(idx, 1);
      }
      this._setVirusTypes(types);
    },

    _setVirusTypes: function (types) {
      // Preserve canonical order: A, B, C, D
      var order = ['A', 'B', 'C', 'D'];
      types = order.filter(function (t) {
        return types.indexOf(t) !== -1;
      });
      this.selectedVirusTypes = types;

      var btns = [this.btnFluA, this.btnFluB, this.btnFluC, this.btnFluD];
      btns.forEach(function (btn) {
        if (types.indexOf(btn.getAttribute('data-value')) !== -1) {
          domClass.add(btn, 'is-active');
        } else {
          domClass.remove(btn, 'is-active');
        }
      });

      this._syncSubtypeAndProteinUI();
    },

    _selectVirusType: function (type) {
      this._setVirusTypes([type]);
    },

    _syncSubtypeAndProteinUI: function () {
      var isProtein = this.selectedDataType === 'protein';
      var types = this.selectedVirusTypes || [];
      var hasA = types.indexOf('A') !== -1;
      var hasB = types.indexOf('B') !== -1;
      var hasAorB = hasA || hasB;

      // Title
      if (hasA) {
        this.subtypeAccordionTitle.textContent = 'Subtype and Classification';
      } else {
        this.subtypeAccordionTitle.textContent = 'Subtype';
      }

      // Show each type's subtype section independently based on selection
      this.subtypeSection.style.display = hasA ? '' : 'none';
      this.fluBSubtypeSection.style.display = hasB ? '' : 'none';
      this.cladeRow.style.display = hasA ? '' : 'none';

      this.fluBSubtypeSection.style.marginTop = (hasA && hasB) ? '12px' : '';

      // Subtype accordion visible if A or B is in selection
      this.subtypeAccordion.style.display = hasAorB ? '' : 'none';

      // Protein accordion only for protein data type
      this.proteinAccordion.style.display = isProtein ? '' : 'none';

      // Completeness/Segments accordion only for genome
      var isGenome = this.selectedDataType === 'genome';
      this.completenessAccordion.style.display = isGenome ? '' : 'none';

      if (!isGenome) {
        // Clear all completeness/segment state so it doesn't silently apply
        if (this.completeGenomeNode && this.completeGenomeNode.get('value')) {
          this.completeGenomeNode.set('value', false);
        }
        var segmentNodes = [
          this.segPB2Node, this.segPB1Node, this.segPANode, this.segHANode,
          this.segNPNode, this.segNANode, this.segMNode, this.segNSNode,
          this.segSelectAllNode
        ];
        segmentNodes.forEach(function (node) {
          if (node && node.get('value')) node.set('value', false);
        });
      }

      // NA segment only when an A or B virus type is in the selection (C/D have no NA segment)
      this.segNALabel.style.display = hasAorB ? '' : 'none';
      if (!hasAorB && this.segNANode.get('value')) {
        this.segNANode.set('value', false);
      }

      // Optional cleanup:
      // if not protein, clear protein-only filters
      if (!isProtein) {
        if (this.geneNode) this.geneNode.set('value', '');
        if (this.productNode) this.productNode.set('value', '');
      }

      // Clear fields whose type is no longer selected
      if (!hasA) {
        if (this.haSubtypeNode) this.haSubtypeNode.set('value', '');
        if (this.naSubtypeNode) this.naSubtypeNode.set('value', '');
        if (this.fullSubtypeNode) this.fullSubtypeNode.set('value', '');
        this._clearCladeFields();
      } else {
        this._updateCladeVisibility();
      }
      if (!hasB) {
        if (this.fluBSubtypeNode) this.fluBSubtypeNode.set('value', '');
      }
    },

    // ===== Apply a predefined search preset =====
    // Generic: iterates preset keys, maps each to this[key + 'Node'].set('value', val)
    _applyPreset: function (presetIndex, btnNode) {
      var preset = PRESETS[presetIndex];
      if (!preset) return;

      // Toggle off if already active (chip behaves like a single-select radio)
      var alreadyActive = domClass.contains(btnNode, 'is-active');

      // Reset the form first so previous preset's values don't linger
      this._resetForm();

      if (alreadyActive) return;
      domClass.add(btnNode, 'is-active');

      // Special keys handled explicitly
      if (preset.virusType) {
        this._selectVirusType(preset.virusType);
      }
      if (preset.dataType) {
        this._selectDataType(preset.dataType);
      }

      // All remaining keys auto-map to this[key + 'Node']
      for (var key in preset) {
        if (PRESET_SPECIAL_KEYS[key]) continue;
        var node = this[key + 'Node'];
        if (node && node.set) {
          node.set('value', preset[key]);
        }
      }
    },

    // ===== Clade field visibility based on H subtype =====
    _updateCladeVisibility: function () {
      // Determine active H number from full subtype (e.g. "H5N1" → 5) or H subtype dropdown
      var fullVal = (this.fullSubtypeNode.get('value') || '').toUpperCase();
      var haVal = this.haSubtypeNode.get('value') || '';
      var hNum = null;

      if (fullVal) {
        var m = fullVal.match(/^H(\d+)/);
        if (m) hNum = parseInt(m[1]);
      } else if (haVal) {
        hNum = parseInt(haVal);
      }

      // No filter → show all; specific H → show only matching
      var showH1 = !hNum || hNum === 1;
      var showH3 = !hNum || hNum === 3;
      var showH5 = !hNum || hNum === 5;

      this.h1CladeGlobalField.style.display = showH1 ? '' : 'none';
      this.h1CladeUsField.style.display = showH1 ? '' : 'none';
      this.h3CladeField.style.display = showH3 ? '' : 'none';
      this.h5CladeField.style.display = showH5 ? '' : 'none';

      // Clear hidden fields
      if (!showH1) {
        this.h1CladeGlobalNode.set('value', '');
        this.h1CladeUsNode.set('value', '');
      }
      if (!showH3) this.h3CladeNode.set('value', '');
      if (!showH5) this.h5CladeNode.set('value', '');

      // Hide entire clade row if no clade fields visible (e.g. H2, H4, H7…)
      this.cladeRow.style.display = (showH1 || showH3 || showH5) ? '' : 'none';
    },

    _clearCladeFields: function () {
      this.h1CladeGlobalNode.set('value', '');
      this.h1CladeUsNode.set('value', '');
      this.h3CladeNode.set('value', '');
      this.h5CladeNode.set('value', '');
      this.subcladeNode.set('value', '');
    },

    // ===== State field: only visible for North America / USA =====
    _updateStateVisibility: function () {
      var region = (this.geographicGroupNode.get('value') || '').toLowerCase();
      var country = (this.isolationCountryNode.get('value') || '').toLowerCase();
      var hide = (region && region !== 'north america') || (country && country !== 'usa' && country !== 'united states');
      this.stateField.style.display = hide ? 'none' : '';
      if (hide) {
        this.stateProvinceNode.set('value', '');
      }
    },

    // ===== Reset =====
    _resetForm: function () {
      // Reset all FilteringSelect widgets
      var filterSelects = [
        this.haSubtypeNode, this.naSubtypeNode, this.fullSubtypeNode,
        this.fluBSubtypeNode, this.referenceNode,
        this.hostNameNode, this.hostGroupNode,
        this.geographicGroupNode, this.isolationCountryNode, this.stateProvinceNode,
        this.h1CladeGlobalNode, this.h1CladeUsNode, this.h3CladeNode, this.h5CladeNode, this.subcladeNode,
        this.seasonNode, this.isolationSourceNode, this.passageNode, this.vaccineStrainNode,
        this.geneNode, this.productNode
      ];
      filterSelects.forEach(function (node) {
        if (node && node.set) {
          node.set('value', '');
        }
      });

      // Reset all TextBox widgets
      var textBoxes = [
        this.strainNameNode, this.bioprojectNode,
        this.collectionDateFromNode, this.collectionDateToNode,
        this.submissionDateFromNode, this.submissionDateToNode,
        this.seqLengthFromNode, this.seqLengthToNode
      ];
      textBoxes.forEach(function (node) {
        if (node && node.set) {
          node.set('value', '');
        }
      });

      // Reset checkboxes
      var checkboxes = [
        this.completeGenomeNode,
        this.segPB2Node, this.segPB1Node, this.segPANode, this.segHANode,
        this.segNPNode, this.segNANode, this.segMNode, this.segNSNode,
        this.segSelectAllNode
      ];
      checkboxes.forEach(function (node) {
        if (node && node.set) {
          node.set('value', false);
        }
      });

      // Reset exclude deprecated back to checked
      this.excludeDeprecatedNode.set('value', true);

      // Reset data type to Genome
      this._selectDataType('genome');

      // Reset virus type to Flu A
      this._setVirusTypes(['A']);

      // Expand completeness/segments accordion (default state)
      this.completenessAccordionBody.style.display = '';
      this.completenessAccordionIcon.innerHTML = '&minus;';

      // Collapse advanced section
      this.advancedSection.style.display = 'none';
      this.advancedToggleBtn.textContent = 'Show advanced';

      // Clear active preset chip
      query('.bvs-chip', this.presetChoiceGroup).forEach(function (b) {
        domClass.remove(b, 'is-active');
      });
    },

    // ===== Helpers =====
    _buildDateQuery: function (field, fromNode, toNode) {
      var fromStr = fromNode.get('value').trim();
      var toStr = toNode.get('value').trim();
      if (fromStr && toStr) {
        return 'between(' + field + ',' + encodeURIComponent(toSolrDateLower(fromStr)) + ',' + encodeURIComponent(toSolrDateUpper(toStr)) + ')';
      } else if (fromStr) {
        return 'gt(' + field + ',' + encodeURIComponent(toSolrDateLower(fromStr)) + ')';
      } else if (toStr) {
        return 'lt(' + field + ',' + encodeURIComponent(toSolrDateUpper(toStr)) + ')';
      }
      return null;
    },

    _buildLengthQuery: function (field, fromNode, toNode) {
      var fromVal = parseInt(fromNode.get('value'));
      var toVal = parseInt(toNode.get('value'));
      if (!isNaN(fromVal) && !isNaN(toVal)) {
        return 'between(' + field + ',' + fromVal + ',' + toVal + ')';
      } else if (!isNaN(fromVal)) {
        return 'gt(' + field + ',' + fromVal + ')';
      } else if (!isNaN(toVal)) {
        return 'lt(' + field + ',' + toVal + ')';
      }
      return null;
    },

    // ===== Shared genome-level filters (used by all three data types) =====
    _buildGenomeFilters: function () {
      var q = [];

      // Virus type — eq() for single selection, in() for multi-select
      var types = this.selectedVirusTypes || [];
      if (types.length === 1) {
        q.push('eq(taxon_lineage_ids,' + FLU_TAXON_IDS[types[0]] + ')');
      } else if (types.length > 1) {
        var taxonIds = types.map(function (t) { return FLU_TAXON_IDS[t]; });
        q.push('in(taxon_lineage_ids,(' + taxonIds.join(',') + '))');
      }

      // Apply subtype/clade filters per virus type that is selected.
      // Note: `subtype` field is shared between Flu A (e.g. H1N1) and Flu B (Victoria/Yamagata).
      // If both A and B are selected and both write to `subtype`, we combine with or().
      var hasA = types.indexOf('A') !== -1;
      var hasB = types.indexOf('B') !== -1;
      var aSubtypeClause = null;
      if (hasA) {
        var fullVal = this.fullSubtypeNode.get('value');
        if (fullVal) {
          aSubtypeClause = 'eq(subtype,' + encodeURIComponent(fullVal) + ')';
        } else {
          pushEq(q, 'h_type', this.haSubtypeNode);
          pushEq(q, 'n_type', this.naSubtypeNode);
        }
        // H-specific clade fields (Flu A only)
        pushEq(q, 'h1_clade_global', this.h1CladeGlobalNode);
        pushEq(q, 'h1_clade_us', this.h1CladeUsNode);
        pushEq(q, 'h3_clade', this.h3CladeNode);
        pushEq(q, 'h5_clade', this.h5CladeNode);
        pushEq(q, 'subclade', this.subcladeNode);
      }
      var bSubtypeClause = null;
      if (hasB) {
        var bVal = this.fluBSubtypeNode.get('value');
        if (bVal) {
          bSubtypeClause = 'eq(subtype,' + encodeURIComponent(bVal) + ')';
        }
      }
      if (aSubtypeClause && bSubtypeClause) {
        q.push('or(' + aSubtypeClause + ',' + bSubtypeClause + ')');
      } else if (aSubtypeClause) {
        q.push(aSubtypeClause);
      } else if (bSubtypeClause) {
        q.push(bSubtypeClause);
      }

      // Reference/Representative
      pushEq(q, 'reference_genome', this.referenceNode);

      // Host
      pushEq(q, 'host_group', this.hostGroupNode);
      pushEq(q, 'host_common_name', this.hostNameNode);

      // Location
      pushEq(q, 'geographic_group', this.geographicGroupNode);
      pushEq(q, 'isolation_country', this.isolationCountryNode);
      pushEq(q, 'state_province', this.stateProvinceNode);

      // Collection date
      var collDateQ = this._buildDateQuery('collection_date_dr', this.collectionDateFromNode, this.collectionDateToNode);
      if (collDateQ) q.push(collDateQ);

      // Season
      pushEq(q, 'season', this.seasonNode);

      // Exclude deprecated
      if (this.excludeDeprecatedNode.get('value')) {
        q.push('ne(genome_status,Deprecated)');
      }

      // === Advanced filters ===

      // Strain name + BioProject (free-text, need TextInputEncoder)
      pushEq(q, 'genome_name', this.strainNameNode, true);
      pushEq(q, 'bioproject_accession', this.bioprojectNode, true);

      // Submission date (field is completion_date in Solr)
      var subDateQ = this._buildDateQuery('completion_date', this.submissionDateFromNode, this.submissionDateToNode);
      if (subDateQ) q.push(subDateQ);

      // Source / Passage / Vaccine Strain
      pushEq(q, 'isolation_source', this.isolationSourceNode);
      pushEq(q, 'passage', this.passageNode);
      pushEq(q, 'vaccine_strain', this.vaccineStrainNode);

      // Advanced search rows (Additional Criteria)
      var advancedQueryArr = this._buildAdvancedQuery();
      if (advancedQueryArr.length > 0) {
        q = q.concat(advancedQueryArr);
      }

      return q;
    },

    // ===== Query builders per data type =====
    buildQuery: function () {
      if (this.selectedDataType === 'genome') {
        return this._buildGenomeQuery();
      } else if (this.selectedDataType === 'segment') {
        return this._buildSegmentQuery();
      } else {
        return this._buildProteinQuery();
      }
    },

    buildDefaultColumns: function () {
      var cols = [];

      // Node → column name mappings: add the column when the user filled in a value
      var nodeCols = [
        [this.haSubtypeNode,        'h_type'],
        [this.naSubtypeNode,        'n_type'],
        [this.fullSubtypeNode,      'subtype'],
        [this.fluBSubtypeNode,      'subtype'],
        [this.h1CladeGlobalNode,    'h1_clade_global'],
        [this.h1CladeUsNode,        'h1_clade_us'],
        [this.h3CladeNode,          'h3_clade'],
        [this.h5CladeNode,          'h5_clade'],
        [this.subcladeNode,         'subclade'],
        [this.hostGroupNode,        'host_group'],
        [this.hostNameNode,         'host_common_name'],
        [this.geographicGroupNode,  'geographic_group'],
        [this.isolationCountryNode, 'isolation_country'],
        [this.stateProvinceNode,    'state_province'],
        [this.seasonNode,           'season'],
        [this.isolationSourceNode,  'isolation_source'],
        [this.passageNode,          'passage'],
        [this.vaccineStrainNode,    'vaccine_strain'],
        [this.referenceNode,        'reference_genome'],
        [this.geneNode,             'gene'],
        [this.productNode,          'product']
      ];

      nodeCols.forEach(function (pair) {
        var node = pair[0], col = pair[1];
        if (node && node.get('value') && cols.indexOf(col) === -1) {
          cols.push(col);
        }
      });

      // Segment checkboxes — add 'segment' column if any are checked
      var segChecked = [
        this.segPB2Node, this.segPB1Node, this.segPANode, this.segHANode,
        this.segNPNode, this.segNANode, this.segMNode, this.segNSNode
      ].some(function (n) { return n && n.get('value'); });
      if (segChecked) cols.push('segment');

      // Collection date — add if either bound is filled
      var collDateSet = (this.collectionDateFromNode && this.collectionDateFromNode.get('value')) ||
                        (this.collectionDateToNode && this.collectionDateToNode.get('value'));
      if (collDateSet) cols.push('collection_date');

      // Submission date — add if either bound is filled
      var subDateSet = (this.submissionDateFromNode && this.submissionDateFromNode.get('value')) ||
                       (this.submissionDateToNode && this.submissionDateToNode.get('value'));
      if (subDateSet) cols.push('completion_date');

      return cols.length ? cols.join(',') : null;
    },

    _buildGenomeQuery: function () {
      var genomeFilters = this._buildGenomeFilters();

      // Sequence length (genome core)
      var lenQ = this._buildLengthQuery('genome_length', this.seqLengthFromNode, this.seqLengthToNode);
      if (lenQ) genomeFilters.push(lenQ);

      // Completeness
      if (this.completeGenomeNode.get('value')) {
        genomeFilters.push('eq(genome_status,Complete)');
      }

      // Required segments — use in(...) for multi-select, eq(...) for single
      var segmentNodes = {
        PB2: this.segPB2Node, PB1: this.segPB1Node, PA: this.segPANode, HA: this.segHANode,
        NP: this.segNPNode, NA: this.segNANode, M: this.segMNode, NS: this.segNSNode
      };
      var segNums = [];
      for(var seg in segmentNodes) {
        if (segmentNodes[seg].get('value')) {
          segNums.push(SEGMENT_NUMBERS[seg]);
        }
      }
      if (segNums.length === 1) {
        genomeFilters.push('eq(segment,' + segNums[0] + ')');
      } else if (segNums.length > 1) {
        genomeFilters.push('in(segment,(' + segNums.join(',') + '))');
      }

      return 'eq(genome_id,*)&genome(' + genomeFilters.join(',') + ')';
    },

    _buildSegmentQuery: function () {
      var genomeFilters = this._buildGenomeFilters();

      // Sequence length — applies to the sequence itself (outside genome join)
      var seqFilters = [];
      var lenQ = this._buildLengthQuery('length', this.seqLengthFromNode, this.seqLengthToNode);
      if (lenQ) seqFilters.push(lenQ);

      // genome_sequence requires a leading clause + genome() join, same as genome queries
      var parts = ['eq(sequence_id,*)'];
      if (genomeFilters.length > 0) {
        parts.push('genome(' + genomeFilters.join(',') + ')');
      }
      parts = parts.concat(seqFilters);

      return parts.join('&');
    },

    _buildProteinQuery: function () {
      var featureFilters = [];
      featureFilters.push('eq(feature_type,CDS)');

      var genomeFilters = this._buildGenomeFilters();
      if (genomeFilters.length > 0) {
        featureFilters.push('genome(' + genomeFilters.join(',') + ')');
      }

      pushEq(featureFilters, 'gene', this.geneNode, true);
      pushEq(featureFilters, 'product', this.productNode, true);

      // Protein length — amino acid count
      var lenQ = this._buildLengthQuery('aa_length', this.seqLengthFromNode, this.seqLengthToNode);
      if (lenQ) featureFilters.push(lenQ);

      return featureFilters.join('&');
    }
  });
});
