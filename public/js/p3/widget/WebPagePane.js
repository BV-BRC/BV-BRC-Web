define([
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

        for (var i = 0; i < parsed.children.length; i++) {
          // console.log(parsed.children[i])
          if (parsed.children[i].tagName === 'TITLE') {
            window.document.title  = parsed.children[i].innerHTML;
          } else if (parsed.children[i].tagName === 'DIV') {
            var rootDivNode = parsed.children[i];
            var sectionNode = rootDivNode.children[1];
            var contentDivNode = sectionNode.children[1];
            var articleNode = contentDivNode.children[0].children[1];
            var articleBody = articleNode.children[0];

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
