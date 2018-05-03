define(['dojo/_base/declare', 'dijit/layout/TabContainer', './ActionTabController'
], function (declare, TabContainer, ActionTabController) {
  var ATC = declare([ActionTabController], {
    templateString: "<div role='tablist' data-dojo-attach-event='onkeydown'><span data-dojo-attach-point='containerNode'></span><div data-dojo-attach-point='menuNode' class='actionMenuNode' style='display:inline-block;width:75px;float:right;vertical-align:middle;'>Icon Here</div><div class='FacetHeaderBox' style='height:0px' data-dojo-attach-point='headerBox'></div></div></div>"
  });

  return declare([TabContainer], {
    controllerWidget: ATC
  });
});
