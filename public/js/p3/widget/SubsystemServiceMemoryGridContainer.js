define([
  'dojo/_base/declare', './SubsystemServiceMemoryGrid', './SubSystemsMemoryGridContainer'
], function (
  declare, SubSystemsGrid, oldGridContainer
) {
  return declare([oldGridContainer], {
    gridCtor: SubSystemsGrid
  });
});
