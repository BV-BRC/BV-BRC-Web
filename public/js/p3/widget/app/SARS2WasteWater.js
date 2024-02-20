define([
  'dojo/_base/declare', 'dojo/on', 'dojo/topic',
  'dojo/text!./templates/SARS2Wastewater.html', './AppBase', 'dojo/dom-construct', 'dojo/_base/lang',
  'dojo/store/Memory', 'dojo/domReady!',
  'dojo/query', '../SARS2WastewaterGrid', '../../store/SARS2WastewaterStore', '../../DataAPI', '../../WorkspaceManager'

  // 'dojo/query', '../MetaCATSGrid', '../../store/MetaCATSStore', '../../DataAPI', '../../WorkspaceManager'
], function (
  declare, on, Topic,
  Template, AppBase, domConstruct, lang,
  Memory, domready,
  query, MetaCATSGrid, MetaCATSStore, DataAPI, WorkspaceManager
) {
  return declare([AppBase], {
    baseClass: 'App SARS2Wastewater Analysis',
    pageTitle: 'SARS-CoV-2 Wastewater | BV-BRC',
    templateString: Template,
    applicationName: 'SARS2Wastewater',
    requireAuth: true,
    applicationLabel: 'SARS-CoV-2 Wastewater Analysis',
    applicationDescription: 'The SARS-CoV-2 Wastewater Analysis assembles raw reads with the Sars One Codex pipeline and preforms vairant analysis with Freyja',
    applicationHelp: 'quick_references/services/sars_cov_2_wastewater_analysis_service.html',
    tutorialLink: 'tutorial/sars_cov_2_assembly_annotation/sars_cov_2_wastewater.html',
    videoLink: '',
    appBaseURL: 'SARS2WasteWater',
    libraryData: null,
    libCreated: 0,
    defaultPath: '',
    startingRows: 14,
    g_startingRows: 10,
    maxGroups: 10,
    minGroups: 2,
    autoGroupCount: 0,
    yearRangeStore: '',
    srrValidationUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?retmax=1&db=sra&field=accn&term={0}&retmode=json',
    srrValidationUrl2: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?retmax=10&db=sra&id={0}', // the data we need is in xml string no matter what. might as well get it properly nested
    // below are from annotation
    required: true,
    genera_four: ['Acholeplasma', 'Entomoplasma', 'Hepatoplasma', 'Hodgkinia', 'Mesoplasma', 'Mycoplasma', 'Spiroplasma', 'Ureaplasma'],
    code_four: false,

    constructor: function () {
      this.addedLibs = { counter: 0 };
      this.pairToAttachPt = ['read1', 'read2'];
      this.singleToAttachPt = ['single_end_libsWidget'];
      this.libraryStore = new Memory({ data: [], idProperty: '_id', sample_id:[] });
      this.srrSampleIDAttachPt = ['srr_accession_validation_message'];
      this._selfSet = true;
      this.addedGroups = 0;
      this.featureGroupToAttachPt = ['user_genomes_featuregroup'];
      this.userGenomeList = [];
    },

    startup: function () {
      var _self = this;
      if (this._started) {
        return;
      }
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }
      this.inherited(arguments);
      for (var i = 0; i < this.startingRows; i++) {
        var tr = this.libsTable.insertRow(0);// domConstr.create("tr",{},this.libsTableBody);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }
      // this.numlibs.startup();

      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
      _self.output_path.set('value', _self.defaultPath);
      this.emptyTable(this.groupsTable, this.g_startingRows);
      this.numgenomes.startup();
      // this.onInputTypeChange();
      this.auto_grouping_table.style.display = 'table'
      this._started = true;
      this.form_flag = false;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
      }
    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
    },

    onInputTypeChange: function () {
      // if (this.input_groups.checked == true) {
      //   this.feature_groups_table.style.display = 'table';
      //   this.alignment_files_table.style.display = 'none';
      //   this.auto_grouping_table.style.display = 'none';
      // }
      // else if (this.input_files.checked == true) {
      //   this.feature_groups_table.style.display = 'none';
      //   this.alignment_files_table.style.display = 'table';
      //   this.auto_grouping_table.style.display = 'none';
      // }
      // else if (this.input_auto.checked == true) {
// this is the one we want
        if (this.input_auto.checked == true) {
        this.feature_groups_table.style.display = 'none';
        this.alignment_files_table.style.display = 'none';
        this.auto_grouping_table.style.display = 'table';
      }
    },

    ingestAttachPoints: function (input_pts, target, req) {
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      input_pts.forEach(function (attachname) {
        var cur_value = null;
        if (attachname == 'user_genomes_featuregroup') {
          cur_value = this[attachname].searchBox.value;
          var compGenomeList = query('.genomedata');
          var genomeIds = [];
          compGenomeList.forEach(function (item) {
            genomeIds.push(item.genomeRecord.user_genomes_featuregroup);
          });
          if (genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
          {
            success = 0;
          }
        } else {
          cur_value = this[attachname].value;
        }
        if (typeof (cur_value) == 'string') {
          target[attachname] = cur_value.trim();
        }
        else {
          target[attachname] = cur_value;
        }
        this[attachname]._set('state', '');
        if (target[attachname] != '') {
          target[attachname] = target[attachname] || undefined;
        }
        else if (target[attachname] == 'true') {
          target[attachname] = true;
        }
        else if (target[attachname] == 'false') {
          target[attachname] = false;
        }
      }, this);
      return (success);
    },

    emptyTable: function (target, rowLimit) {
      for (var i = 0; i < rowLimit; i++) {
        var tr = target.insertRow(0);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }
    },

    makeLibraryName: function (mode) {
      switch (mode) {
        case 'paired':
          var fn = this.read1.searchBox.get('displayedValue');
          var fn2 = this.read2.searchBox.get('displayedValue');
          var maxName = 14;
          if (fn.length > maxName) {
            fn = fn.substr(0, (maxName / 2) - 2) + '...' + fn.substr((fn.length - (maxName / 2)) + 2);
          }
          if (fn2.length > maxName) {
            fn2 = fn2.substr(0, (maxName / 2) - 2) + '...' + fn2.substr((fn2.length - (maxName / 2)) + 2);
          }
          return 'P(' + fn + ', ' + fn2 + ')';

        case 'single':
          var fn = this.single_end_libsWidget.searchBox.get('displayedValue');
          maxName = 24;
          if (fn.length > maxName) {
            fn = fn.substr(0, (maxName / 2) - 2) + '...' + fn.substr((fn.length - (maxName / 2)) + 2);
          }
          return 'S(' + fn + ')';

        case 'srr_accession':
          var name = this.srr_accession.get('value');
          return '' + name;

        default:
          return '';
      }
    },

    makeLibraryID: function (mode) {
      switch (mode) {
        case 'paired':
          var fn = this.read1.searchBox.get('value');
          var fn2 = this.read2.searchBox.get('value');
          return fn + fn2;

        case 'single':
          var fn = this.single_end_libsWidget.searchBox.get('value');
          return fn;

        case 'srr_accession':
          var name = this.srr_accession.get('value');
          return name;

        default:
          return false;
      }
    },
    validate: function () {
      var ans = this.inherited(arguments);
      // if (ans) {
      //   var p_value = parseFloat(this['p_value'].value);
      //   if (!(p_value && (p_value <= 1 && p_value > 0))) {
      //     ans = false;
      //   }
      // }
      // if (ans) {
      //   if (this.input_groups.checked == true) {
      //     ans = this.numgenomes >= this.minGroups && this.numgenomes <= this.maxGroups;
      //   } else if (this.input_files.checked == true) {
      //     if (!(this['alignment_file'].value && this['group_file'].value)) {
      //       ans = false;
      //     }
      //   } else if (this.input_auto.checked == true) {
      //     ans = this.autoGroupCount >= this.minGroups && this.autoGroupCount <= this.maxGroups;
      //   }
      // }
      if (!ans) {
        this.submitButton.set('disabled', true);
      }
      return ans;
    },
    // managing samples and sample ids
    setSrrId: function () {
      var srr_user_input = this.srr_accession.get('displayedValue');
      this.srr_sample_id.set('value', this.replaceInvalidChars(srr_user_input.split('.')[0]));
    },

    onAddSingle: function () {
      var lrec = { _type: 'single' };
      var chkPassed = this.ingestAttachPoints(this.singleToAttachPt, lrec);
      if (chkPassed) {
        chkPassed = this.checkForInvalidChars(this.single_sample_id.getValue());
      }
      if (chkPassed) {
        var infoLabels = {
          platform: { label: 'Platform', value: 1 },
          read: { label: 'Read File', value: 1 }
        };
        lrec.sample_id = this.single_sample_id.get('displayedValue');
        this.addLibraryRow(lrec, infoLabels, 'singledata');
      }
    },

    setSingleId: function () {
      var read_name = this.single_end_libsWidget.searchBox.get('displayedValue');
      this.single_sample_id.set('value', this.replaceInvalidChars(read_name.split('.')[0]));
    },

    onAddSRR: function () {
      var accession = this.srr_accession.get('value');
      if ( !accession.match(/^[a-z0-9]+$/i)) {
        this.srr_accession_validation_message.innerHTML = ' Your input is not valid.<br>Hint: only one SRR at a time.';
      }
      else {
        // SRR5121082
        this.srr_accession.set('disabled', true);
        this.srr_accession_validation_message.innerHTML = ' Validating ' + accession + ' ...';
        xhr.get(lang.replace(this.srrValidationUrl, [accession]), { headers: { 'X-Requested-With': null } })
          .then(lang.hitch(this, function (json_resp) {
            var resp = JSON.parse(json_resp);
            try {
              var chkPassed = resp['esearchresult']['count'] > 0;
              var uid = resp['esearchresult']['idlist']['0'];
              var title = '';
              if (chkPassed) {
                xhr.get(lang.replace(this.srrValidationUrl2, [uid]), { headers: { 'X-Requested-With': null } })
                  .then(lang.hitch(this, function (xml_resp) {
                    try {
                      var xresp = xmlParser.parse(xml_resp).documentElement;
                      title = '';
                      title = xresp.children[0].childNodes[3].children[1].childNodes[0].innerHTML;
                    }
                    catch (e) {
                      console.error('could not get title from SRA record');
                    }
                    var lrec = { _type: 'srr_accession', title: title };
                    var chkPassed = this.ingestAttachPoints(['srr_accession'], lrec);
                    if (chkPassed) {
                      var infoLabels = {
                        title: { label: 'Title', value: 1 }
                      };
                      this.addLibraryRow(lrec, infoLabels, 'srrdata');
                    }
                    this.srr_accession_validation_message.innerHTML = '';
                    this.srr_accession.set('disabled', false);
                  }));
              }
              else {
                throw new Error('No ids returned from esearch');
              }
            } catch (e) {
              console.error(e);
              this.srr_accession.set('disabled', false);
              this.srr_accession_validation_message.innerHTML = ' Your input ' + accession + ' is not valid';
              this.srr_accession.set('value', '');
            }
          }));
      }
    },

    destroyLibRow: function (query_id, id_type) {
      var query_obj = {};
      query_obj[id_type] = query_id;
      var toRemove = this.libraryStore.query(query_obj);
      toRemove.forEach(function (obj) {
        domConstruct.destroy(obj._row);
        this.decreaseRows(this.libsTable, this.addedLibs, this.numlibs);
        if (this.addedLibs.counter < this.startingRows) {
          var ntr = this.libsTable.insertRow(-1);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        }
        obj._handle.remove();
        this.libraryStore.remove(obj._id);
      }, this);
    },

    setPairedId: function () {
      var read_name = this.read1.searchBox.get('displayedValue');
      this.paired_sample_id.set('value', this.replaceInvalidChars(read_name.split('.')[0]));
    },

    onAddPair: function () {
      if (this.read1.searchBox.get('value') == this.read2.searchBox.get('value')) {
        var msg = 'READ FILE 1 and READ FILE 2 cannot be the same.';
        new Dialog({ title: 'Notice', content: msg }).show();
        return;
      }
      if (chkPassed) {
        chkPassed = this.checkForInvalidChars(this.paired_sample_id.getValue());
      }
      var lrec = { _type: 'paired' };
      var pairToIngest = this.pairToAttachPt;
      var chkPassed = this.ingestAttachPoints(pairToIngest, lrec);
      if (chkPassed) {
        var infoLabels = {
          platform: { label: 'Platform', value: 1 },
          read1: { label: 'Read1', value: 1 },
          read2: { label: 'Read2', value: 1 }
        };
        lrec.sample_id = this.paired_sample_id.get('displayedValue');
        this.addLibraryRow(lrec, infoLabels, 'pairdata');
      }
    },

    addLibraryRow: function (lrec, infoLabels, mode) {
      var tr = this.libsTable.insertRow(0);
      lrec._row = tr;
      var td = domConstruct.create('td', { 'class': 'textcol ' + mode, libID: this.libCreated, innerHTML: '' }, tr);
      var advInfo = [];

      switch (mode) {
        case 'pairdata':
          td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName('paired') + '</div>';
          advInfo.push('Paired Library');
          break;

        case 'singledata':
          td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName('single') + '</div>';
          advInfo.push('Single Library');
          break;

        case 'srrdata':
          td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName('srr_accession') + '</div>';
          advInfo.push('SRA run accession');
          break;

        default:
          console.error('wrong data type', lrec, infoLabels, mode);
          break;
      }
      // fill out the html of the info mouse over
      Object.keys(infoLabels).forEach(lang.hitch(this, function (key) {
        if (lrec[key] && lrec[key] != 'false') {
          if (infoLabels[key].value) {
            advInfo.push(infoLabels[key].label + ':' + lrec[key]);
          }
          else {
            advInfo.push(infoLabels[key].label);
          }
        }
      }));
      if (advInfo.length) {
        var tdinfo = domConstruct.create('td', { innerHTML: "<i class='fa icon-info fa-1' />" }, tr);
        var ihandle = new TooltipDialog({
          content: advInfo.join('</br>'),
          onMouseLeave: function () {
            popup.close(ihandle);
          }
        });
        on(tdinfo, 'mouseover', function () {
          popup.open({
            popup: ihandle,
            around: tdinfo
          });
        });
        on(tdinfo, 'mouseout', function () {
          popup.close(ihandle);
        });
      }
      else {
        var tdinfo = domConstruct.create('td', { innerHTML: '' }, tr);
      }
      var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
      if (this.addedLibs.counter < this.startingRows) {
        this.libsTable.deleteRow(-1);
      }
      var handle = on(td2, 'click', lang.hitch(this, function (evt) {
        this.destroyLibRow(lrec._id, '_id');
      }));
      this.libraryStore.put(lrec);
      lrec._handle = handle;
      this.increaseRows(this.libsTable, this.addedLibs, this.numlibs);
      this.checkParameterRequiredFields();
    },

    getNumberGroups: function () {
      const groups = new Set();
      const rows = this.grid.store.query(function (object) {
        return true;
      });
      var exist = false;
      for (var i = 0; i < rows.length; i++) {
        const row = rows[i];
        groups.add(row.group);
        exist = true;
      }
      this.autoGroupCount = groups.size;
      var ans = this.autoGroupCount >= this.minGroups && this.autoGroupCount <= this.maxGroups;
      if (!ans) {
        this.num_auto_groups.style.color = 'red';
      } else {
        this.num_auto_groups.style.color = 'black';
      }
      if (exist) {
        this.num_auto_groups.innerHTML = 'Max groups 10. Current ' + this.autoGroupCount + ' groups.';
      } else {
        this.num_auto_groups.innerHTML = '';
      }
      this.validate();
      return groups.size;
    },

    makeFeatureGroupName: function () {
      var name = this.user_genomes_featuregroup.searchBox.get('displayedValue');
      var maxName = 36;
      var display_name = name;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }
      return display_name;
    },

    getValues: function () {
      var values = this.inherited(arguments);
      values.p_value = parseFloat(this['p_value'].value);
      delete values.user_genomes_featuregroup;
      delete values.auto_feature_group;
      delete values.metadata_group;
      delete values.name_list;
      values.alphabet = 'na';
      if (this.input_groups.checked == true) {
        values.input_type = 'groups';
        delete values.year_ranges;
        delete values.alignment_file;
        delete values.group_file;
        delete values.metadata_group;
        delete values.auto_alphabet;
        if (values.group_alphabet == 'protein') {
          values.alphabet = 'aa';
        }
        delete values.group_alphabet;
        var compGenomeList = query('.genomedata');
        var userGroups = [];
        compGenomeList.forEach(function (item) {
          if (item.genomeRecord.user_genomes_featuregroup) {
            userGroups.push(item.genomeRecord.user_genomes_featuregroup);
          }
        });
        values.groups = userGroups;
      } else if (this.input_files.checked == true) {
        values.input_type = 'files';
        delete values.year_ranges;
        delete values.group_alphabet;
        delete values.auto_alphabet;
        delete values.metadata_group;
        var alignment_type = null;
        if (this['alignment_file'].searchBox.onChange.target.item) {
          alignment_type = this['alignment_file'].searchBox.onChange.target.item.type;
        }
        if (alignment_type.includes('protein')) {
          values.alphabet = 'aa';
        }
        delete values.group_alphabet;
      } else if (this.input_auto.checked == true) {
        values.input_type = 'auto';
        values.metadata_group = this['metadata_group'].value;
        delete values.alignment_file;
        delete values.group_file;
        delete values.group_alphabet;
        if (values.auto_alphabet == 'protein') {
          values.alphabet = 'aa';
        }
        delete values.auto_alphabet;
        const rows = this.grid.store.query(function (object) {
          return true;
        });
        const auto_groups = [];
        rows.forEach(function (row) {
          auto_groups.push({
            id: row.patric_id,
            metadata: row.metadata,
            grp: row.group,
            g_id: row.genome_id
          });
        });
        values.auto_groups = auto_groups;
      } else {
        console.log('Incorrect input.');
      }
      return values;
    },

    // controlYear: function () {
    //   this.validate();
    //   if (this.metadata_group.value == 'collection_year') {
    //     query('.year_range_div').style('visibility', 'visible');
    //     this.year_ranges.set('value', this.yearRangeStore);
    //     this.yearRangeStore = '';
    //   } else {
    //     query('.year_range_div').style('visibility', 'hidden');
    //     if (this.yearRangeStore == '') {
    //       this.yearRangeStore = this.year_ranges.value;
    //     }
    //     this.year_ranges.set('value', '');
    //   }
    // },

    // getRanges: function () {
    //   var year_ranges = this.year_ranges.value.replace(/\s+/g, '');
    //   var ans = []
    //   if (year_ranges) {
    //     year_ranges.split(',').forEach(function (item) {
    //       ans.push(item.split('-').map(function (thing) {
    //         return parseInt(thing);
    //       }));
    //     });
    //   }
    //   return ans;
    // },
    // onAddAutoGroup: function () {
    //   query('.auto_feature_button').style('visibility', 'hidden');
    //   var self = this;
    //   var my_group = this.auto_feature_group.value;
    //   var metadata_value = this.metadata_group.value;
    //   this.metadata_group.set('disabled', true);
    //   DataAPI.queryGenomeFeatures('in(feature_id,FeatureGroup(' + encodeURIComponent(my_group) + '))', { 'limit' : 1000 })
    //     .then((result) => {
    //       const genome_map = new Map();
    //       result.items.forEach(function (sel) {
    //         if (genome_map.has(sel.genome_id)) {
    //           genome_map.get(sel.genome_id).push(sel.patric_id);
    //         } else {
    //           genome_map.set(sel.genome_id, [sel.patric_id]);
    //         }
    //       });
    //       return genome_map;
    //     }).catch(error => { console.log('Genome feature query failed.'); })
    //     .then((genome_map) => {
    //       DataAPI.queryGenomes(`in(genome_id,(${Array.from(genome_map.keys()).join(',')}))`, { 'limit' : 1000 })
    //         .then((genome_results) => {
    //           var group_names = new Set();
    //           var ranges = [];
    //           var year_groups = [];
    //           if (metadata_value == 'collection_year') {
    //             ranges = self.getRanges();
    //             if (ranges.length > 0) {
    //               year_groups.push('<=' + ranges[0][0]);
    //               for (var i = 1; i < ranges.length - 1; i++) {
    //                 year_groups.push(ranges[i][0] + '-' + ranges[i][1]);
    //               }
    //               year_groups.push('>=' + ranges[ranges.length - 1][0]);
    //               year_groups.forEach(function (grp) {
    //                 group_names.add(grp);
    //               });
    //             }
    //           }
    //           genome_results.items.forEach(function (genome) {
    //             const m_value = genome[metadata_value] === undefined ? '' : genome[metadata_value];
    //             var g_value = m_value;
    //             // Parse the year ranges.
    //             if (metadata_value != 'collection_year' || ranges.length == 0) {
    //               group_names.add(m_value.toString());
    //             } else if (metadata_value == 'collection_year') {
    //               if (m_value) {
    //                 if (m_value <= ranges[0]) {
    //                   g_value = year_groups[0];
    //                 } else if (m_value >= ranges[ranges.length - 1]) {
    //                   g_value = year_groups[ranges.length - 1];
    //                 } else {
    //                   for (var i = 1; i < ranges.length - 1; i++) {
    //                     if (m_value >= ranges[i][0] && m_value <= ranges[i][1]) {
    //                       g_value = year_groups[i];
    //                       break;
    //                     }
    //                   }
    //                   if (m_value == g_value) {
    //                     group_names.add(m_value.toString());
    //                   }
    //                 }
    //               } else {
    //                 group_names.add(m_value.toString());
    //               }
    //             }
    //             var feature_ids = genome_map.get(genome.genome_id);
    //             feature_ids.forEach(function (feature_id) {
    //               if (self.grid.store.query({ patric_id: feature_id }).length == 0) {
    //                 self.grid.store.put({
    //                   patric_id: feature_id,
    //                   metadata: m_value.toString(),
    //                   group: g_value.toString(),
    //                   genome_id: genome.genome_id
    //                 });
    //               }
    //             });
    //           });
    //           Array.from(group_names).forEach(function (name) {
    //             self.name_store.put({ id: name.toString() });
    //           });
    //           self.grid.refresh();
    //           self.getNumberGroups();
    //           if (self.grid.store.data.length == 0) {
    //             this.metadata_group.set('disabled', false);
    //           }
    //         }).catch(error => {
    //           if (self.grid.store.data.length == 0) {
    //             this.metadata_group.set('disabled', false);
    //           }
    //           console.log('Genome query failed.');
    //         })
    //     })
    //     .finally(() => {
    //       query('.auto_feature_button').style('visibility', 'visible');
    //     });
    // },

    deleteAutoRows: function () {
      for (var id in this.grid.selection) {
        if (id) {
          this.grid.store.remove(id);
        }
      }
      this.grid.refresh();
      this.getNumberGroups();
      if (this.grid.store.data.length == 0) {
        this.metadata_group.set('disabled', false);
        this.name_store.data = [];
      }
    },

    updateGroup: function () {
      if (this.grid.store.data.length == 0) {
        return;
      }
      const new_group = this.name_list.value;
      for (var id in this.grid.selection) {
        if (id) {
          const q = this.grid.store.query({ patric_id: id });
          q[0].group = new_group;
          this.grid.store.put(q[0]);
        }
      }
      this.grid.refresh();
      this.name_store.put({ id: new_group });
      this.getNumberGroups();
    },

    onRecipeChange: function () {
      if (this.recipe.value == 'cdc-illumina') {
        this.primers.set('disabled', true);
        this.primer_version.set('disabled', true);

      }
      if (this.recipe.value == 'cdc-nanopore') {
        this.primers.set('disabled', true);
        this.primer_version.set('disabled', true);
      }
      if (this.recipe.value == 'artic-nanopore') {
        this.primers.set('disabled', true);
        this.primer_version.set('disabled', true);
      }
      // Disabling auto for now. Not sure if needed down the line.
      // if (this.recipe.value == 'auto') {
      //   this.primers.set('disabled', true);
      //   this.primer_version.set('disabled', true);
      // }
      if (this.recipe.value == 'onecodex') {
        this.primers.set('disabled', false);
        this.primer_version.set('disabled', false);
      }
    },

    onPrimersChange: function (value) {
      var articOptions = [
        { label: 'V5.3.2', value: 'V5.3.2' },
        { label: 'V4.1', value: 'V4.1' },
        { label: 'V4', value: 'V4' },
        { label: 'V3', value: 'V3' },
        { label: 'V2', value: 'V2' },
        { label: 'V1', value: 'V1' }
      ];
      var midnightOptions = [
        { label: 'V1', value: 'V1' }
      ];
      var qiagenOptions = [
        { label: 'V1', value: 'V1' }
      ];
      var swiftOptions = [
        { label: 'V1', value: 'V1' }
      ];
      var varskipOptions = [
        { label: 'V2', value: 'V2' },
        { label: 'V1a', value: 'V1a' }
      ];
      var varskipLongOptions = [
        { label: 'V1a', value: 'V1a' }
      ];

      if (value === 'midnight') {
        this.primer_version.set('options', midnightOptions);
        this.primer_version.set('value', 'V1');
      }
      else if (value === 'qiagen') {
        this.primer_version.set('options', qiagenOptions);
        this.primer_version.set('value', 'V1');
      }
      else if (value === 'swift') {
        this.primer_version.set('options', swiftOptions);
        this.primer_version.set('value', 'V1');
      }
      else if (value === 'varskip') {
        this.primer_version.set('options', varskipOptions);
        this.primer_version.set('value', 'V2');
      }
      else if (value === 'varskip-long') {
        this.primer_version.set('options', varskipLongOptions);
        this.primer_version.set('value', 'V1a');
      }
      else if (value === 'ARTIC') {
        this.primer_version.set('options', articOptions);
        this.primer_version.set('value', 'V5.3.2');
      }
      else {
        console.log('Invalid Selection');
      }
    },

    onTaxIDChange: function (val) {
      this._autoNameSet = true;
      var tax_id = this.tax_idWidget.get('item').taxon_id;
      // var tax_obj=this.tax_idWidget.get("item");
      if (tax_id) {
        var name_promise = this.scientific_nameWidget.store.get(tax_id);
        name_promise.then(lang.hitch(this, function (tax_obj) {
          if (tax_obj) {
            this.scientific_nameWidget.set('item', tax_obj);
            this.scientific_nameWidget.validate();
            // this.changeCode(this.tax_idWidget.get('item'));
          }
        }));
      }
      this._autoTaxSet = false;
    },

    updateOutputName: function () {
      var charError = document.getElementsByClassName('charError')[0];
      charError.innerHTML = '&nbsp;';
      var current_output_name = [];
      var sci_item = this.scientific_nameWidget.get('item');
      var label_value = this.myLabelWidget.get('value');
      if (label_value.indexOf('/') !== -1 || label_value.indexOf('\\') !== -1) {
        return charError.innerHTML = 'slashes are not allowed';
      }
      if (sci_item && sci_item.lineage_names.length > 0) {
        current_output_name.push(sci_item.lineage_names.slice(-1)[0].replace(/\(|\)|\||\/|:/g, ''));
      }
      if (label_value.length > 0) {
        current_output_name.push(label_value);
      }
      if (current_output_name.length > 0) {
        this.output_nameWidget.set('value', current_output_name.join(' '));
      }
      this.checkParameterRequiredFields();
    },

    onSuggestNameChange: function (val) {
      this._autoTaxSet = true;
      var tax_id = this.scientific_nameWidget.get('value');
      if (tax_id) {
        this.tax_idWidget.set('displayedValue', tax_id);
        this.tax_idWidget.set('value', tax_id);
        // this.changeCode(this.scientific_nameWidget.get('item'));
        this.updateOutputName();
      }
      this._autoNameSet = false;
    },

    onOutputPathChange: function (val) {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    checkParameterRequiredFields: function () {
      if (this.scientific_nameWidget.get('item') && this.myLabelWidget.get('value')
         && this.output_path.get('value') && this.output_nameWidget.get('displayedValue') ) {
        this.validate();
      }
      else {
        if (this.submitButton) { this.submitButton.set('disabled', true); }
      }
    },

    replaceInvalidChars: function (value) {
      var invalid_chars = ['-', ':', '@', '"', "'", ';', '[', ']', '{', '}', '|', '`'];
      invalid_chars.forEach(lang.hitch(this, function (char) {
        value = value.replaceAll(char, '_');
      }));
      return value;
    },

    onAddFeatureGroup: function () {
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.featureGroupToAttachPt, lrec);
      console.log('test')
      if (chkPassed && this.addedGroups < this.maxGroups) {
        var newGenomeIds = [lrec[this.featureGroupToAttachPt]];
        if (!newGenomeIds[0]) {
          return;
        }
        var tr = this.groupsTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeFeatureGroupName() + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGroups < this.g_startingRows) {
          this.groupsTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          domConstruct.destroy(tr);
          this.decreaseGenome();
          if (this.addedGroups < this.g_startingRows) {
            var ntr = this.groupsTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        this.increaseGenome();
      }
    },

    increaseGenome: function (genomeType, newGenomeIds) {
      this.addedGroups = this.addedGroups + 1;
      this.numgenomes.set('value', Number(this.addedGroups));
      this.validate();
    },

    decreaseGenome: function () {
      this.addedGroups = this.addedGroups - 1;
      this.numgenomes.set('value', Number(this.addedGroups));
      this.validate();
    },

    clearStore: function () {
      this.grid.store.data = [];
      this.grid.refresh();
      this.name_store.data = [];
      this.metadata_group.set('disabled', false);
      this.getNumberGroups();
    },

    onReset: function (evt) {
      this.inherited(arguments);
      for (var i = 0; i < this.addedGroups; i++) {
        this.groupsTable.deleteRow(0);
      }
      this.clearStore();
      this.emptyTable(this.groupsTable, this.addedGroups);
      this.addedGroups = 0;
      this.numgenomes.set('value', Number(this.addedGroups));
    },

    intakeRerunForm: function () {
      // assuming only one key
      var service_fields = window.location.search.replace('?', '');
      var rerun_fields = service_fields.split('=');
      var rerun_key;
      if (rerun_fields.length > 1) {
        try {
          rerun_key = rerun_fields[1];
          var sessionStorage = window.sessionStorage;
          if (sessionStorage.hasOwnProperty(rerun_key)) {
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            this.setInputFormFill(job_data);
            this.setParams(job_data);
            this.form_flag = true;
          }
        } catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        } finally {
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    setParams: function (job_data) {
      if (Object.keys(job_data).includes('p_value')) {
        this.p_value.set('value', job_data['p_value']);
      }
    },

    setInputFormFill: function (job_data) {
      if (job_data['input_type'] == 'files') {
        this.input_auto.set('checked', false);
        this.input_groups.set('checked', false);
        this.input_files.set('checked', true);
        // add files
        this.alignment_file.set('value', job_data['alignment_file']);
        this.group_file.set('value', job_data['group_file']);
      } else if (job_data['input_type'] == 'groups') {
        this.input_auto.set('checked', false);
        this.input_files.set('checked', false);
        this.input_groups.set('checked', true);
        this.addFeatureGroupFormFill(job_data);
        this.setAlphabetFormFill(job_data, 'group');
      } else { // auto
        this.input_files.set('checked', false);
        this.input_groups.set('checked', false);
        this.input_auto.set('checked', true);
        this.setAlphabetFormFill(job_data, 'auto');
        this.addAutoGroupFormFill(job_data);
      }
    },

    addFeatureGroupFormFill: function (job_data) {
      job_data['groups'].forEach(function (group) {
        var lrec = {};
        lrec['user_genomes_featuregroup'] = group;
        var tr = this.groupsTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.genDisplayName(group) + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGroups < this.g_startingRows) {
          this.groupsTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          domConstruct.destroy(tr);
          this.decreaseGenome();
          if (this.addedGroups < this.g_startingRows) {
            var ntr = this.groupsTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        this.increaseGenome();
      }, this);
    },

    genDisplayName: function (name) {
      var display_name = name;
      var maxName = 72;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }
      return display_name;
    },

    setAlphabetFormFill: function (job_data, input_type) {
      if (job_data['alphabet'] == 'na') { // DNA
        if (input_type == 'group') {
          this.protein.set('checked', false);
          this.dna.set('checked', true);
        } else {
          this.auto_protein.set('checked', false);
          this.auto_dna.set('checked', true);
        }
      } else { // protein
        if (input_type == 'group') {
          this.dna.set('checked', false);
          this.protein.set('checked', true);
        } else {
          this.auto_dna.set('checked', false);
          this.auto_protein.set('checked', true);
        }
      }
    },

    addAutoGroupFormFill: function (job_data) {
      var self = this;
      var auto_groups = job_data['auto_groups'];
      if (Object.keys(job_data).includes('metadata_group')) {
        this.metadata_group.set('value', job_data['metadata_group']);
      }
      auto_groups.forEach(function (group) {
        if (self.grid.store.query({ patric_id: group['id'] }).length == 0) {
          self.grid.store.put({
            patric_id: group['id'],
            metadata: group['metadata'],
            group: group['grp'],
            genome_id: group['g_id']
          });
        }
      }, self);
      self.grid.refresh();
      self.getNumberGroups();
    },

    getGenomeIDs: function (job_data) {
      var genome_ids = [];
      var auto_groups = job_data['auto_groups'];
      auto_groups.forEach(function (g) {
        var feature_id = group['id'];
        var genome_id = '.'.join(feature_id.split('|')[1].split('.').slice(0, 2));
        if (!genome_ids.has(genome_id)) {
          genome_ids.push(genome_id);
        }
      }, this);
      return genome_ids;
    }
  });
});%                                                
