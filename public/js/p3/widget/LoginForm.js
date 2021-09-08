define([
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
