define([
  'dojo/_base/declare', 'dojo/dom-construct', 'dojo/query', 'dojo/dom-style', 'dojo/domReady',
  'dijit/_WidgetBase', 'dijit/_Templated', '../../widget/ExternalItemFormatter',
  'dojo/text!./OutbreaksOverview.html'
], function (
  declare, domConstruct, dojoQuery, domStyle, domReady,
  WidgetBase, Templated, ExternalItemFormatter,
  Template
) {
  return declare([WidgetBase, Templated], {
    baseClass: 'OutbreaksOverview',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    acknowledgements: null,
    pubmedTerm: null,
    detailsHTML: null,
    rightPanelContent: [],
    leftPanelContent: [],

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);

      if (this.detailsHTML) {
        domConstruct.place(this.detailsHTML, this.overviewDetailsNode, 'first');
      }

      for (let rightPanelHTML of this.rightPanelContent) {
        domConstruct.place(rightPanelHTML, this.rightPanelNode, 2);
      }

      if (this.leftPanelContent.length > 0) {
        domStyle.set(this.leftPanelHTML, 'width', '15%');
        domStyle.set(this.overviewDetailsNode, 'width', '63%');
        for (let leftPanelHTML of this.leftPanelContent) {
          domConstruct.place(leftPanelHTML, this.leftPanelHTML, 2);
        }
      }

      //domConstruct.empty(this.pubmedSummaryNode);
      if (this.pubmedTerm) {
        domConstruct.place(ExternalItemFormatter(this.pubmedTerm, 'pubmed_data', {}), this.pubmedSummaryNode, 'first');
      } else {
        dojoQuery('#pubmedSummarySection').style('display', 'none');
      }

      //domConstruct.empty(this.acknowledgementsNode);
      if (this.acknowledgements) {
        domConstruct.create('p', {innerHTML: this.acknowledgements}, this.acknowledgementsNode, 'last');
      } else {
        dojoQuery('#acknowledgementsSection').style('display', 'none');
      }

      domReady(function () {
        if (navigator.clipboard) {
          let codeBlocks = dojoQuery('.bv-brc-code-block');

          codeBlocks.forEach(codeBlock => {
            let button = domConstruct.create('button', {
              innerHTML: '<i class="icon-copy"></i>'
            }, codeBlock);

            button.addEventListener('click', async () => {
              const code = codeBlock.querySelector('code');
              const text = code.innerText;

              await navigator.clipboard.writeText(text);
            });
          });
        }
      });
    }
  });
});
