/**
 * @module p3/widget/copilot/workflowForms/CopilotAssemblyForm
 * @description Dojo wrapper for GenomeAssembly2 service form, embedded in the Copilot Workflow Engine.
 * Strips page-level chrome and provides bidirectional data flow with the workflow manifest.
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/query',
  'p3/widget/app/Assembly2'
], function(declare, lang, domClass, domConstruct, query, Assembly2) {
  return declare([Assembly2], {
    /**
     * Skip auth guard: do not call inherited (login template swap).
     * Replicate only workspace path setup.
     */
    postMixInProperties: function() {
      this.activeWorkspace = this.activeWorkspace || window.App.activeWorkspace;
      var appPath = window.App.activeWorkspacePath;
      if (!appPath || appPath === '/' || (appPath.indexOf && appPath.indexOf('undefined') !== -1)) {
        appPath = '';
      }
      this.activeWorkspacePath = this.activeWorkspacePath || appPath;
    },

    /**
     * Strip page-level chrome after render.
     */
    postCreate: function() {
      this.inherited(arguments);
      query('.appTitle', this.domNode).forEach(function(node) {
        domConstruct.destroy(node);
      });
      query('.appSubmissionArea', this.domNode).forEach(function(node) {
        domConstruct.destroy(node);
      });
      domClass.add(this.domNode, 'copilot-embedded-form');
    },

    /**
     * Prevent real submission — workflow engine handles submission.
     */
    onSubmit: function(evt) {
      if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
      }
    },

    /**
     * Populate form from workflow step params.
     * @param {Object} params - Step params from workflow manifest
     */
    setFromManifest: function(params) {
      if (!params) return;
      params = this.formatRerunJson(params);

      if (this.recipe) {
        this.recipe.set('value', params.recipe || 'auto');
      }
      if (this.output_path && params.output_path) {
        this.output_path.set('value', params.output_path);
      }
      if (this.output_file && params.output_file) {
        this.output_file.set('value', params.output_file);
      }
      if (this.trim) {
        this.trim.set('checked', !!params.trim);
      }
      if (this.normalize) {
        this.normalize.set('checked', !!params.normalize);
      }
      if (this.filter) {
        this.filter.set('checked', !!params.filter);
      }
      if (this.racon_iter) {
        this.racon_iter.set('value', params.racon_iter != null ? params.racon_iter : 2);
      }
      if (this.pilon_iter) {
        this.pilon_iter.set('value', params.pilon_iter != null ? params.pilon_iter : 2);
      }
      if (this.min_contig_len) {
        this.min_contig_len.set('value', params.min_contig_len != null ? params.min_contig_len : 300);
      }
      if (this.min_contig_cov) {
        this.min_contig_cov.set('value', params.min_contig_cov != null ? params.min_contig_cov : 5);
      }
      if (this.coverage) {
        this.coverage.set('value', params.target_depth != null ? params.target_depth : (params.coverage != null ? params.coverage : 200));
      }

      if (params.genome_size != null) {
        var gs = params.genome_size;
        if (typeof gs === 'number') {
          if (gs >= 1000000) {
            if (this.expected_genome_size) this.expected_genome_size.set('value', Math.round(gs / 1000000));
            if (this.genome_size_units) this.genome_size_units.set('value', 'M');
          } else {
            if (this.expected_genome_size) this.expected_genome_size.set('value', Math.round(gs / 1000));
            if (this.genome_size_units) this.genome_size_units.set('value', 'K');
          }
        }
      }

      if (params.paired_end_libs && params.paired_end_libs.length > 0) {
        params.paired_end_libs.forEach(lang.hitch(this, function(paired_lib) {
          var lrec = { _type: 'paired', type: 'paired' };
          this.setupLibraryData(lrec, paired_lib, 'paired');
          var infoLabels = {
            platform: { label: 'Platform', value: 1 },
            read1: { label: 'Read1', value: 1 },
            read2: { label: 'Read2', value: 1 },
            interleaved: { label: 'Interleaved', value: 0 },
            read_orientation_outward: { label: 'Mate Paired', value: 0 }
          };
          this.addLibraryRowFormFill(lrec, infoLabels, 'pairdata');
        }));
      }
      if (params.single_end_libs && params.single_end_libs.length > 0) {
        params.single_end_libs.forEach(lang.hitch(this, function(single_lib) {
          var lrec = { _type: 'single', type: 'single' };
          var libData = typeof single_lib === 'object' ? single_lib : { read: single_lib };
          this.setupLibraryData(lrec, libData, 'single');
          var infoLabels = {
            platform: { label: 'Platform', value: 1 },
            read: { label: 'Read File', value: 1 }
          };
          this.addLibraryRowFormFill(lrec, infoLabels, 'singledata');
        }));
      }
      if (params.srr_ids && params.srr_ids.length > 0) {
        params.srr_ids.forEach(lang.hitch(this, function(srr_id) {
          var sid = typeof srr_id === 'string' ? srr_id : (srr_id.srr_accession || srr_id.title || String(srr_id));
          var lrec = { _type: 'srr_accession', type: 'srr_accession', title: sid };
          lrec._id = this.makeLibraryIDFormFill(sid, lrec.type);
          lrec.id = this.makeLibraryIDFormFill(sid, lrec.type);
          var infoLabels = { title: { label: 'Title', value: 1 } };
          this.addLibraryRowFormFill(lrec, infoLabels, 'srrdata');
        }));
      }
    },

    /**
     * Extract values back to workflow manifest format.
     * @returns {Object}
     */
    toManifest: function() {
      return this.getValues();
    }
  });
});
