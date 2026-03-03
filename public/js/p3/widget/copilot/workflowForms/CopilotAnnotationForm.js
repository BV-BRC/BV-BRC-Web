/**
 * @module p3/widget/copilot/workflowForms/CopilotAnnotationForm
 * @description Dojo wrapper for GenomeAnnotation service form, embedded in the Copilot Workflow Engine.
 * Strips page-level chrome and provides bidirectional data flow with the workflow manifest.
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/query',
  'p3/widget/app/Annotation'
], function(declare, lang, domClass, domConstruct, query, Annotation) {
  return declare([Annotation], {
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

      if (this.contigs && params.contigs) {
        this.contigs.set('value', params.contigs);
      }
      if (this.recipe) {
        this.recipe.set('value', params.recipe || 'default');
      }
      if (this.tax_idWidget && params.taxonomy_id != null) {
        this.tax_idWidget.set('value', String(params.taxonomy_id));
        this.tax_idWidget.set('displayedValue', String(params.taxonomy_id));
      }
      if (this.scientific_nameWidget && params.scientific_name != null) {
        if (typeof params.scientific_name === 'object' && params.scientific_name !== null) {
          this.scientific_nameWidget.set('item', params.scientific_name);
        } else {
          this.scientific_nameWidget.set('displayedValue', String(params.scientific_name));
        }
      }
      if (this.myLabelWidget) {
        this.myLabelWidget.set('value', params.my_label || params.output_file || '');
      }
      if (this.output_path && params.output_path) {
        this.output_path.set('value', params.output_path);
      }
      if (this.output_nameWidget && params.output_file) {
        this.output_nameWidget.set('value', params.output_file);
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
