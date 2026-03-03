/**
 * @module p3/widget/copilot/workflowForms/CopilotServiceFormAdapter
 * @description Factory/registry that maps app names to Dojo wrapper form classes
 * and handles asynchronous instantiation for the WorkflowEngine detail panel.
 */
define([
  'dojo/_base/lang',
  'dojo/Deferred'
], function(lang, Deferred) {
  var formRegistry = {
    'GenomeAssembly2': 'p3/widget/copilot/workflowForms/CopilotAssemblyForm',
    'GenomeAnnotation': 'p3/widget/copilot/workflowForms/CopilotAnnotationForm',
    'ComparativeSystems': 'p3/widget/copilot/workflowForms/CopilotComparativeSystemsForm'
  };

  return {
    /**
     * Returns true if we have a Dojo wrapper for this app.
     * @param {string} appName
     * @returns {boolean}
     */
    hasDojoForm: function(appName) {
      return !!formRegistry[appName];
    },

    /**
     * Asynchronously loads and instantiates the wrapper form.
     * Returns a Deferred that resolves with the form widget instance.
     * The caller is responsible for:
     *   1. Placing the widget's domNode into the DOM
     *   2. Calling widget.startup()
     *   3. Calling widget.setFromManifest(params)
     *
     * @param {string} appName
     * @param {Object} [params] - Optional initial params (not used during create; passed to setFromManifest by caller)
     * @returns {dojo.Deferred}
     */
    createForm: function(appName) {
      var def = new Deferred();
      var modulePath = formRegistry[appName];
      if (!modulePath) {
        def.reject(new Error('No Dojo form wrapper for app: ' + appName));
        return def;
      }
      require([modulePath], function(FormClass) {
        try {
          var instance = new FormClass({});
          def.resolve(instance);
        } catch (err) {
          def.reject(err);
        }
      }, function(err) {
        def.reject(err);
      });
      return def;
    }
  };
});
