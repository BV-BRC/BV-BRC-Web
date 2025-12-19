// Core application layer - loaded immediately on startup
define([
  'dojo/has!webpack?dojo-webpack-plugin/amd/dojoES6Promise',
  'dojo/ready',
  'p3/app/p3app',
  'p3/panels',
  'p3/widget/LoginForm',
  'p3/widget/UserProfileForm',
  'p3/widget/SuLogin',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/form/ValidationTextBox',
  'dijit/form/Textarea',
  'dijit/form/SimpleTextarea',
  'dijit/form/CheckBox',
  'dijit/form/ComboBox',
  // Common form/layout widgets needed at startup and by the parser on the home page
  'dijit/form/Select',
  'dijit/form/DropDownButton',
  'dijit/TooltipDialog',
  'dijit/InlineEditBox',
  'p3/widget/TooltipDialog',
  'dijit/layout/ContentPane',
  'dijit/Dialog',
  'dijit/TitlePane',
  'dijit/layout/BorderContainer',
  // Preload common NameSelectors to satisfy parser auto-require in templates across apps & searches
  'p3/widget/TaxonNameSelector',
  'p3/widget/GenomeNameSelector',
  'p3/widget/TaxIDSelector',
  'p3/widget/GlobalSearch',
  'dojo/fx/Toggler',
  'p3/widget/JobStatus',
  'dojo/parser',
  'dijit/form/Form',
  'dijit/form/TextBox',
  'dijit/form/Button',
  'put-selector/put',
  'dijit/_base',
  'dijit/_base/manager',
  'dijit/WidgetSet',
  'dijit/selection',
  'dojox/validate/web'
], function(dojoES6Promise, P3App) {
  // Export P3App to window for initialization
  if (typeof window !== 'undefined') {
    window.P3App = P3App;
  }
  return P3App;
});
