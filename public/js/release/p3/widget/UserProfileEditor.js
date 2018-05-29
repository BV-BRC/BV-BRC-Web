require({cache:{
'url:p3/widget/templates/LoginForm.html':"<div>\n  <div class=\"loginForm\" style=\"border: 2px\">\n    <form dojoAttachPoint=\"containerNode\" class=\"${baseClass} PanelForm\" dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n      <div style=\"padding:2px; margin:10px;\">\n        <input type=\"text\" name=\"username\" data-dojo-attach-point=\"unField\" data-dojo-type=\"dijit/form/TextBox\" style=\"width:100%\" data-dojo-props=\"placeholder:'Your Username or Email Address', intermediateChanges: true\" data-dojo-attach-event=\"onChange: fieldChanged\"\n          required=\"true\"><br/>\n      </div>\n      <div style=\"padding:2px;margin:10px;\">\n        <input type=\"password\" name=\"password\" data-dojo-attach-point=\"pwField\" data-dojo-type=\"dijit/form/TextBox\" style=\"width:100%\" data-dojo-props=\"placeholder:'Your Password', intermediateChanges: true\" data-dojo-attach-event=\"onChange: fieldChanged\" required=\"true\">\n      </div>\n      <div class=\"messageContainer workingMessage\">\n        Logging into PATRIC....\n      </div>\n      <div class=\"messageContainer errorMessage\">\n        We were unable to log you in with the credentials provided.\n      </div>\n      <div style=\"text-align:center;padding:2px;margin:10px;\">\n        <!-- <div data-dojo-attach-point=\"cancelButton\" type=\"submit\" value=\"Submit\" data-dojo-type=\"dijit/form/Button\" class=\"dijitHidden\">Login</div> -->\n        <div data-dojo-attach-point=\"submitButton\" type=\"submit\" value=\"Submit\" data-dojo-type=\"dijit/form/Button\">Login</div>\n        <p>&nbsp;</p>\n        <p class=\"loginError\" style=\"color:red\"></p>\n      </div>\n      <div style=\"font-size:.85em;\">\n        <!-- New to PATRIC?  <a href=\"/register\">REGISTER HERE</a> </br> -->\n        <a class=\"forgotPW\" data-dojo-attach-event=\"click: makeFPform\">Forgot Your password?</a>\n      </div>\n    </form>\n  </div>\n  <div class=\"pwReset\" style=\"display:none; max-width:200px; margin:auto; border:2px\">\n    <h2 style=\"margin:0px;padding:4px;font-size:1.2em;text-align:center;background:#eee;\">PASSWORD RESET</h2>\n    <p>&nbsp;</p>\n    <form>\n      <input data-dojo-props=\"placeholder:'Email Address or Username',promptMessage:'Enter your Email Address or User Name',intermediateChanges:true\" class=\"rpwi\" data-dojo-attach-event=\"onChange:fieldChanged2\" data-dojo-attach-point=\"emailAddress\" style=\"width:100%\"\n        type=\"text\" name=\"rsw\" data-dojo-type=\"dijit/form/TextBox\" required=\"true\" value=\"\">\n      <p>&nbsp;</p>\n      <div class=\"RSPWbutton\" data-dojo-attach-event=\"click:onResetClick\" style=\"margin:auto\" data-dojo-attach-point=\"resetPWbutton\" type=\"button\" data-dojo-type=\"dijit/form/Button\">Reset Password</div>\n    </form>\n  </div>\n  <div class=\"pwrMessage\" style=\"display:none; border:2px\">\n    <h2 style=\"margin:0px;padding:4px;font-size:1.2em;text-align:center;background:#eee;\">Your Password has been reset</h2>\n    <p>Please check your email for instructions to complete the reset process.</p>\n  </div>\n  <p>&nbsp;</p>\n  <div class=\"pwrError\" style=\"text-align: center; padding: 2px; margin: 10px; border: 1px solid red; border-radius: 4px;display:none\">\n    Unable to reset the account with the provided email address\n  </div>\n</div>\n"}});
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
      var _self = this;

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
