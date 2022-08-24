define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/SuLogin.html', 'dijit/form/Form', 'dojo/request',
  'dojo/dom-form', 'dojo/_base/lang', 'dojox/validate/web'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, FormMixin, xhr,
  domForm, lang, validate
) {
  return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
    'baseClass': 'App Sleep',
    templateString: Template,
    fieldChanged: function (evt) {
      this.submitButton.set('disabled', true);
      if (this.uidField.get('value') !== '' && this.pwField.get('value') !== '') {
        this.submitButton.set('disabled', false);
      }
    },
    switchBack: function (evt) {
      window.App.suSwitchBack();
      // console.log('I clicked the switch back button');
      // localStorage.setItem('auth', localStorage.getItem('Aauth'));
      // localStorage.setItem('tokenstring', localStorage.getItem('Atokenstring'));
      // localStorage.setItem('userProfile', localStorage.getItem('AuserProfile'));
      // localStorage.setItem('userid', localStorage.getItem('Auserid'));
      // localStorage.removeItem('Aauth');
      // localStorage.removeItem('Atokenstring');
      // localStorage.removeItem('AuserProfile');
      // localStorage.removeItem('Auserid');
      // window.App.authorizationToken = localStorage.getItem('tokenstring');
      // window.App.user = JSON.parse(localStorage.getItem('userProfile'));
      //   window.location.href = '/';
    },
    onSubmit: function (evt) {
      console.log('I clicked the button');
      evt.preventDefault();
      evt.stopPropagation();
      domClass.add(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      // this.submitButton.set('disabled', true);
      var vals = this.getValues();
      vals.username = localStorage.getItem('userid');
      // console.log(vals);

      var userServiceURL = window.App.userServiceURL;
      userServiceURL.replace(/\/+$/, '');
      var def = xhr.post(userServiceURL + '/authenticate/sulogin', {
        data: vals
        // data: JSON.stringify(vals),
        // headers: { 'Content-Type': 'application/json' }
      });
      def.then(function (data) {
        // console.log(data);
        // set the localStorage variables
        localStorage.setItem('Aauth', localStorage.getItem('auth'));
        localStorage.setItem('Atokenstring', localStorage.getItem('tokenstring'));
        localStorage.setItem('AuserProfile', localStorage.getItem('userProfile'));
        localStorage.setItem('Auserid', localStorage.getItem('userid'));
        localStorage.setItem('Arealm', localStorage.getItem('realm'));
        // window.location.href = '/';
        var dataArr = data.split('|');
        var keyValueArr = [];
        // console.log(dataArr);
        var dataobj =  {};
        for (var i = 0; i < dataArr.length; i++) {
          keyValueArr = dataArr[i].split('=');
          dataobj[keyValueArr[0]] = keyValueArr[1];
        }
        window.App.login(dataobj, data);
        // document.getElementsByClassName('sulogin')[0].style.display='block';
        // window.location.href = '/';
      }, function (err) {
        // var errorMessage = data.response.message;
        console.log(err);
        var dataObj = JSON.parse(err.response.data);
        console.log(dataObj.message);
        // document.getElementsByClassName('loginError')[0].innerHTML = dataObj.message;
        window.location.href = '/';
      });
    },
    constructor: function () {
      var wrongRole = true;
      // console.log(window.location.href);
      var auth = localStorage.getItem('auth');
      auth = JSON.parse(auth);
      if (auth.roles !== null && auth.roles !== undefined) {
        if (auth.roles.includes('admin')) {
          wrongRole = false;
        }
        // console.log(auth.roles);
      }
      var suLogged = localStorage.getItem('Aauth');
      suLogged = JSON.parse(suLogged);
      if (suLogged !== null && suLogged !== undefined)
      { if (suLogged.roles !== undefined) {
        if (suLogged.roles.includes('admin')) {
          wrongRole = false;
        }
      }
      }
      if (wrongRole) {
        window.location.href = '/';
      }
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this._started = true;
      this.submitButton.set('disabled', true);
      var suLogged = localStorage.getItem('Aauth');
      suLogged = JSON.parse(suLogged);
      // console.log(suLogged);
      if (suLogged !== null && suLogged !== undefined) {
        if (suLogged.roles !== undefined) {
          if (suLogged.roles.includes('admin')) {
            // show switch back form and hit sulogin FormMixin
            document.getElementsByClassName('suLoginDiv')[0].style.display = 'none';
            document.getElementsByClassName('switchBack')[0].style.display = 'block';
          }
        }
      }
    }
  });
});
