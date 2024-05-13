define([
  'dojo/_base/declare', 'dojo/dom-construct', 'dojo/query', 'dojo/dom-style', 'dojo/request/xhr', 'dojo/_base/lang',
  'dojox/xml/DomParser', 'dijit/_WidgetBase', 'dijit/_Templated', '../../widget/ExternalItemFormatter',
  'dojo/text!./OutbreaksOverview.html'
], function (
  declare, domConstruct, dojoQuery, domStyle, xhr, lang,
  domParser, WidgetBase, Templated, ExternalItemFormatter,
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
    googleNewsCount: 10,
    googleNewsRSS: 'https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US%3Aen&oc=11&q=h5n1%20site%3Acidrap.umn.edu%20OR%20site%3Afda.gov%20OR%20site%3Awww.who.in%20OR%20site%3Anews.un.org%20OR%20site%3Acdc.gov%20OR%20site%3Aceirr-network.org%20OR%20site%3Awww.nature.com%2Farticles%2F%20when%3A1y&hl=en-US&gl=US&ceid=US%3Aen',

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

      xhr.get('/google/news/?url=' + encodeURIComponent(this.googleNewsRSS) + '&count=' + this.googleNewsCount,
        {handleAs: 'xml'})
        .then(lang.hitch(this, function (data) {
          // TODO: move parsing to server side
          const doc = domParser.parse(data);
          const items = Array.from(doc.getElementsByTagName('item'));

          const newsList = domConstruct.create('ul');
          for (let i = 0; i < this.googleNewsCount; ++i) {
            const li = domConstruct.create('li', {}, newsList)
            domConstruct.create('a', {
              href: this.getNode(items[i], 'link'),
              target: '_blank',
              innerHTML: this.getNode(items[i], 'title')
            }, li);
          }
          domConstruct.place(newsList, 'newsList');
        })).catch(error => {
        console.log(error);
      });
      ;
    },

    getNode: function (node, tag) {
      return node.getElementsByTagName(tag)[0].childNodes[0].nodeValue;
    }
  });
});
