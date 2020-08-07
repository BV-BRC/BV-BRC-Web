define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/SeqSimilarity.html', './AppBase', 'dojo/dom-construct',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog', 'dijit/registry',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby'
], function (
  declare, WidgetBase, on,
  domClass,
  Template, AppBase, domConstruct,
  Deferred, aspect, lang, domReady, NumberTextBox,
  query, dom, popup, Tooltip, Dialog, TooltipDialog, registry,
  children, WorkspaceManager, Memory, Standby
) {
  return declare([AppBase], {
    baseClass: 'App SeqSimilarity',
    templateString: Template,
    applicationName: 'Sequence Similarity',
    tutorialLink: 'tutorial/similar_genome_finder/similar_genome_finder.html',
    defaultPath: '',

    onSearchByChange: function (newVal) {
      domClass.add(this.taxon_id_container, 'dijitHidden');
      domClass.add(this.genomeGroup_container, 'dijitHidden');
      domClass.add(this.featureGroup_container, 'dijitHidden');
      domClass.add(this.genome_id_container, 'dijitHidden');
      switch (newVal) {
        case 'genome':
          domClass.remove(this.genome_id_container, 'dijitHidden');
          break;
        case 'taxon':
          domClass.remove(this.taxon_id_container, 'dijitHidden');
          break;

        case 'genomeGroup':
          domClass.remove(this.genomeGroup_container, 'dijitHidden');
          break;

        case 'featureGroup':
          domClass.remove(this.featureGroup_container, 'dijitHidden');
          break;

        case 'specialtyDBs':
          break;
      }
    }
  });
});

