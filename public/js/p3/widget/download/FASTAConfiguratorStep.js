define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/query',
  './WizardStepBase',
  'dojo/text!./templates/FASTAConfiguratorStep.html',
  '../../util/DownloadFormats',
  '../../util/FastaFormatStore'
], function (
  declare,
  lang,
  on,
  domClass,
  domConstruct,
  query,
  WizardStepBase,
  template,
  DownloadFormats,
  FastaFormatStore
) {
  /**
   * FASTAConfiguratorStep - Step 3 configurator for FASTA formats
   *
   * Allows users to:
   * - Select the field to use as sequence ID (default: BV-BRC ID)
   * - Select fields to include in the sequence description
   * - Choose how description fields are separated, and whether the ID is
   *   followed by a trailing '|'
   */

  /** Sentinel <option> value; not a delimiter anyone would type. */
  var CUSTOM_DELIMITER = '\u0000custom';

  /**
   * Enriched fields are reachable under two names in zone mode
   * ('genome_metadata.strain' and 'strain') but only the bare one works in a
   * format string -- the prefixed form renders empty. The picker's hardcoded
   * list still carries the prefix, so strip it whenever a field name crosses
   * into a template. Measured on alpha; see PLAN-fasta-header-formats.md.
   */
  var JOIN_PREFIX = /^genome_metadata\./;

  function bareFieldName(name) {
    return String(name).replace(JOIN_PREFIX, '');
  }

  /** Field references in a template: {name}, ignoring {{escaped}} braces. */
  var TEMPLATE_FIELD = /\{([^{}]*)\}/g;

  // Stand-ins for escaped braces while scanning. These must be strings a
  // user cannot type into the box: a readable word would be rewritten to
  // a brace if someone used it as literal text. Applied with split/join
  // rather than a regex, since a control character in a regex literal is
  // both unreadable and an eslint error.
  var ESCAPED_OPEN = String.fromCharCode(0);
  var ESCAPED_CLOSE = String.fromCharCode(1);

  /**
   * Field names a template refers to, in order of first appearance.
   * Mirrors templateFields() in p3_api util/fastaHeaderFormatter.js.
   */
  function templateFields(template) {
    if (!template) return [];
    var out = [];
    var scannable = String(template).replace(/\{\{/g, '\u0000').replace(/\}\}/g, '\u0000');
    var m;
    TEMPLATE_FIELD.lastIndex = 0;
    while ((m = TEMPLATE_FIELD.exec(scannable)) !== null) {
      var name = m[1].trim();
      if (name && out.indexOf(name) === -1) out.push(name);
    }
    return out;
  }

  /**
   * Syntax check, mirroring validateTemplate() in the API. The server enforces
   * these too, so this only fails faster -- unlike the field-name check below,
   * which the server does NOT perform.
   *
   * @returns {string|null} an error message, or null when well-formed
   */
  function validateTemplateSyntax(template) {
    if (typeof template !== 'string' || template.trim() === '') {
      return 'Enter a format string, or switch back to "Build from fields".';
    }
    var scannable = template.replace(/\{\{/g, '\u0000').replace(/\}\}/g, '\u0000');
    var opens = (scannable.match(/\{/g) || []).length;
    var closes = (scannable.match(/\}/g) || []).length;
    if (opens !== closes) {
      return 'Unbalanced braces. Use {{ and }} for literal braces.';
    }
    if (/\{\s*\}/.test(scannable)) {
      return 'Empty field reference {}.';
    }
    return null;
  }

  /** Cheap edit distance, capped -- only used to suggest a near-miss field. */
  function closeTo(a, b) {
    if (Math.abs(a.length - b.length) > 3) return false;
    var prev = [];
    var i;
    for (i = 0; i <= b.length; i++) prev[i] = i;
    for (i = 1; i <= a.length; i++) {
      var cur = [i];
      for (var j = 1; j <= b.length; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
        );
      }
      prev = cur;
    }
    return prev[b.length] <= 3;
  }

  return declare([WizardStepBase], {
    templateString: template,
    stepId: 'options',
    stepTitle: 'Options',
    stepDescription: 'Configure FASTA sequence metadata',

    // State
    sequenceIdField: null,  // Field to use as sequence ID
    descriptionFields: null, // Array of fields for description
    availableFields: null,   // All available fields from query descriptor

    // Delimiters. These mirror the server's own defaults
    // (p3_api util/fastaHeaderFormatter.js createFastaHeaderFormatter) so that
    // sending them explicitly cannot change output for a user who never touches
    // them. The description delimiter defaults to ' ' on the server; we send
    // ' | ' because that is what the preview has always shown and what makes a
    // multi-field description parseable -- several values (host_name, product)
    // contain spaces of their own.
    //
    // idDelimiter is exposed as a checkbox rather than a delimiter control: the
    // ID selector is single-select, so there is never a second ID field to
    // separate. The server appends this after the ID section unconditionally,
    // which makes it a trailing character -- '|' or nothing.
    idDelimiter: '|',
    descriptionDelimiter: ' | ',

    // 'zones' | 'template'. Exclusive, because the API is: when
    // http_fasta_header is present the server ignores the zone parameters
    // rather than merging them.
    headerMode: 'zones',
    headerTemplate: '',

    // Presets + the user's own, as loaded by FastaFormatStore.
    _savedFormats: null,
    _pendingSelection: null,
    // The template of an applied preset, while it remains unedited.
    _appliedPresetTemplate: null,

    // Event handlers
    _handlers: null,

    postCreate: function () {
      this.inherited(arguments);
      this._handlers = [];
      this.descriptionFields = [];
      this.availableFields = [];
    },

    /**
     * Called when context is set
     */
    onContextSet: function (context) {
      this._initializeFields();
    },

    /**
     * Called when step becomes visible
     */
    onShow: function () {
      this.inherited(arguments);
      this._initializeFields();
      this._updatePreview();
    },

    /**
     * Initialize available fields from context
     */
    _initializeFields: function () {
      var self = this;

      // Use fields appropriate for the target collection, not the source grid's columns
      this.availableFields = this._getDefaultFieldsForDataType();

      // Set default sequence ID field
      if (!this.sequenceIdField) {
        var dataType = this.context ? this.context.dataType : 'genome_feature';
        this.sequenceIdField = DownloadFormats.getDefaultIdField(dataType);
      }

      // Populate the sequence ID dropdown
      this._populateIdFieldDropdown();

      // Populate the available fields lists
      this._populateFieldLists();

      // Delimiter controls
      this._populateDelimiterDropdown();
      this._syncDelimiterControls();

      // Template mode
      this._populateTemplateFieldList();
      this._syncModeControls();

      // Saved formats and presets
      this._loadSavedFormats();
    },

    // ------------------------------------------------------------ saved formats

    /** Sentinel <option> value for "no format applied". */
    NO_FORMAT: '',

    /**
     * Fetch presets and the user's formats, then build the dropdown.
     *
     * Failure is silent by design -- the store resolves to an empty list
     * rather than rejecting, and with nothing to offer the whole section
     * stays hidden. A download must not be blocked by a preset folder.
     */
    _loadSavedFormats: function () {
      var self = this;
      var dataType = this.context ? this.context.dataType : 'genome_feature';

      FastaFormatStore.list(dataType).then(function (formats) {
        self._savedFormats = formats || [];
        self._renderSavedFormats();
      });
    },

    _renderSavedFormats: function () {
      if (!this.savedFormatsSection) return;

      var self = this;
      var formats = this._savedFormats || [];
      var canSave = FastaFormatStore.canSave();

      // Nothing to show and nothing to save: no empty furniture.
      if (formats.length === 0 && !canSave) {
        domClass.add(this.savedFormatsSection, 'dijitHidden');
        return;
      }
      domClass.remove(this.savedFormatsSection, 'dijitHidden');

      domConstruct.empty(this.savedFormatSelect);
      domConstruct.create('option', {
        value: this.NO_FORMAT,
        innerHTML: formats.length ? '— choose a format —' : '— no saved formats —'
      }, this.savedFormatSelect);

      // Presets first, then the user's own, each under a heading so it is
      // clear which ones can be deleted.
      var presets = formats.filter(function (f) { return f.isPreset; });
      var mine = formats.filter(function (f) { return !f.isPreset; });

      [['Standard formats', presets], ['My formats', mine]].forEach(function (pair) {
        if (pair[1].length === 0) return;
        var group = domConstruct.create('optgroup', { label: pair[0] }, self.savedFormatSelect);
        pair[1].forEach(function (f) {
          domConstruct.create('option', {
            value: f.name,
            innerHTML: self._escapeHtml(f.name)
          }, group);
        });
      });

      domClass.toggle(this.saveFormatBtn, 'dijitHidden', !canSave);

      // Reselect after a save, so the user sees the result rather than the
      // list resetting to "choose a format".
      if (this._pendingSelection) {
        this.savedFormatSelect.value = this._pendingSelection;
        this._pendingSelection = null;
      }

      this._syncSavedFormatButtons();
    },

    /** Delete is for the user's own formats only; presets are read-only. */
    _syncSavedFormatButtons: function () {
      if (!this.deleteFormatBtn) return;
      var selected = this._findSavedFormat(this.savedFormatSelect.value);
      var deletable = !!selected && !selected.isPreset && FastaFormatStore.canSave();
      domClass.toggle(this.deleteFormatBtn, 'dijitHidden', !deletable);

      if (this.savedFormatDescription) {
        this.savedFormatDescription.innerHTML = selected && selected.description
          ? this._escapeHtml(selected.description) : '';
      }
    },

    _findSavedFormat: function (name) {
      if (!name) return null;
      return (this._savedFormats || []).filter(function (f) {
        return f.name === name;
      })[0] || null;
    },

    _onSavedFormatChange: function () {
      var format = this._findSavedFormat(this.savedFormatSelect.value);
      this._syncSavedFormatButtons();
      if (format) this._applyFormat(format);
    },

    /**
     * Put a stored format into the controls.
     *
     * A preset is applied, not loaded for editing: the user can change
     * anything afterwards, and "Save as..." makes it their own. That keeps
     * presets read-only without a separate "duplicate" step.
     */
    _applyFormat: function (format) {
      // Remember a preset's template verbatim so validation can tell an
      // untouched preset from one the user has edited.
      this._appliedPresetTemplate = (format.isPreset && format.mode === 'template')
        ? (format.template || '') : null;

      if (format.mode === 'template') {
        this.headerMode = 'template';
        this.headerTemplate = format.template || '';
      } else {
        this.headerMode = 'zones';
        if (format.idFields && format.idFields.length) {
          this.sequenceIdField = format.idFields[0];
        } else if (format.sequenceIdField) {
          this.sequenceIdField = format.sequenceIdField;
        }
        if (format.idDelimiter !== undefined) this.idDelimiter = format.idDelimiter;
        if (format.descriptionDelimiter !== undefined) {
          this.descriptionDelimiter = format.descriptionDelimiter;
        }
        if (format.descriptionFields) {
          var available = this.availableFields;
          this.descriptionFields = format.descriptionFields.map(function (name) {
            // Keep the stored name even when the picker does not know it;
            // dropping it would silently change the user's format.
            return available.filter(function (f) {
              return f.field === name || bareFieldName(f.field) === bareFieldName(name);
            })[0] || { field: name, label: name };
          });
        }
        this._populateIdFieldDropdown();
        this._populateFieldLists();
        this._syncDelimiterControls();
      }

      this._syncModeControls();
      this._validateTemplate();
      this._updatePreview();
      this.notifyDataChanged();
    },

    /** Capture the current configuration as a storable record. */
    _currentFormatRecord: function (name) {
      if (this.headerMode === 'template') {
        return {
          name: name,
          dataType: this.context ? this.context.dataType : undefined,
          mode: 'template',
          template: this.headerTemplate
        };
      }
      return {
        name: name,
        dataType: this.context ? this.context.dataType : undefined,
        mode: 'zones',
        idFields: [this.sequenceIdField],
        idDelimiter: this.idDelimiter,
        descriptionFields: this.descriptionFields.map(function (f) { return f.field; }),
        descriptionDelimiter: this.descriptionDelimiter
      };
    },

    _onSaveFormat: function () {
      var self = this;

      // Block saving something the server would reject.
      var validation = this._validateTemplate();
      if (validation.error) {
        this.showError(validation.error);
        return;
      }

      // eslint-disable-next-line no-alert
      var name = window.prompt('Save this format as:', this.savedFormatSelect.value || '');
      if (name === null) return;
      name = name.trim();
      if (!name) return;

      var existing = this._findSavedFormat(name);
      if (existing && existing.isPreset) {
        this.showError('"' + name + '" is a standard format. Choose another name.');
        return;
      }
      // eslint-disable-next-line no-alert
      if (existing && !window.confirm('Replace your saved format "' + name + '"?')) {
        return;
      }

      FastaFormatStore.save(this._currentFormatRecord(name)).then(
        function () {
          // Set before reloading: _renderSavedFormats consumes this as it
          // rebuilds, and the store may resolve synchronously from cache.
          self._pendingSelection = name;
          self._loadSavedFormats();
        },
        function (err) {
          self.showError('Could not save: ' + (err && err.message ? err.message : err));
        }
      );
    },

    _onDeleteFormat: function () {
      var self = this;
      var name = this.savedFormatSelect.value;
      var format = this._findSavedFormat(name);
      if (!format || format.isPreset) return;

      // eslint-disable-next-line no-alert
      if (!window.confirm('Delete your saved format "' + name + '"?')) return;

      FastaFormatStore.remove(name).then(
        function () { self._loadSavedFormats(); },
        function (err) {
          self.showError('Could not delete: ' + (err && err.message ? err.message : err));
        }
      );
    },

    /**
     * Compose the template the current zone selection would produce.
     *
     * Seeding from the zones is what makes the format string approachable: it
     * turns the feature into an escape hatch from the picker rather than a
     * blank box. Field names are normalised to their bare form, since the
     * prefixed names the picker uses render empty in a template.
     */
    _templateFromZones: function () {
      var idField = bareFieldName(this.sequenceIdField || 'id');
      var parts = ['{' + idField + '}' + (this.idDelimiter || '')];

      if (this.descriptionFields.length > 0) {
        parts.push(this.descriptionFields.map(function (f) {
          return '{' + bareFieldName(f.field) + '}';
        }).join(this.descriptionDelimiter));
      }

      return parts.join(' ');
    },

    _populateTemplateFieldList: function () {
      if (!this.templateFieldList) return;

      var self = this;
      domConstruct.empty(this.templateFieldList);

      this.availableFields.forEach(function (f) {
        var name = bareFieldName(f.field);
        var chip = domConstruct.create('a', {
          'class': 'templateFieldChip',
          href: '#',
          title: '{' + name + '}',
          innerHTML: self._escapeHtml(f.label)
        }, self.templateFieldList);

        self._handlers.push(on(chip, 'click', function (e) {
          e.preventDefault();
          self._insertField(name);
        }));
      });
    },

    /** Insert {name} at the caret, keeping focus in the box. */
    _insertField: function (name) {
      var input = this.templateInput;
      if (!input) return;

      var token = '{' + name + '}';
      var start = input.selectionStart;
      var end = input.selectionEnd;

      if (typeof start !== 'number') {
        input.value += token;
      } else {
        input.value = input.value.slice(0, start) + token + input.value.slice(end);
        var caret = start + token.length;
        input.setSelectionRange(caret, caret);
      }

      input.focus();
      this._onTemplateInput();
    },

    _onModeChange: function () {
      var toTemplate = this.modeTemplateRadio && this.modeTemplateRadio.checked;
      this.headerMode = toTemplate ? 'template' : 'zones';

      // Seed on the first switch only; afterwards the user's edits stand.
      if (toTemplate && !this.headerTemplate) {
        this.headerTemplate = this._templateFromZones();
        if (this.templateInput) this.templateInput.value = this.headerTemplate;
      }

      this._syncModeControls();
      this._validateTemplate();
      this._updatePreview();
      this.notifyDataChanged();
    },

    _onTemplateInput: function () {
      this.headerTemplate = this.templateInput ? this.templateInput.value : '';
      this._validateTemplate();
      this._updatePreview();
      this.notifyDataChanged();
    },

    /** Show or hide each mode's controls. */
    _syncModeControls: function () {
      var template = this.headerMode === 'template';

      if (this.modeZonesRadio) this.modeZonesRadio.checked = !template;
      if (this.modeTemplateRadio) this.modeTemplateRadio.checked = template;

      if (this.templateSection) {
        domClass.toggle(this.templateSection, 'dijitHidden', !template);
      }
      if (this.zoneSections) {
        domClass.toggle(this.zoneSections, 'zoneSectionsDisabled', template);
      }
      if (this.templateInput && this.templateInput.value !== this.headerTemplate) {
        this.templateInput.value = this.headerTemplate;
      }
    },

    /**
     * Check the template and show any problem.
     *
     * Two classes of problem, treated differently:
     *
     * - SYNTAX (unbalanced braces, empty {}) is a hard error. The server
     *   rejects these with a 400, so blocking costs the user nothing.
     *
     * - AN UNRECOGNISED FIELD is only a warning, because our field list is
     *   not authoritative. The picker's hardcoded list knows 30 names while
     *   the collection accepts 88 (/fields), so {host_name} is perfectly
     *   valid on the server and absent from our list. Blocking on that would
     *   refuse working templates -- worse than the thing we are guarding
     *   against. Item 5 replaces the list with /fields, at which point this
     *   can tighten to an error.
     *
     *   Worth flagging at all because the deployed API renders an unknown
     *   field as an empty string and returns 200 (contrary to its documented
     *   contract), so a typo like {producr} silently truncates the header.
     *
     * @returns {Object} { error, warning } -- error blocks, warning does not
     */
    _validateTemplate: function () {
      if (this.headerMode !== 'template') {
        this._showTemplateMessage(null);
        return {};
      }

      var error = validateTemplateSyntax(this.headerTemplate);
      var warning = null;

      // A preset applied unmodified is curated and verified against the live
      // API, so do not second-guess its field names with our narrower list.
      // Without this the shipped GISAID preset warns about {subtype} -- a
      // field that demonstrably works -- which reads as "this preset is
      // broken". Once the user edits the template it is theirs, and the
      // normal check resumes.
      var pristine = this._appliedPresetTemplate
        && this._appliedPresetTemplate === this.headerTemplate;

      if (!error && !pristine) {
        var known = this.availableFields.map(function (f) {
          return bareFieldName(f.field);
        });
        var unrecognised = templateFields(this.headerTemplate).filter(function (n) {
          return known.indexOf(n) === -1;
        });

        if (unrecognised.length > 0) {
          var name = unrecognised[0];
          var suggestion = known.filter(function (k) { return closeTo(name, k); })[0];
          warning = suggestion
            ? 'Unrecognised field {' + name + '} — did you mean {' + suggestion + '}?'
            : 'Unrecognised field {' + name + '}. If the collection has it the '
              + 'download will still work; if not, it will be left blank.';
          if (unrecognised.length > 1) {
            warning += ' (' + (unrecognised.length - 1) + ' more)';
          }
        }
      }

      this._showTemplateMessage(error ? { text: error, isError: true }
        : (warning ? { text: warning, isError: false } : null));

      return { error: error, warning: warning };
    },

    _showTemplateMessage: function (message) {
      if (!this.templateError) return;
      if (message) {
        this.templateError.innerHTML = this._escapeHtml(message.text);
        domClass.toggle(this.templateError, 'templateWarning', !message.isError);
        domClass.remove(this.templateError, 'dijitHidden');
      } else {
        domClass.add(this.templateError, 'dijitHidden');
      }
    },

    /**
     * Named delimiter choices.
     *
     * A dropdown rather than a bare text box because the useful values differ
     * only in whitespace -- ' | ' and '|' look identical in an input, and the
     * difference is visible in the output. Naming them makes the space
     * explicit. CUSTOM_DELIMITER falls back to a text field for anything else.
     */
    delimiterOptions: [
      { value: ' | ', label: 'Pipe  ( a | b )' },
      { value: '|', label: 'Pipe, no spaces  ( a|b )' },
      { value: ' ', label: 'Space  ( a b )' },
      { value: ', ', label: 'Comma  ( a, b )' },
      { value: '_', label: 'Underscore  ( a_b )' },
      { value: '', label: 'Nothing  ( ab )' }
    ],

    _populateDelimiterDropdown: function () {
      if (!this.descDelimiterSelect || this._delimiterDropdownReady) return;

      var self = this;
      domConstruct.empty(this.descDelimiterSelect);

      this.delimiterOptions.forEach(function (opt) {
        domConstruct.create('option', {
          value: opt.value,
          innerHTML: opt.label
        }, self.descDelimiterSelect);
      });

      domConstruct.create('option', {
        value: CUSTOM_DELIMITER,
        innerHTML: 'Custom…'
      }, this.descDelimiterSelect);

      this._delimiterDropdownReady = true;
    },

    /**
     * Point the controls at the current state. Called on (re)initialisation so
     * a loaded configuration shows up in the widgets rather than only in the
     * preview.
     */
    _syncDelimiterControls: function () {
      if (this.idTrailingCheck) {
        this.idTrailingCheck.checked = (this.idDelimiter === '|');
      }

      if (!this.descDelimiterSelect) return;

      var known = this.delimiterOptions.some(function (o) {
        return o.value === this.descriptionDelimiter;
      }, this);

      if (known) {
        this.descDelimiterSelect.value = this.descriptionDelimiter;
        domClass.add(this.descDelimiterCustom, 'dijitHidden');
      } else {
        this.descDelimiterSelect.value = CUSTOM_DELIMITER;
        this.descDelimiterCustom.value = this.descriptionDelimiter;
        domClass.remove(this.descDelimiterCustom, 'dijitHidden');
      }
    },

    _onDescDelimiterChange: function () {
      var value = this.descDelimiterSelect.value;

      if (value === CUSTOM_DELIMITER) {
        domClass.remove(this.descDelimiterCustom, 'dijitHidden');
        // Seed the box with the delimiter being replaced, so switching to
        // Custom is an edit rather than a blank slate.
        this.descDelimiterCustom.value = this.descriptionDelimiter;
        this.descDelimiterCustom.focus();
        this.descDelimiterCustom.select();
        return;
      }

      domClass.add(this.descDelimiterCustom, 'dijitHidden');
      this.descriptionDelimiter = value;
      this._updatePreview();
      this.notifyDataChanged();
    },

    _onDescDelimiterCustomInput: function () {
      // No trimming: leading and trailing spaces are significant here, which
      // is the whole reason the named options spell them out.
      this.descriptionDelimiter = this.descDelimiterCustom.value;
      this._updatePreview();
      this.notifyDataChanged();
    },

    _onIdTrailingChange: function () {
      this.idDelimiter = this.idTrailingCheck.checked ? '|' : '';
      this._updatePreview();
      this.notifyDataChanged();
    },

    /**
     * Get default fields for a data type
     */
    _getDefaultFieldsForDataType: function () {
      var dataType = this.context ? this.context.dataType : 'genome_feature';

      if (dataType === 'genome' || dataType === 'genome_sequence') {
        return [
          { field: 'genome_id', label: 'Genome ID' },
          { field: 'genome_name', label: 'Genome Name' },
          { field: 'accession', label: 'Accession' },
          { field: 'species', label: 'Species' },
          { field: 'strain', label: 'Strain' },
          { field: 'host_name', label: 'Host' },
          { field: 'isolation_country', label: 'Country' },
          { field: 'collection_date', label: 'Collection Date' }
        ];
      } else {
        // genome_feature — includes genome_metadata.* fields for join enrichment
        return [
          { field: 'patric_id', label: 'BV-BRC ID' },
          { field: 'feature_id', label: 'Feature ID' },
          { field: 'refseq_locus_tag', label: 'RefSeq Locus Tag' },
          { field: 'alt_locus_tag', label: 'Alt Locus Tag' },
          { field: 'gene', label: 'Gene Symbol' },
          { field: 'product', label: 'Product' },
          { field: 'feature_type', label: 'Feature Type' },
          { field: 'annotation', label: 'Annotation' },
          { field: 'accession', label: 'Accession' },
          { field: 'start', label: 'Start' },
          { field: 'end', label: 'End' },
          { field: 'strand', label: 'Strand' },
          { field: 'na_length', label: 'NA Length' },
          { field: 'aa_length', label: 'AA Length' },
          { field: 'genome_id', label: 'Genome ID' },
          { field: 'genome_name', label: 'Genome Name' },
          { field: 'taxon_id', label: 'Taxon ID' },
          { field: 'genome_metadata.strain', label: 'Genome Strain' },
          { field: 'genome_metadata.genome_status', label: 'Genome Status' },
          { field: 'genome_metadata.assembly_accession', label: 'Assembly Accession' },
          { field: 'genome_metadata.bioproject_accession', label: 'BioProject Accession' },
          { field: 'genome_metadata.biosample_accession', label: 'BioSample Accession' }
        ];
      }
    },

    /**
     * Populate the sequence ID field dropdown
     */
    _populateIdFieldDropdown: function () {
      var self = this;

      if (!this.idFieldSelect) return;

      // Clear existing options
      domConstruct.empty(this.idFieldSelect);

      // Add options
      this.availableFields.forEach(function (f) {
        var option = domConstruct.create('option', {
          value: f.field,
          innerHTML: f.label
        }, self.idFieldSelect);

        if (f.field === self.sequenceIdField) {
          option.selected = true;
        }
      });

      // Setup change handler if not already done
      if (!this._idFieldHandler) {
        this._idFieldHandler = on(this.idFieldSelect, 'change', function () {
          self.sequenceIdField = this.value;
          self._updatePreview();
          self.notifyDataChanged();
        });
        this._handlers.push(this._idFieldHandler);
      }
    },

    /**
     * Populate the field selection lists
     */
    _populateFieldLists: function () {
      var self = this;

      if (!this.availableFieldsList || !this.selectedFieldsList) return;

      // Clear existing
      domConstruct.empty(this.availableFieldsList);
      domConstruct.empty(this.selectedFieldsList);

      // Get fields that are already selected
      var selectedFieldNames = this.descriptionFields.map(function (f) {
        return f.field;
      });

      // Populate available fields (excluding those already selected)
      this.availableFields.forEach(function (f) {
        if (selectedFieldNames.indexOf(f.field) === -1) {
          self._createFieldItem(f, self.availableFieldsList, 'available');
        }
      });

      // Populate selected fields
      this.descriptionFields.forEach(function (f) {
        self._createFieldItem(f, self.selectedFieldsList, 'selected');
      });

      this._updateButtonStates();
    },

    /**
     * Create a field list item
     */
    _createFieldItem: function (field, container, type) {
      var self = this;

      var item = domConstruct.create('div', {
        'class': 'fieldItem',
        'data-field': field.field,
        innerHTML: '<span class="fieldLabel">' + field.label + '</span>'
      }, container);

      // Click to select
      var handler = on(item, 'click', function () {
        // Toggle selection
        if (domClass.contains(this, 'selected')) {
          domClass.remove(this, 'selected');
        } else {
          // Deselect others in the same list
          query('.fieldItem.selected', container).forEach(function (node) {
            domClass.remove(node, 'selected');
          });
          domClass.add(this, 'selected');
        }
        self._updateButtonStates();
      });

      this._handlers.push(handler);
      return item;
    },

    /**
     * Update button states based on selection
     */
    _updateButtonStates: function () {
      var availableSelected = query('.fieldItem.selected', this.availableFieldsList).length > 0;
      var selectedSelected = query('.fieldItem.selected', this.selectedFieldsList).length > 0;
      var selectedItems = query('.fieldItem', this.selectedFieldsList);

      if (this.addFieldBtn) {
        this.addFieldBtn.disabled = !availableSelected;
      }
      if (this.removeFieldBtn) {
        this.removeFieldBtn.disabled = !selectedSelected;
      }
      if (this.moveUpBtn) {
        var selectedNode = query('.fieldItem.selected', this.selectedFieldsList)[0];
        this.moveUpBtn.disabled = !selectedSelected || (selectedNode === selectedItems[0]);
      }
      if (this.moveDownBtn) {
        var selectedNode = query('.fieldItem.selected', this.selectedFieldsList)[0];
        this.moveDownBtn.disabled = !selectedSelected || (selectedNode === selectedItems[selectedItems.length - 1]);
      }
    },

    /**
     * Add selected field to description
     */
    _onAddField: function () {
      var self = this;
      var selectedNode = query('.fieldItem.selected', this.availableFieldsList)[0];
      if (!selectedNode) return;

      var fieldName = selectedNode.getAttribute('data-field');
      var field = this.availableFields.find(function (f) {
        return f.field === fieldName;
      });

      if (field) {
        this.descriptionFields.push(field);
        this._populateFieldLists();
        this._updatePreview();
        this.notifyDataChanged();
      }
    },

    /**
     * Remove selected field from description
     */
    _onRemoveField: function () {
      var self = this;
      var selectedNode = query('.fieldItem.selected', this.selectedFieldsList)[0];
      if (!selectedNode) return;

      var fieldName = selectedNode.getAttribute('data-field');
      this.descriptionFields = this.descriptionFields.filter(function (f) {
        return f.field !== fieldName;
      });

      this._populateFieldLists();
      this._updatePreview();
      this.notifyDataChanged();
    },

    /**
     * Move selected field up
     */
    _onMoveUp: function () {
      var selectedNode = query('.fieldItem.selected', this.selectedFieldsList)[0];
      if (!selectedNode) return;

      var fieldName = selectedNode.getAttribute('data-field');
      var idx = this.descriptionFields.findIndex(function (f) {
        return f.field === fieldName;
      });

      if (idx > 0) {
        var temp = this.descriptionFields[idx - 1];
        this.descriptionFields[idx - 1] = this.descriptionFields[idx];
        this.descriptionFields[idx] = temp;
        this._populateFieldLists();
        // Reselect the moved item
        var newNode = query('.fieldItem[data-field="' + fieldName + '"]', this.selectedFieldsList)[0];
        if (newNode) domClass.add(newNode, 'selected');
        this._updatePreview();
        this.notifyDataChanged();
      }
    },

    /**
     * Move selected field down
     */
    _onMoveDown: function () {
      var selectedNode = query('.fieldItem.selected', this.selectedFieldsList)[0];
      if (!selectedNode) return;

      var fieldName = selectedNode.getAttribute('data-field');
      var idx = this.descriptionFields.findIndex(function (f) {
        return f.field === fieldName;
      });

      if (idx < this.descriptionFields.length - 1) {
        var temp = this.descriptionFields[idx + 1];
        this.descriptionFields[idx + 1] = this.descriptionFields[idx];
        this.descriptionFields[idx] = temp;
        this._populateFieldLists();
        // Reselect the moved item
        var newNode = query('.fieldItem[data-field="' + fieldName + '"]', this.selectedFieldsList)[0];
        if (newNode) domClass.add(newNode, 'selected');
        this._updatePreview();
        this.notifyDataChanged();
      }
    },

    /**
     * Update the preview
     */
    /**
     * Build the header the way the server will.
     *
     * This must mirror p3_api util/fastaHeaderFormatter.js formatHeader(): the
     * preview previously hardcoded ' | ' between description fields while the
     * server joined them with a space, so the preview promised a layout the
     * download never produced. Deriving both from the same delimiter values is
     * the actual fix -- keep this in step with getData().
     *
     * Note the server appends a TRAILING id delimiter after the ID section
     * (fastaHeaderFormatter.js, "matches legacy format"), which is why the
     * preview shows e.g. ">patric_id|" and not ">patric_id".
     */
    _buildPreview: function () {
      if (this.headerMode === 'template') {
        // Render the template the way the server will: substitute each
        // {field} with the field name itself. Escaped braces are masked
        // first and restored last, so a literal brace is never mistaken for
        // a field delimiter.
        var masked = String(this.headerTemplate || '');
        masked = masked.split('{{').join(ESCAPED_OPEN);
        masked = masked.split('}}').join(ESCAPED_CLOSE);

        var rendered = masked.replace(TEMPLATE_FIELD, function (match, raw) {
          var name = raw.trim();
          return name || match;
        });

        rendered = rendered.split(ESCAPED_OPEN).join('{');
        rendered = rendered.split(ESCAPED_CLOSE).join('}');
        return '>' + rendered;
      }

      var idField = this.sequenceIdField || 'id';
      var descFields = this.descriptionFields.map(function (f) {
        return f.field;
      });

      var id = idField + (this.idDelimiter || '');
      var parts = ['>' + id];

      if (descFields.length > 0) {
        parts.push(descFields.join(this.descriptionDelimiter));
      }

      return parts.join(' ');
    },

    _updatePreview: function () {
      if (!this.previewNode) return;
      this.previewNode.innerHTML = '<code>' + this._escapeHtml(this._buildPreview()) + '</code>';
    },

    /**
     * Field names and delimiters are user-influenced and land in innerHTML; a
     * delimiter of '<b>' should render as text, not markup.
     */
    _escapeHtml: function (s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    },

    /**
     * Validate
     */
    validate: function () {
      if (this.headerMode === 'template') {
        // Only a syntax error blocks; an unrecognised field is a warning,
        // since our field list is narrower than the collection's.
        var result = this._validateTemplate();
        if (result.error) {
          return { valid: false, message: result.error };
        }
        return true;
      }

      if (!this.sequenceIdField) {
        return {
          valid: false,
          message: 'Please select a field for the sequence ID.'
        };
      }
      return true;
    },

    /**
     * Get step data
     */
    getData: function () {
      // In template mode the zone values are omitted entirely rather than
      // sent alongside, matching the server: http_fasta_header makes it
      // ignore them, and sending both would imply a merge that never happens.
      if (this.headerMode === 'template') {
        return {
          headerMode: 'template',
          headerTemplate: this.headerTemplate,
          // Retained so switching back restores the picker, but not sent.
          sequenceIdField: this.sequenceIdField
        };
      }

      return {
        headerMode: 'zones',
        sequenceIdField: this.sequenceIdField,
        descriptionFields: this.descriptionFields.map(function (f) {
          return f.field;
        }),
        idDelimiter: this.idDelimiter,
        descriptionDelimiter: this.descriptionDelimiter
      };
    },

    /**
     * Reset
     */
    reset: function () {
      this.inherited(arguments);
      this.sequenceIdField = null;
      this.descriptionFields = [];
      // Delimiters are part of the step's state, so a reset must restore their
      // defaults too -- otherwise a reused step silently carries the previous
      // download's choices into the next one.
      this.idDelimiter = '|';
      this.descriptionDelimiter = ' | ';
      this.headerMode = 'zones';
      this.headerTemplate = '';
      this._pendingSelection = null;
      this._appliedPresetTemplate = null;
      if (this.savedFormatSelect) this.savedFormatSelect.value = this.NO_FORMAT;
      this._initializeFields();
    },

    /**
     * Destroy
     */
    destroy: function () {
      this._handlers.forEach(function (h) {
        h.remove();
      });
      this._handlers = [];
      this.inherited(arguments);
    }
  });
});
