define("p3/widget/WebPagePane", [
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/xhr',
  'dijit/layout/ContentPane', 'dojo/dom-construct'
], function (
  declare, lang, xhr,
  ContentPane, domConstruct
) {

  return declare([ContentPane], {

    _setContent: function (data) {

      var parsed = domConstruct.toDom(data);

      if (parsed.childNodes.length === 2) {
        this.inherited(arguments);
      }
      else {

        for (i = 0; i < parsed.children.length; i++) {
          // console.log(parsed.children[i])
          if (parsed.children[i].tagName === 'TITLE') {
            window.document.title  = parsed.children[i].innerHTML;
          } else if (parsed.children[i].tagName === 'DIV') {
            rootDivNode = parsed.children[i];
            sectionNode = rootDivNode.children[1];
            contentDivNode = sectionNode.children[1];
            articleNode = contentDivNode.children[0].children[1];
            articleBody = articleNode.children[0];

            arguments[0] = articleBody;
          }
        }

        this.inherited(arguments);
      }
    },
    onLoad: function () {
      this.containerNode.classList.add('webpage');
    }
  });
});
