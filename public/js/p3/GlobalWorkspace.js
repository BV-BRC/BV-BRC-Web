define(['p3/WorkspaceManager'], function (WS) {
  console.log('Loading Global Workspace Manager: ', WS);
  window.WorkspaceManager = WS;
  console.log('Window: ', window);
});
