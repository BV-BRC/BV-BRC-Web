define([
  'dojo/_base/declare', './SubsystemServiceMemoryGrid', './SubSystemsMemoryGridContainer', 'dojo/topic',
  'dojo/_base/lang'
], function (
  declare, SubSystemsGrid, oldGridContainer, Topic, lang
) {
  return declare([oldGridContainer], {
    gridCtor: SubSystemsGrid,

    setTopicId: function (topicId) {
      this.topicId = topicId;
      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0], value = arguments[1];
        switch (key) {
          case 'refreshGrid':
            console.log('refresh grid');
            break;
          default:
            break;
        }
      }));
      // set topic id in grid
      this.grid.setTopicId(this.topicId);
    }

    // TODO: START HERE create filter panel after data is loaded
  });
});
