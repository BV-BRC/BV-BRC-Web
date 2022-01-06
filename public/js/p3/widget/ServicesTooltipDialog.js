define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-construct',
  'dojo/_base/lang', 'dojo/mouse',
  'dijit/popup', 'dijit/TooltipDialog',
  'dijit/Dialog', '../WorkspaceManager', '../DataAPI', './app/AppBase', './app/GenomeAlignment',
  './app/Homology', './app/MSA', './app/PrimerDesign'
], function (
  declare, on, domConstruct,
  lang, Mouse,
  popup, TooltipDialog,
  Dialog, WorkspaceManager, DataAPI, AppBase, GenomeAlignment, Homology, MSA, PrimerDesign
) {

  return declare([TooltipDialog], {
    selection: null,
    label: '',
    // selectionList: null,
    // genome_id: null,
    // genome_name: null,
    genome_info: null,

    /* featureDetailLabels: [
      { label: 'Phylogenetic Tree', link: 'phylogeneticTree' },
      { label: 'Similar Genome Finder', link: 'amr' },
      { label: 'Subsystems', link: 'phylogeny' },
      { label: 'Antimicrobial Resistance', link: 'browser' }
    ], */

    _setSelectionAttr: function (val) {
      // console.log("DownloadTooltipDialog set selection: ", val);
      this.selection = val;
    },
    timeout: function (val) {
      var _self = this;
      this._timer = setTimeout(function () {
        popup.close(_self);
      }, val || 2500);
    },

    onMouseEnter: function () {
      if (this._timer) {
        clearTimeout(this._timer);
      }

      this.inherited(arguments);
    },
    onMouseLeave: function () {
      popup.close(this);
    },

    startup: function () {
      if (this._started) {
        return;
      }
      on(this.domNode, Mouse.enter, lang.hitch(this, 'onMouseEnter'));
      on(this.domNode, Mouse.leave, lang.hitch(this, 'onMouseLeave'));
      // var _self = this;
      /*       on(this.domNode, '.wsActionTooltip:click', function (evt) {
        // console.log("evt.target: ", evt.target, evt.target.attributes);
        // var rel = evt.target.attributes.rel.value;

      }); */
      var _self = this;
      on(this.domNode, '.wsActionTooltip:click', function (evt) {
        // console.log("evt.target: ", evt.target, evt.target.attributes);
        var rel = evt.target.attributes.rel.value;
        _self.actOnSelection(rel);
      });

      var dstContent = domConstruct.create('div', {});
      this.labelNode = domConstruct.create('div', { style: 'background:#09456f;color:#fff;margin:0px;margin-bottom:4px;padding:4px;text-align:center;' }, dstContent);
      this.selectedCount = domConstruct.create('div', {}, dstContent);

      var table = domConstruct.create('table', {}, dstContent);
      var tr = domConstruct.create('tr', {}, table);
      var tData = this.tableCopyNode = domConstruct.create('td', { style: 'vertical-align:top;' }, tr);
      // spacer
      domConstruct.create('td', { style: 'width:10px;' }, tr);
      this.otherCopyNode = domConstruct.create('td', { style: 'vertical-align:top;' }, tr);

      tr = domConstruct.create('tr', {}, table);
      domConstruct.create('td', { colspan: 3, style: 'text-align:right' }, tr);

      this.set('content', dstContent);

      this._started = true;
      this.set('label', 'Services');
      this.set('selection', this.selection);

      // Check context and list appropriate services
      if (!this.context) {
        console.log('no context');
      } else {
        switch (this.context) {
          case 'feature':
            domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'blast', innerHTML: 'Blast' }, tData);
            domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'msa', innerHTML: 'MSA' }, tData);
            domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'primer_design', innerHTML: 'Primer Design' }, tData);
            // TODO: Maybe ID Mapper
            return;
          case 'genome':
            domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'blast', innerHTML: 'Blast' }, tData);
            //domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'genome_distance', innerHTML: 'Similar Genome Finder' }, tData);
            return;
          default:
            console.log('invalid context: displaying placeholder');
            domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'genome_alignment', innerHTML: 'Genome Alignment' }, tData);
            //domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'genome_distance', innerHTML: 'Similar Genome Finder' }, tData);
            domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'phylogentic_tree', innerHTML: 'Phylogenetic Tree' }, tData);
            domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'comparative_pathway', innerHTML: 'Comparative Pathway' }, tData);

        }
      }
    },

    actOnSelection: function (type) {
      console.log('type=', type);
      console.log('context=', this.context);
      if (type == 'genome_alignment') {

        var genomeAlignment = new GenomeAlignment();
        genomeAlignment.appParams = this.genome_info;


        // console.log("Selection: ", _self.selection);
        var d = new Dialog({
          title: 'Genome Alignment',
          content: genomeAlignment,
          onHide: function () {
            genomeAlignment.destroy();
            d.destroy();
          }
        });
        // var ad = new AdvancedDownload({ selection: _self.selection, containerType: _self.containerType });

        // domConstruct.place("junk", d.containerNode);
        d.show();

      }
      else if (type == 'primer_design') {
        var params = {
          'input_type': 'sequence_text',
          'SEQUENCE_ID': this.data.patric_id,
          'sequence_input': this.data.sequence
        };
        this._setJSONStorage(params);
        var primerDesign = new PrimerDesign();
        var d = new Dialog({
          title: 'Primer Design',
          content: primerDesign,
          onHide: function () {
            primerDesign.destroy();
            d.destroy();
          }
        });
        d.show();

      }
      else if (type == 'blast') {
        // TODO: finish after stuff has been deployed
        if (this.context === 'feature') {
          var params = {
            'input_fasta_data': '>' + this.data.patric_id + '\n' + this.data.sequence,
            'blast_program': 'blastn'
          };
          this._setJSONStorage(params);
        }
        // TODO: finish genomeGroup loading and such
        else if (this.context === 'genome') {
          var params = this.params.data.blast;
          // var params["input_fasta_data"] = ">InputSequence\nAACCTTGG";
          this._setJSONStorage(params);
        }
        var blastContent = new Homology();
        console.log('blastContent=', blastContent);
        var d = new Dialog({
          title: 'Blast',
          content: blastContent,
          onHide: function () {
            blastContent.destroy();
            d.destroy();
          }
        });
        d.show();

      }
      else if (type == 'msa') {
        if (this.context === 'feature') {
          //Set function
          on(this.domNode, '.msaSelectionTooltip:click',lang.hitch(this,function (evt) {
            // console.log("evt.target: ", evt.target, evt.target.attributes);
            var rel = evt.target.attributes.rel.value;
            //_self.actOnSelection(rel);
            console.log("rel=",rel);
            this._setupMSA(rel,this.data,this.multiple);
          }));
          //Get old content
          var ss_content = this.get("content");
          //switch with MSA selection
          var msa_select = domConstruct.create('div', {});
          domConstruct.create('div', { style: 'background:#09456f;color:#fff;margin:0px;margin-bottom:4px;padding:4px;text-align:center;',innerHTML:'SELECT' }, msa_select);
          var table = domConstruct.create('table', {}, msa_select);
          var tr = domConstruct.create('tr', {}, table);
          var td = this.tableCopyNode = domConstruct.create('td', { style: 'vertical-align:top;' }, tr);
          domConstruct.create('td', { style: 'width:10px;' }, tr);
          this.otherCopyNode = domConstruct.create('td', { style: 'vertical-align:top;' }, tr);

          tr = domConstruct.create('tr', {}, table);
          domConstruct.create('td', { colspan: 3, style: 'text-align:right' }, tr);
          domConstruct.create('div', { 'class': 'msaSelectionTooltip', rel: 'dna', innerHTML: 'Nucleotide' }, td);
          domConstruct.create('div', { 'class': 'msaSelectionTooltip', rel: 'aa', innerHTML: 'Amino Acid' }, td);
          //TODO: add a 'back' button?
          //TODO: figure out the highlight on hover issue
          this.set('content',msa_select);
          console.log("content=",this.get("content"));
        }
        else {
          params = {};
        }
      }
      /*
      else if (type == 'genome_distance') {
        if (this.context === 'genome') {
          var params = {
            'genome_id': this.data.genome_distance.genome_id
          };
        }
        else {
          var params = {};
        }
        this._setJSONStorage(params);
        var genomeDistanceContent = new GenomeDistance();
        var d = new Dialog({
          title: 'Similar Genome Finder',
          content: genomeDistanceContent,
          onHide: function () {
            genomeDistanceContent.destroy();
            d.destroy();
          }
        });
        d.show();
      }
      */
    },

    _setupMSA: function(seq_type,data,multiple) {
      //this._setJSONStorage(params);
      /*
          var params = {
            'input_status': 'unaligned',
            'input_type': 'input_sequence',
            'alphabet': 'dna'
          };
          if (this.multiple) {
            this.data.
          } else {
            params['fasta_keyboard_input'] = '>' + this.data.patric_id + '\n' + this.data.sequence;
          }*/
      console.log("seq_type=",seq_type);
      //TODO: change from onHide, set an 'x' button to destroy
      DataAPI.getFeatureSequence()
      var msaContent = new MSA();
      var d = new Dialog({
        title: 'MSA',
        content: msaContent,
        onHide: function () {
          msaContent.destroy();
          d.destroy();
        }
      });
      d.show();
    },

    _callMSA: function() {

    },

    _setJSONStorage: function (data) {
      var job_params = JSON.stringify(data);
      var localStorage = window.localStorage;
      if (localStorage.hasOwnProperty('bvbrc_rerun_job')) {
        localStorage.removeItem('bvbrc_rerun_job');
      }
      localStorage.setItem('bvbrc_rerun_job', job_params);
    },

    _setLabelAttr: function (val) {
      this.label = val;
      if (this._started) {
        this.labelNode.innerHTML = val;
      }
    }
  });

});
