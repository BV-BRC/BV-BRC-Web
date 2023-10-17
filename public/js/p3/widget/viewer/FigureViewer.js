define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/topic', './Base',
  '../FigureViewerContainer'
], function (
  declare, lang, Topic, ViewerBase,
  FigureViewerContainer
) {
  return declare([ViewerBase], {
    postCreate: function () {
      this.figureContainer = new FigureViewerContainer({ id: this.id + '_figureContainer', region: 'center' }); 
      this.addChild(this.figureContainer);
      this.inherited(arguments);
    },

    onSetState: function () {
      console.log('onSetState');
    }
  });
});
