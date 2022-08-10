define([
    'dojo/_base/declare', 'dijit/layout/ContentPane'
  ], function (
    declare, ContentPane,
  ) {

    return declare([ContentPane], {
        style: 'width: 100%; overflow: auto;',
        content: '<div style="width:70%;font-size: 2em; margin: auto;text-align:center"><div><i class="icon-user-check fa fa-3x" style="color: green;" ></i></div><div style="border-top: 2px solid green;padding:10px"><p>Thank you for verifying your email address.</p></div></div>',
        startup: function () {
            if (localStorage.getItem("userid") && localStorage.getItem("tokenstring")){
                console.log('do user refresh')
                window.App.refreshUser().then(function(){
                    console.log("User Refresh Completed")
                })
            }
        }
    });
  })
