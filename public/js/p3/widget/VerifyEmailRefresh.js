define([
    'dojo/_base/declare', 'dijit/layout/ContentPane', 'dojo/dom-class'
  ], function (
    declare, ContentPane,domClass
  ) {

    return declare([ContentPane], {
        style: 'width: 100%; overflow: auto;',
        content: '<div style="width:70%;font-size: 2em; margin: auto;text-align:center"><div><i class="icon-user-check fa fa-3x" style="color: green;" ></i></div><div style="border-top: 2px solid green;padding:10px"><p>Thank you for verifying your email address.</p></div></div>',
        startup: function () {
            if (localStorage.getItem("userid") && localStorage.getItem("tokenstring")){
                window.App.refreshUser().then(function(){
                    var rawu = localStorage.getItem("userProfile")
                    var u = JSON.parse(rawu)
                    if (!u) {
                      console.log("Missing User: ", rawu)
                      return
                    }
                    if (u.email_verified){
                      domClass.remove(document.body,"unverified_email")
                    }else{
                      domClass.add(document.body,"unverified_email")
                    }
                })
            }
        }
    });
  })
