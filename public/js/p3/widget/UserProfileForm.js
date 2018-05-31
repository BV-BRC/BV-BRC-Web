define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/UserProfileForm.html', 'dijit/form/Form', 'dojo/request',
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
    callbackURL: '',
    userServiceURL: window.App.userServiceURL.replace(/\/+$/, ''),
    fieldChanged: function (evt) {
      this.submitButton.set('disabled', true);
      this.udProfButton.set('disabled', true);
      console.log('field changed');
      console.log(this.emailField.state);
      var userNameValue = 'none';
      if (uidfield = document.getElementsByClassName('useridField')[0] !== undefined) {
        userNameValue = this.UNF.get('value');
      }
      if (userNameValue !== '' && this.emailField.state !== 'Incomplete' && this.fname.get('value') !== '' && this.lname.get('value') !== '') {
        this.submitButton.set('disabled', false);
        this.udProfButton.set('disabled', false);
      }
    },
    pwChanged: function (evt) {
      this.cPWbutton.set('disabled', true);
      // console.log('I changed a pw field');
      if (this.pw1.get('value') !== '' && this.pw2.get('value') !== '' && this.pw0.get('value') !== '') {
        if (this.pw1.get('value') !== this.pw2.get('value')) {
          document.getElementsByClassName('pwError')[0].style.display = 'block';
        } else {
          this.cPWbutton.set('disabled', false);
          document.getElementsByClassName('pwError')[0].style.display = 'none';
        }
      }
    },
    onResetClick: function (evt) {
      // console.log('I clicked the change password button');
      evt.preventDefault();
      evt.stopPropagation();
      domClass.add(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      this.cPWbutton.set('disabled', true);
      if (this.pw1.get('value') !== this.pw2.get('value')) {
        // console.log('they do not match!');
        document.getElementsByClassName('pwError')[0].style.display = 'block';
        this.cPWbutton.set('disabled', false);
      } else {
        console.log('they match, yeah');
        var vals = {
          'id': 1, 'jsonrpc':'2.0', 'method': 'setPassword', 'params': [window.localStorage.userid, this.pw0.get('value'), this.pw1.get('value')]
        };
        var def = xhr(this.userServiceURL + '/user/', {
          data: JSON.stringify(vals),
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': null,
            'Accept': 'application/json',
            'Authorization': window.App.authorizationToken
          }
        });
        def.then(function (data) {
          if (data) {
            window.location.reload();
          } else {
            document.getElementsByClassName('regFormErrors')[0].innerHTML = 'There was an error';
          }
          // console.log(data);
          // document.getElementsByClassName('UserProfileForm')[0].style.display='none';
          document.getElementsByClassName('regMessage')[0].style.display = 'block';
          // newSubmit
          var newSubmitButton = document.getElementsByClassName('newSubmit')[0];
          // console.log(newSubmitButton);
          newSubmitButton.style.display = 'none';
          // var regForm = document.getElementsByClassName('UserProfileForm')[0];
          // regForm.parentNode.removeChild(regForm);

          // document.getElementsByClassName('UserProfileForm')[0].style.display='none';
        }, function (err) {
          console.log(err);
          console.log(err.response.data);
          // var errObj = JSON.parse(err.response);
          // console.log()
          document.getElementsByClassName('regFormErrors')[0].innerHTML = err.response.data;
          // console.log('trying to activate the submit button');
          // console.log(this.submitButton);
        });
      }
    },
    onSubmit: function (evt) {
      // console.log('I clicked the button');
      evt.preventDefault();
      evt.stopPropagation();
      domClass.add(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      this.submitButton.set('disabled', true);
      this.udProfButton.set('disabled', true);
      var vals = this.getValues();
      var _self = this;
      this.userServiceURL = window.App.userServiceURL;
      this.userServiceURL.replace(/\/+$/, '');
      // console.log(vals);
      if (this.auth) {
        this.runPatch(vals);
      } else {
        this.createNewUser(vals);
      }
    },
    createNewUser: function (vals) {
      this.submitButton.set('disabled', false);
      var def = xhr(this.userServiceURL + '/register', {
        data: vals,
        method: 'post',
        headers: {
          'Accept': 'application/json'
        }
      });
      def.then(function (data) {
        // console.log(data);
        // document.getElementsByClassName('UserProfileForm')[0].style.display='none';
        document.getElementsByClassName('regMessage')[0].style.display = 'block';
        // newSubmit
        var newSubmitButton = document.getElementsByClassName('newSubmit')[0];
        // console.log(newSubmitButton);
        newSubmitButton.style.display = 'none';
        // var regForm = document.getElementsByClassName('UserProfileForm')[0];
        // regForm.parentNode.removeChild(regForm);

        // document.getElementsByClassName('UserProfileForm')[0].style.display='none';
      }, function (err) {
        console.log(err);
        var dataObj = JSON.parse(err.response.data);
        document.getElementsByClassName('regFormErrors')[0].innerHTML = dataObj.message;
        // console.log('trying to activate the submit button');
        // console.log(this.submitButton);
      });
    },
    runPatch: function (vals) {
      // build patch
      var patchObj = [];
      if (vals.affiliation !== this.userprofileStored.affiliation) {
        patchObj.push({ 'op': 'replace', 'path': '/affiliation', 'value': vals.affiliation });
        // patchObj.affiliation = vals.affiliation;
      }
      if (vals.email !== this.userprofileStored.email) {
        patchObj.push({ 'op': 'replace', 'path': '/email', 'value': vals.email });
        // patchObj.email = vals.email;
      }
      if (vals.first_name !== this.userprofileStored.first_name) {
        patchObj.push({ 'op': 'replace', 'path': '/first_name', 'value': vals.first_name });
      }
      if (vals.last_name !== this.userprofileStored.last_name) {
        patchObj.push({ 'op': 'replace', 'path': '/last_name', 'value': vals.last_name });
      }
      if (vals.interests !== this.userprofileStored.interests) {
        patchObj.push({ 'op': 'replace', 'path': '/interests', 'value': vals.interests });
      }
      if (vals.organisms !== this.userprofileStored.organisms) {
        patchObj.push({ 'op': 'replace', 'path': '/organisms', 'value': vals.organisms });
      }
      // console.log(JSON.stringify(patchObj));
      var def = xhr(this.userServiceURL + '/user/' + window.localStorage.userid, {
        data: JSON.stringify(patchObj),
        method: 'post',
        headers: {
          'Content-Type': 'application/json-patch+json',
          'X-Requested-With': null,
          'Accept': 'application/json',
          'Authorization': window.App.authorizationToken
        }
      });
      def.then(function (data) {
        console.log(data);
        if (data) {
          window.App.refreshUser();
        } else {
          document.getElementsByClassName('regFormErrors')[0].innerHTML = 'There was an error';
        }
      }, function (err) {
        console.log(err);
      });
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      var state = this.get('state');
      if ((state == 'Incomplete') || (state == 'Error')) {
        this.submitButton.set('disabled', true);
        this.udProfButton.set('disabled', true);
      }

      this.watch('state', function (prop, val, val2) {
        if (val2 == 'Incomplete' || val2 == 'Error') {
          this.submitButton.set('disabled', true);
          this.udProfButton.set('disabled', true);
        } else {
          this.submitButton.set('disabled', false);
          this.udProfButton.set('disabled', false);
        }
      });

      if (!this.showCancel && this.cancelButton) {
        domClass.add(this.cancelButton.domNode, 'dijitHidden');
      }

      // console.log(window.App.authorizationToken);
      if (window.App.authorizationToken !== null && window.App.authorizationToken !== undefined) {
        this.auth = true;
        var userprofileStored = window.localStorage.getItem('userProfile');
        this.userprofileStored = JSON.parse(userprofileStored);
        this.setValues(this.userprofileStored);
        var uidfield = document.getElementsByClassName('useridField')[0];
        uidfield.parentNode.removeChild(uidfield);
        var usernamehdr = document.getElementsByClassName('usernamehdr')[0];
        usernamehdr.parentNode.removeChild(usernamehdr);
      } else {
        this.auth = false;
        document.getElementsByClassName('upSubmit')[0].style.display = 'none';
        document.getElementsByClassName('newSubmit')[0].style.display = 'block';
        var changepwsection = document.getElementsByClassName('changepwsection')[0];
        changepwsection.parentNode.removeChild(changepwsection);
        // document.getElementsByClassName('useridField')[0].style.display = 'block';
        // document.getElementsByClassName('usernamehdr')[0].style.display = 'block';
      }
      // console.log(this.userprofileStored.first_name);

      // this.gethelp();
      this._started = true;
      this.cPWbutton.set('disabled', true);
    }
  });
});
