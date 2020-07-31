require({cache:{
'url:p3/widget/templates/LoginForm.html':"<div style=\"display: inline-block;\">\n  <h4 class=\"alt-login-note\" style=\"line-height: 1.9; text-align: left;\">\n    <img class=\"pull-left\" src=\"/patric/images/patric-login-icon.jpg\" width=\"30\" height=\"30\" style=\"margin-right: 10px; border-right:1px solid #aaa; padding-right: 10px;\"/>\n    Sign in with your PATRIC account\n  </h4>\n  <div class=\"loginForm pull-left\" style=\"width: 350px; margin-right: 10px; border-right: 1px solid #444;\">\n    <form\n      dojoAttachPoint=\"containerNode\"\n      class=\"${baseClass} PanelForm vipr-login\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\"\n      style=\"display: none;\"\n    >\n      <div class=\"\">\n        <div style=\"padding:2px; margin:10px;\">\n          <input\n            type=\"text\"\n            name=\"username\"\n            data-dojo-attach-point=\"viprUser\"\n            data-dojo-type=\"dijit/form/TextBox\"\n            style=\"width:100%\"\n            data-dojo-props=\"placeholder:'Your ViPR email address', intermediateChanges: true\"\n            data-dojo-attach-event=\"onChange: validateViprCreds\"\n            required=\"true\"\n          /><br/>\n        </div>\n        <div style=\"padding:2px;margin:10px;\">\n          <input\n            type=\"password\"\n            name=\"password\"\n            data-dojo-attach-point=\"viprPass\"\n            data-dojo-type=\"dijit/form/TextBox\"\n            style=\"width:100%\"\n            data-dojo-props=\"placeholder:'Your password', intermediateChanges: true\"\n            data-dojo-attach-event=\"onChange: validateViprCreds\"\n            required=\"true\"\n          />\n        </div>\n      </div>\n\n      <div class=\"messageContainer workingMessage\">\n        Signing into BV-BRC...\n      </div>\n      <div class=\"messageContainer errorMessage\">\n        We were unable to sign you in with the credentials provided.\n      </div>\n\n      <div style=\"padding:2px; margin:10px; float: left;\">\n        <div\n          data-dojo-attach-point=\"submitViprBtn\"\n          type=\"submit\"\n          value=\"Submit\"\n          data-dojo-type=\"dijit/form/Button\"\n          data-dojo-props=\"disabled:true\"\n        >\n          Sign In\n        </div>\n\n        <br>\n        <p class=\"viprLoginError pull-left\" style=\"color:red\"></p>\n      </div>\n    </form>\n\n\n    <form\n      dojoAttachPoint=\"containerNode\"\n      class=\"${baseClass} PanelForm patric-login\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\"\n    >\n      <div class=\"\">\n        <div style=\"padding:2px; margin:10px;\">\n          <input\n            type=\"text\"\n            name=\"username\"\n            data-dojo-attach-point=\"unField\"\n            data-dojo-type=\"dijit/form/TextBox\"\n            style=\"width:100%\"\n            data-dojo-props=\"placeholder:'Your PATRIC username or email address', intermediateChanges: true\"\n            data-dojo-attach-event=\"onChange: validatePatricCreds\"\n            required=\"true\"\n          /><br/>\n        </div>\n        <div style=\"padding:2px;margin:10px;\">\n          <input\n            type=\"password\"\n            name=\"password\"\n            data-dojo-attach-point=\"pwField\"\n            data-dojo-type=\"dijit/form/TextBox\"\n            style=\"width:100%\"\n            data-dojo-props=\"placeholder:'Your password', intermediateChanges: true\"\n            data-dojo-attach-event=\"onChange: validatePatricCreds\"\n            required=\"true\"\n          />\n        </div>\n      </div>\n\n      <div class=\"messageContainer workingMessage\">\n        Signing into BV-BRC...\n      </div>\n      <div class=\"messageContainer errorMessage\">\n        We were unable to sign you in with the credentials provided.\n      </div>\n\n      <div style=\"font-size:.85em; margin:20px; float: right;\">\n        <a class=\"forgotPW\" data-dojo-attach-event=\"click: makeFPform\">Forgot your password?</a>\n      </div>\n\n      <div style=\"padding:2px; margin:10px; float: left;\">\n        <div\n          data-dojo-attach-point=\"submitBtn\"\n          type=\"submit\"\n          value=\"Submit\"\n          data-dojo-type=\"dijit/form/Button\"\n          data-dojo-props=\"disabled:true\"\n        >\n          Sign In\n        </div>\n      </div>\n\n      <div class=\"loginError pull-left\" style=\"color:red\"></div>\n    </form>\n\n  </div>\n\n  <div class=\"alt-login pull-left\">\n    <h5>Or, sign in with:</h5>\n    <a class=\"alt-login-patric pull-left\" data-dojo-attach-event=\"click:altLogin\" style=\"display: none;\" title=\"switch to sign in with patric\" >\n      <img class=\"pull-left\" src=\"/patric/images/patric-login-icon.jpg\" width=\"50\" height=\"50\" style=\"border:2px solid #aaa;\"/>\n      <h5 class=\"pull-left\" style=\"padding: 16px 7px; \">PATRIC</h5>\n    </a>\n\n    <a class=\"alt-login-vipr pull-left\" data-dojo-attach-event=\"click:altLogin\" title=\"switch to sign in with vipr / ird\" >\n      <img class=\"pull-left\" src=\"/patric/images/ird-vipr-login-icon.png\" width=\"50\" height=\"50\" style=\"border:2px solid #aaa;\"/>\n      <h5 class=\"pull-left\" style=\"padding: 16px 7px; \">ViPR / IRD</h5>\n    </a>\n  </div>\n\n\n  <div class=\"pwReset\" style=\"display:none; max-width:200px; margin:auto; border:2px\">\n    <h2 style=\"margin:0px;padding:4px;font-size:1.2em;text-align:center;background:#eee;\">PASSWORD RESET</h2>\n    <p>&nbsp;</p>\n    <form>\n      <input\n        data-dojo-props=\"placeholder:'Email Address or Username',promptMessage:'Enter your Email Address or User Name',intermediateChanges:true\"\n        class=\"rpwi\"\n        data-dojo-attach-event=\"onChange:fieldChanged2\"\n        data-dojo-attach-point=\"emailAddress\"\n        style=\"width:100%\"\n        type=\"text\"\n        name=\"rsw\"\n        data-dojo-type=\"dijit/form/TextBox\"\n        required=\"true\"\n        value=\"\"\n      >\n      <p>&nbsp;</p>\n      <div class=\"RSPWbutton\" data-dojo-attach-event=\"click:onResetClick\" style=\"margin:auto\" data-dojo-attach-point=\"resetPWbutton\" type=\"button\" data-dojo-type=\"dijit/form/Button\">Reset Password</div>\n    </form>\n  </div>\n  <div class=\"pwrMessage\" style=\"display:none; border:2px\">\n    <h2 style=\"margin:0px;padding:4px;font-size:1.2em;text-align:center;background:#eee;\">Your Password has been reset</h2>\n    <p>Please check your email for instructions to complete the reset process.</p>\n  </div>\n  <p>&nbsp;</p>\n  <div class=\"pwrError\" style=\"text-align: center; padding: 2px; margin: 10px; border: 1px solid red; border-radius: 4px;display:none\">\n    Unable to reset the account with the provided email address\n  </div>\n</div>\n"}});
define("p3/widget/UserProfileEditor", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/LoginForm.html', 'dijit/form/Form', 'dojo/request',
  'dojo/dom-form', 'dojo/_base/lang', 'dijit/form/Button', 'dojo/dom-construct'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, FormMixin, xhr,
  domForm, lang, Button, domConstruct
) {
  return declare([FormMixin], {
    baseClass: 'App Sleep',
    callbackURL: '',
    postCreate: function () {
      this.inherited(arguments);
      this.submitButton = new Button({ label: 'Update Profile', type: 'submit', style: 'float:right;' });
      domConstruct.place(this.submitButton.domNode, this.containerNode, 'last');
    },
    userId: '',
    onSubmit: function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      if (!this.userId) {
        throw Error('No User ID in User Profile Editor');
      }
      domClass.add(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      this.submitButton.set('disabled', true);
      var vals = this.getValues();
      vals.id = this.userId;

      console.log('Submit Vals: ', vals);

      var def = xhr.post('/user/', {
        headers: { accept: 'application/json' },
        data: vals,
        withCredentials: true
      });

      def.then(lang.hitch(this, function (results) {
        // console.log("Login Results: ", results, arguments);
        console.log('Login Window location: ', window.location, window.location.query);
        domClass.remove(this.domNode, 'Working');
        this.submitButton.set('disabled', false);
        console.log('this.callbackURL', this.callbackURL);
        if (this.callbackURL) {
          window.location = this.callbackURL;
        }
      }), lang.hitch(this, function (err) {
        domClass.remove(this.domNode, 'Working');
        domClass.add(this.domNode, 'Error');
        this.submitButton.set('disabled', false);
      }));
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      var state = this.get('state');
      if ((state == 'Incomplete') || (state == 'Error')) {
        this.submitButton.set('disabled', true);
      }

      this.watch('state', function (prop, val, val2) {
        if (val2 == 'Incomplete' || val2 == 'Error') {
          this.submitButton.set('disabled', true);
        } else {
          this.submitButton.set('disabled', false);
        }
      });

      this._started = true;
    }
  });
});
