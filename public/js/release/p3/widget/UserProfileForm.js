require({cache:{
'url:p3/widget/templates/UserProfileForm.html':"<div style=\"max-width:400px; overflow-y:auto\">\n  <div class=\"regMessage\" style=\"display:none; border:2px\">\n    <h2 style=\"margin:0px;padding:4px;font-size:1.2em;text-align:center;background:#eee;\">PATRIC User Registration</h2>\n    <p>Your registration has been received. An email has been sent containing the remainder of the registration process.</p>\n    <hr>\n    <p>&nbsp;</p>\n  </div>\n  <form dojoAttachPoint=\"containerNode\" class=\"${baseClass} PanelForm\" dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n    <div class=\"UserProfileForm\" style=\"max-width:380px; display:block\">\n      <table style=\"border-spacing:0\">\n        <tbody>\n          <tr><th style=\"padding:0\">FIRST NAME</th><th style=\"padding:0\">LAST NAME</th></tr>\n          <tr><td style=\"padding-top:0\">\n            <div style=\"width:100%\" data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"first_name\" data-dojo-attach-point=\"fname\" value=\"\" data-dojo-props=\"placeholder:'First Name',promptMessage:'Enter your first name', intermediateChanges: true\" data-dojo-attach-event=\"onChange: fieldChanged\" required=\"true\">\n            </div>\n          </td><td style=\"padding-top:0\">\n            <div data-dojo-type=\"dijit/form/ValidationTextBox\" style=\"width:100%\" name=\"last_name\" value=\"\" data-dojo-attach-point=\"lname\" data-dojo-props=\"placeholder:'Last Name',promptMessage:'Enter your last name', intermediateChanges: true\" data-dojo-attach-event=\"onChange: fieldChanged\" required=\"true\">\n            </div>\n          </td></tr>\n          <tr><th style=\"padding:0\">EMAIL ADDRESS</th><th class=\"usernamehdr\" style=\"padding:0\" data-dojo-attach-point=\"UNH\">USERNAME</th></tr>\n          <tr><td style=\"padding-top:0\">\n            <input type=\"text\" name=\"email\" style=\"width:100%\" data-dojo-attach-point=\"emailField\" data-dojo-type=\"dijit/form/ValidationTextBox\" data-dojo-props=\"placeholder:'Email Address',promptMessage:'Enter your email address',invalidMessage:'Invalid Email Address',validator:dojox.validate.isEmailAddress,trim:true, intermediateChanges: true\" required=\"true\" value=\"\" data-dojo-attach-event=\"onChange: fieldChanged\">\n          </td><td style=\"padding-top:0\">\n            <input class=\"useridField\" type=\"text\" style=\"display:block; width:100%\" name=\"username\" data-dojo-attach-point=\"UNF\"\n              data-dojo-type=\"dijit/form/ValidationTextBox\" value=\"\" required=\"true\"\n              data-dojo-props=\"placeholder:'Username', promptMessage:'Enter your username', intermediateChanges: true, regExp:'[\\\\w.-]+', invalidMessage: 'Enter a combination of letters, numbers, underscore(_), dot(.), and dash(-)'\"\n              data-dojo-attach-event=\"onChange: fieldChanged\" />\n          </td></tr>\n          <tr><th colspan=\"2\" style=\"padding:0\">ORGANIZATION</th></tr>\n          <tr><td colspan=\"2\" style=\"padding-top:0\"><div style=\"width:100%\" data-dojo-type=\"dijit/form/TextBox\" name=\"affiliation\" value=\"\"></div></td></tr>\n          <tr><th colspan=\"2\" style=\"padding:0\">ORGANISMS</th></tr>\n          <tr><td colspan=\"2\" style=\"padding-top:0\"><div name=\"organisms\" data-dojo-type=\"dijit/form/Textarea\" value=\"\"></div></td></tr>\n          <tr><th colspan=\"2\" style=\"padding:0\">INTERESTS</th></tr>\n          <tr><td colspan=\"2\" style=\"padding-top:0\"><div rows=\"5\" name=\"interests\" style=\"height:75px;max-width:99%\" data-dojo-type=\"dijit/form/SimpleTextarea\" value=\"\"></div></td></tr>\n        </tbody>\n      </table>\n      <div class=\"upSubmit\" style=\"position: relative; float:right\" data-dojo-attach-point=\"udProfButton\" type=\"submit\" value=\"Submit\" data-dojo-type=\"dijit/form/Button\">Update Profile</div>\n      <div class=\"newSubmit\" style=\"position: absolute; right: 20px;display:none\" data-dojo-attach-point=\"submitButton\" type=\"submit\" value=\"Submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n      <div>\n        <p>&nbsp;</p>\n        <p>&nbsp;</p>\n        <p class=\"regFormErrors\" style=\"color:red\"></p>\n      </div>\n    </div>\n  </form>\n  <div class=\"changepwsection\" data-dojo-attach-point=\"changePWsec\">\n    <p>&nbsp;</p>\n    <form>\n      <table>\n        <tbody><tr><th style=\"padding:0\">OLD PASSWORD</th></tr>\n            <tr><td style=\"padding-top:0\">\n              <input class=\"pw1field\" type=\"password\" style=\"display:block\" name=\"pw0\" data-dojo-attach-point=\"pw0\" data-dojo-type=\"dijit/form/TextBox\" value=\"\" required=\"true\" data-dojo-props=\"intermediateChanges: true\" data-dojo-attach-event=\"onChange: pwChanged\">\n            </td></tr>\n          <tr><th style=\"padding:0\">NEW PASSWORD</th></tr>\n          <tr><td style=\"padding-top:0\">\n            <input class=\"pw1field\" type=\"password\" style=\"display:block\" name=\"pw1\" data-dojo-attach-point=\"pw1\" data-dojo-type=\"dijit/form/TextBox\" value=\"\" required=\"true\" data-dojo-props=\"intermediateChanges: true\" data-dojo-attach-event=\"onChange: pwChanged\">\n          </td></tr>\n          <tr><th style=\"padding:0\">NEW PASSWORD (reenter)</th></tr>\n          <tr><td style=\"padding-top:0\">\n            <input class=\"pw2field\" type=\"password\" style=\"display:block\" name=\"pw2\" data-dojo-attach-point=\"pw2\" data-dojo-type=\"dijit/form/TextBox\" value=\"\" required=\"true\" data-dojo-props=\"intermediateChanges: true\" data-dojo-attach-event=\"onChange: pwChanged\">\n          </td></tr>\n        </tbody>\n      </table>\n      <div class=\"changePWbutton\" data-dojo-attach-event=\"click: onResetClick\" style=\"margin:auto\" data-dojo-attach-point=\"cPWbutton\" type=\"button\" data-dojo-type=\"dijit/form/Button\">Change Password</div>\n    </form>\n    <div class=\"pwError\" style=\"color:red; margin-top:20px;display:none\"><p>The passwords do not match, please fix</p></div>\n  </div>\n</div>\n"}});
define("p3/widget/UserProfileForm", [
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
      if (document.getElementsByClassName('useridField')[0] !== undefined) {
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
          'id': 1, 'jsonrpc': '2.0', 'method': 'setPassword', 'params': [window.localStorage.userid, this.pw0.get('value'), this.pw1.get('value')]
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
