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
     * Defers loading until startup has completed so all widgets are initialized.
     * @param {Object} params - Step params from workflow manifest
     */
    setFromManifest: function(params) {
      if (!params) return;

      var self = this;

      var applyParams = function() {
        var p = self.formatRerunJson(params);

        if (self.recipe) {
          self.recipe.set('value', p.recipe || 'auto');
        }
        if (self.output_path && p.output_path) {
          self.output_path.set('value', p.output_path);
        }
        if (self.output_file && p.output_file) {
          self.output_file.set('value', p.output_file);
        }
        if (self.trim) {
          self.trim.set('checked', !!p.trim);
        }
        if (self.normalize) {
          self.normalize.set('checked', !!p.normalize);
        }
        if (self.filter) {
          self.filter.set('checked', !!p.filter);
        }
        if (self.racon_iter) {
          self.racon_iter.set('value', p.racon_iter != null ? p.racon_iter : 2);
        }
        if (self.pilon_iter) {
          self.pilon_iter.set('value', p.pilon_iter != null ? p.pilon_iter : 2);
        }
        if (self.min_contig_len) {
          self.min_contig_len.set('value', p.min_contig_len != null ? p.min_contig_len : 300);
        }
        if (self.min_contig_cov) {
          self.min_contig_cov.set('value', p.min_contig_cov != null ? p.min_contig_cov : 5);
        }
        if (self.coverage) {
          self.coverage.set('value', p.target_depth != null ? p.target_depth : (p.coverage != null ? p.coverage : 200));
        }

        if (p.genome_size != null) {
          var gs = p.genome_size;
          if (typeof gs === 'number') {
            if (gs >= 1000000) {
              if (self.expected_genome_size) self.expected_genome_size.set('value', Math.round(gs / 1000000));
              if (self.genome_size_units) self.genome_size_units.set('value', 'M');
            } else {
              if (self.expected_genome_size) self.expected_genome_size.set('value', Math.round(gs / 1000));
              if (self.genome_size_units) self.genome_size_units.set('value', 'K');
            }
          }
        }

        if (p.paired_end_libs && p.paired_end_libs.length > 0) {
          p.paired_end_libs.forEach(lang.hitch(self, function(paired_lib) {
            var lrec = { _type: 'paired', type: 'paired' };
            self.setupLibraryData(lrec, paired_lib, 'paired');
            var infoLabels = {
              platform: { label: 'Platform', value: 1 },
              read1: { label: 'Read1', value: 1 },
              read2: { label: 'Read2', value: 1 },
              interleaved: { label: 'Interleaved', value: 0 },
              read_orientation_outward: { label: 'Mate Paired', value: 0 }
            };
            self.addLibraryRowFormFill(lrec, infoLabels, 'pairdata');
          }));
        }
        if (p.single_end_libs && p.single_end_libs.length > 0) {
          p.single_end_libs.forEach(lang.hitch(self, function(single_lib) {
            var lrec = { _type: 'single', type: 'single' };
            var libData = typeof single_lib === 'object' ? single_lib : { read: single_lib };
            self.setupLibraryData(lrec, libData, 'single');
            var infoLabels = {
              platform: { label: 'Platform', value: 1 },
              read: { label: 'Read File', value: 1 }
            };
            self.addLibraryRowFormFill(lrec, infoLabels, 'singledata');
          }));
        }
        if (p.srr_ids && p.srr_ids.length > 0) {
          p.srr_ids.forEach(lang.hitch(self, function(srr_id) {
            var sid = typeof srr_id === 'string' ? srr_id : (srr_id.srr_accession || srr_id.title || String(srr_id));
            var lrec = { _type: 'srr_accession', type: 'srr_accession', title: sid };
            lrec._id = self.makeLibraryIDFormFill(sid, lrec.type);
            lrec.id = self.makeLibraryIDFormFill(sid, lrec.type);
            var infoLabels = { title: { label: 'Title', value: 1 } };
            self.addLibraryRowFormFill(lrec, infoLabels, 'srrdata');
          }));
        }
      };

      if (this._started) {
        applyParams();
      } else {
        var attempts = 0;
        var maxAttempts = 50;
        var interval = setInterval(function() {
          attempts++;
          if (self._started) {
            clearInterval(interval);
            applyParams();
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.error('[CopilotAssemblyForm] Form startup did not complete within timeout, applying params anyway');
            applyParams();
          }
        }, 100);
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
