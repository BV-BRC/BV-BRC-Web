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
    loginMethod: 'vipr',
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
        document.getElementsByClassName('pwReset')[0].style.display = 'none';
        if (data === 'OK') {
          document.getElementsByClassName('pwrMessage')[0].style.display = 'block';
        } else {
          document.getElementsByClassName('pwrError')[0].style.display = 'block';
        }
      }, function (err) {
        console.log(err);
        var errObj = JSON.parse(err.response.data);
        var errorMessage = errObj.message;
        console.log(errorMessage);
        document.getElementsByClassName('pwrError')[0].innerHTML = errorMessage;
        document.getElementsByClassName('pwrError')[0].style.display = 'block';
      });
    },
    onSubmit: function (evt) {
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
          var data = err.response.data;
          console.log('vipr login error: ', data);
          var dataObj = JSON.parse(data);
          document.getElementsByClassName('loginError')[0].innerHTML = dataObj.message;
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
          console.log(data);
          var dataObj = JSON.parse(data);
          console.log(dataObj.message);
          document.getElementsByClassName('loginError')[0].innerHTML = dataObj.message;
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
      document.getElementsByClassName('loginForm')[0].style.display = 'none';
      document.getElementsByClassName('pwReset')[0].style.display = 'block';
      var loginf2 = document.getElementsByClassName('loginForm')[1];
      if (loginf2 !== undefined) {
        var loginF1 = document.getElementsByClassName('loginForm')[0];
        var pwR1 = document.getElementsByClassName('pwReset')[0];
        loginF1.parentNode.removeChild(loginF1);
        pwR1.parentNode.removeChild(pwR1);
        loginf2.style.display = 'none';
        document.getElementsByClassName('pwReset')[0].style.display = 'block';
      }
    },
    viprForgotPassNotice: function () {
      alert('The forgot password option for ViPR is not implemented... yet?.');
    },
    altLogin: function () {
      var dlg = registry.byNode(query(this.domNode).parents('.dijitDialog')[0]);

      this.loginMethod = this.loginMethod == 'vipr' ? 'patric' : 'vipr';
      if (this.loginMethod == 'vipr') {
        dlg.set('title', 'Login with ViPR / IRD');
        document.querySelector('.patric-login').style.display = 'none';
        document.querySelector('.vipr-login').style.display = 'block';
        document.querySelector('.alt-login-vipr').style.display = 'none';
        document.querySelector('.alt-login-patric').style.display = 'block';
      } else if (this.loginMethod == 'patric') {
        dlg.set('title', 'Login with PATRIC');
        document.querySelector('.vipr-login').style.display = 'none';
        document.querySelector('.patric-login').style.display = 'block';
        document.querySelector('.alt-login-patric').style.display = 'none';
        document.querySelector('.alt-login-vipr').style.display = 'block';
      }
    }
  });
});// endDefine
