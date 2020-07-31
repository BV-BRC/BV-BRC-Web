require({cache:{
'url:p3/widget/templates/LoginForm.html':"<div style=\"display: inline-block;\">\n  <h4 class=\"alt-login-note\" style=\"line-height: 1.9; text-align: left;\">\n    <img class=\"pull-left\" src=\"/patric/images/patric-login-icon.jpg\" width=\"30\" height=\"30\" style=\"margin-right: 10px; border-right:1px solid #aaa; padding-right: 10px;\"/>\n    Sign in with your PATRIC account\n  </h4>\n  <div class=\"loginForm pull-left\" style=\"width: 350px; margin-right: 10px; border-right: 1px solid #444;\">\n    <form\n      dojoAttachPoint=\"containerNode\"\n      class=\"${baseClass} PanelForm vipr-login\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\"\n      style=\"display: none;\"\n    >\n      <div class=\"\">\n        <div style=\"padding:2px; margin:10px;\">\n          <input\n            type=\"text\"\n            name=\"username\"\n            data-dojo-attach-point=\"viprUser\"\n            data-dojo-type=\"dijit/form/TextBox\"\n            style=\"width:100%\"\n            data-dojo-props=\"placeholder:'Your ViPR email address', intermediateChanges: true\"\n            data-dojo-attach-event=\"onChange: validateViprCreds\"\n            required=\"true\"\n          /><br/>\n        </div>\n        <div style=\"padding:2px;margin:10px;\">\n          <input\n            type=\"password\"\n            name=\"password\"\n            data-dojo-attach-point=\"viprPass\"\n            data-dojo-type=\"dijit/form/TextBox\"\n            style=\"width:100%\"\n            data-dojo-props=\"placeholder:'Your password', intermediateChanges: true\"\n            data-dojo-attach-event=\"onChange: validateViprCreds\"\n            required=\"true\"\n          />\n        </div>\n      </div>\n\n      <div class=\"messageContainer workingMessage\">\n        Signing into BV-BRC...\n      </div>\n      <div class=\"messageContainer errorMessage\">\n        We were unable to sign you in with the credentials provided.\n      </div>\n\n      <div style=\"padding:2px; margin:10px; float: left;\">\n        <div\n          data-dojo-attach-point=\"submitViprBtn\"\n          type=\"submit\"\n          value=\"Submit\"\n          data-dojo-type=\"dijit/form/Button\"\n          data-dojo-props=\"disabled:true\"\n        >\n          Sign In\n        </div>\n\n        <br>\n        <p class=\"viprLoginError pull-left\" style=\"color:red\"></p>\n      </div>\n    </form>\n\n\n    <form\n      dojoAttachPoint=\"containerNode\"\n      class=\"${baseClass} PanelForm patric-login\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\"\n    >\n      <div class=\"\">\n        <div style=\"padding:2px; margin:10px;\">\n          <input\n            type=\"text\"\n            name=\"username\"\n            data-dojo-attach-point=\"unField\"\n            data-dojo-type=\"dijit/form/TextBox\"\n            style=\"width:100%\"\n            data-dojo-props=\"placeholder:'Your PATRIC username or email address', intermediateChanges: true\"\n            data-dojo-attach-event=\"onChange: validatePatricCreds\"\n            required=\"true\"\n          /><br/>\n        </div>\n        <div style=\"padding:2px;margin:10px;\">\n          <input\n            type=\"password\"\n            name=\"password\"\n            data-dojo-attach-point=\"pwField\"\n            data-dojo-type=\"dijit/form/TextBox\"\n            style=\"width:100%\"\n            data-dojo-props=\"placeholder:'Your password', intermediateChanges: true\"\n            data-dojo-attach-event=\"onChange: validatePatricCreds\"\n            required=\"true\"\n          />\n        </div>\n      </div>\n\n      <div class=\"messageContainer workingMessage\">\n        Signing into BV-BRC...\n      </div>\n      <div class=\"messageContainer errorMessage\">\n        We were unable to sign you in with the credentials provided.\n      </div>\n\n      <div style=\"font-size:.85em; margin:20px; float: right;\">\n        <a class=\"forgotPW\" data-dojo-attach-event=\"click: makeFPform\">Forgot your password?</a>\n      </div>\n\n      <div style=\"padding:2px; margin:10px; float: left;\">\n        <div\n          data-dojo-attach-point=\"submitBtn\"\n          type=\"submit\"\n          value=\"Submit\"\n          data-dojo-type=\"dijit/form/Button\"\n          data-dojo-props=\"disabled:true\"\n        >\n          Sign In\n        </div>\n      </div>\n\n      <div class=\"loginError pull-left\" style=\"color:red\"></div>\n    </form>\n\n  </div>\n\n  <div class=\"alt-login pull-left\">\n    <h5>Or, sign in with:</h5>\n    <a class=\"alt-login-patric pull-left\" data-dojo-attach-event=\"click:altLogin\" style=\"display: none;\" title=\"switch to sign in with patric\" >\n      <img class=\"pull-left\" src=\"/patric/images/patric-login-icon.jpg\" width=\"50\" height=\"50\" style=\"border:2px solid #aaa;\"/>\n      <h5 class=\"pull-left\" style=\"padding: 16px 7px; \">PATRIC</h5>\n    </a>\n\n    <a class=\"alt-login-vipr pull-left\" data-dojo-attach-event=\"click:altLogin\" title=\"switch to sign in with vipr / ird\" >\n      <img class=\"pull-left\" src=\"/patric/images/ird-vipr-login-icon.png\" width=\"50\" height=\"50\" style=\"border:2px solid #aaa;\"/>\n      <h5 class=\"pull-left\" style=\"padding: 16px 7px; \">ViPR / IRD</h5>\n    </a>\n  </div>\n\n\n  <div class=\"pwReset\" style=\"display:none; max-width:200px; margin:auto; border:2px\">\n    <h2 style=\"margin:0px;padding:4px;font-size:1.2em;text-align:center;background:#eee;\">PASSWORD RESET</h2>\n    <p>&nbsp;</p>\n    <form>\n      <input\n        data-dojo-props=\"placeholder:'Email Address or Username',promptMessage:'Enter your Email Address or User Name',intermediateChanges:true\"\n        class=\"rpwi\"\n        data-dojo-attach-event=\"onChange:fieldChanged2\"\n        data-dojo-attach-point=\"emailAddress\"\n        style=\"width:100%\"\n        type=\"text\"\n        name=\"rsw\"\n        data-dojo-type=\"dijit/form/TextBox\"\n        required=\"true\"\n        value=\"\"\n      >\n      <p>&nbsp;</p>\n      <div class=\"RSPWbutton\" data-dojo-attach-event=\"click:onResetClick\" style=\"margin:auto\" data-dojo-attach-point=\"resetPWbutton\" type=\"button\" data-dojo-type=\"dijit/form/Button\">Reset Password</div>\n    </form>\n  </div>\n  <div class=\"pwrMessage\" style=\"display:none; border:2px\">\n    <h2 style=\"margin:0px;padding:4px;font-size:1.2em;text-align:center;background:#eee;\">Your Password has been reset</h2>\n    <p>Please check your email for instructions to complete the reset process.</p>\n  </div>\n  <p>&nbsp;</p>\n  <div class=\"pwrError\" style=\"text-align: center; padding: 2px; margin: 10px; border: 1px solid red; border-radius: 4px;display:none\">\n    Unable to reset the account with the provided email address\n  </div>\n</div>\n"}});
define("p3/widget/LoginForm", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/query',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/LoginForm.html', 'dijit/form/Form', 'dojo/request',
  'dijit/registry', 'dojo/_base/lang', 'dojox/validate/web', 'dojo/NodeList-traverse'
], function (
  declare, WidgetBase, query,
  domClass, Templated, WidgetsInTemplate,
  Template, FormMixin, xhr,
  registry, lang, validate
) {
  return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
    'baseClass': '',
    templateString: Template,
    callbackURL: '',
    loginMethod: 'patric',
    validateViprCreds: function (evt) {
      var btn = this.submitViprBtn;
      btn.setDisabled(true);

      var isValid =
        this.viprUser.get('value') !== '' &&
        this.viprPass.get('value') !== '';
      if (isValid) {
        btn.setDisabled(false);
      }
    },
    validatePatricCreds: function (evt) {
      var btn = this.submitBtn;
      btn.setDisabled(true);

      var isValid =
        this.unField.get('value') !== '' &&
        this.pwField.get('value') !== '';
      if (isValid) {
        btn.setDisabled(false);
      }
    },
    fieldChanged2: function (evt) {
      this.resetPWbutton.set('disabled', true);
      if (this.emailAddress.get('value') !== '') {
        this.resetPWbutton.set('disabled', false);
      }
    },
    onResetClick: function (evt) {
      var self = this;

      evt.preventDefault();
      evt.stopPropagation();
      domClass.add(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      this.resetPWbutton.set('disabled', true);
      var emailAddress = this.emailAddress.displayedValue;
      var userServiceURL = window.App.userServiceURL;
      userServiceURL.replace(/\/+$/, '');
      var def = xhr.post(userServiceURL + '/reset', {
        data: { email: emailAddress },
        method: 'post',
        headers: {
          'Accept': 'application/json'
        }
      });
      def.then(function (data) {
        self.domNode.querySelector('.pwReset').style.display = 'none';
        if (data === 'OK') {
          self.domNode.querySelector('.pwrMessage').style.display = 'block';
        } else {
          self.domNode.querySelector('.pwrError').style.display = 'block';
        }
      }, function (err) {
        console.log(err);
        var errObj = JSON.parse(err.response.data);
        var errorMessage = errObj.message;
        var errEle = self.domNode.querySelector('.pwrError');
        errEle.innerHTML = errorMessage;
        errEle.style.display = 'block';
      });
    },
    onSubmit: function (evt) {
      var self = this;

      evt.preventDefault();
      evt.stopPropagation();

      domClass.add(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');

      if (this.loginMethod == 'vipr') {
        var user = this.viprUser.get('value') + '@viprbrc.org';
        var pass =  this.viprPass.get('value');

        var authURL = 'https://p3.theseed.org/goauth/token?grant_type=client_credentials';
        var def = xhr.get(authURL, {
          headers: {
            'Authorization': 'Basic ' +  btoa(user + ':' + pass)
          },
          handleAs: 'json'
        });
        def.then(function (data) {
          window.App.loginWithVipr(data, data.access_token);
        }, function (err) {
          console.log('vipr login error: ', err);
          var data = err.response.data;
          self.domNode.querySelector('.viprLoginError').innerHTML = data.error;
        });
      } else if (this.loginMethod == 'patric') {
        var vals = this.getValues();
        var userServiceURL = window.App.userServiceURL;
        userServiceURL.replace(/\/+$/, '');
        var def = xhr.post(userServiceURL + '/authenticate', {
          data: vals
        });

        def.then(function (data) {
          var dataArr = data.split('|');
          var keyValueArr = [];
          var dataobj =  {};
          for (var i = 0; i < dataArr.length; i++) {
            keyValueArr = dataArr[i].split('=');
            dataobj[keyValueArr[0]] = keyValueArr[1];
          }
          window.App.login(dataobj, data);
        }, function (err) {
          console.log('patric login error:', err);
          var data = err.response.data;
          var dataObj = JSON.parse(data);
          self.domNode.querySelector('.loginError').innerHTML = dataObj.message;
        });
      }
    },
    startup: function () {
      this.prform = false;
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      var state = this.get('state');
      if ((state === 'Incomplete') || (state === 'Error')) {
        this.submitBtn.setDisabled(true);
      }
      this.watch('state', function (prop, val, val2) {
        if (val2 === 'Incomplete' || val2 === 'Error') {
          this.submitBtn.setDisabled(true);
        } else {
          this.submitBtn.setDisabled(false);
        }
      });
      if (!this.showCancel && this.cancelButton) {
        domClass.add(this.cancelButton.domNode, 'dijitHidden');
      }
      this._started = true;
      this.submitBtn.setDisabled(true);
      this.resetPWbutton.set('disabled', true);
    },
    makeFPform: function () {
      this.domNode.querySelector('.loginForm').style.display = 'none';
      this.domNode.querySelector('.alt-login-note').style.display = 'none';
      this.domNode.querySelector('.alt-login').style.display = 'none';
      this.domNode.querySelector('.pwReset').style.display = 'block';

      var loginF1 = this.domNode.querySelector('.loginForm');
      loginF1.parentNode.removeChild(loginF1);
      this.domNode.querySelector('.pwReset').style.display = 'block';
    },
    viprForgotPassNotice: function () {
      alert('The forgot password option for ViPR is not implemented... yet?.');
    },
    altLogin: function () {
      this.loginMethod = this.loginMethod == 'vipr' ? 'patric' : 'vipr';

      if (this.loginMethod == 'vipr') {
        this.domNode.querySelector('.alt-login-note').innerHTML = '<img class="pull-left" src="/patric/images/ird-vipr-login-icon.png" width="30" height="30" style="margin-right: 10px; border-right:1px solid #aaa; padding-right: 10px;"/> Sign in with your ViPR / IRD account';
        this.domNode.querySelector('.patric-login').style.display = 'none';
        this.domNode.querySelector('.vipr-login').style.display = 'block';
        this.domNode.querySelector('.alt-login-vipr').style.display = 'none';
        this.domNode.querySelector('.alt-login-patric').style.display = 'block';
      } else if (this.loginMethod == 'patric') {
        this.domNode.querySelector('.alt-login-note').innerHTML = '<img class="pull-left" src="/patric/images/patric-login-icon.jpg" width="30" height="30" style="margin-right: 10px;border-right:1px solid #aaa; padding-right: 10px;"/> Sign in with your PATRIC account';
        this.domNode.querySelector('.vipr-login').style.display = 'none';
        this.domNode.querySelector('.patric-login').style.display = 'block';
        this.domNode.querySelector('.alt-login-patric').style.display = 'none';
        this.domNode.querySelector('.alt-login-vipr').style.display = 'block';
      }
    }
  });
});// endDefine
