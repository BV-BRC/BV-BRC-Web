/**
 * @module p3/widget/copilot/workflowForms/CopilotComparativeSystemsForm
 * @description Dojo wrapper for ComparativeSystems service form, embedded in the Copilot Workflow Engine.
 * Strips page-level chrome and provides bidirectional data flow with the workflow manifest.
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/query',
  'p3/widget/app/ComparativeSystems'
], function(declare, lang, domClass, domConstruct, query, ComparativeSystems) {
  return declare([ComparativeSystems], {
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

      if (this.output_path && params.output_path) {
        this.output_path.set('value', params.output_path);
      }
      if (this.output_file && params.output_file) {
        this.output_file.set('value', params.output_file);
      }
      if (params.genome_ids && params.genome_ids.length > 0) {
        this.onAddGenomeRerun(params.genome_ids);
      }
      if (params.genome_groups && params.genome_groups.length > 0) {
        this.onAddGenomeGroupRerun(params.genome_groups);
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
