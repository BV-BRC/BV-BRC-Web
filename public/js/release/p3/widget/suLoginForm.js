require({cache:{
'url:p3/widget/templates/suLoginForm.html':"<form dojoAttachPoint=\"containerNode\" class=\"${baseClass} PanelForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n  <div style=\"padding:2px; margin:10px;\">\n    <input type=\"text\" name=\"suname\"/ data-dojo-type=\"dijit/form/TextBox\" style=\"width:100%\" data-dojo-props='placeholder:\"Username of user to login as\"'><br/>\n  </div>\n\n  <div style=\"padding:2px; margin:10px;\">\n    <input type=\"text\" name=\"username\"/ data-dojo-type=\"dijit/form/TextBox\" style=\"width:100%\" data-dojo-props='placeholder:\"Your Username or Email Address\"'><br/>\n  </div>\n  <div style=\"padding:2px;margin:10px;\">\n    <input type=\"password\" name=\"password\" data-dojo-type=\"dijit/form/TextBox\" style=\"width:100%\" data-dojo-props='placeholder:\"Your Password\"'/>\n  </div>\n  <div class=\"messageContainer workingMessage\">\n    Logging into PATRIC....\n  </div>\n\n  <div class=\"messageContainer errorMessage\">\n    We were unable to log you in  with the credentials provided.\n  </div>\n\n  <div style=\"text-align:center;padding:2px;margin:10px;\">\n    <div data-dojo-attach-point=\"cancelButton\" type=\"submit\" value=\"Submit\" data-dojo-type=\"dijit/form/Button\" class=\"dijitHidden\">Login</div>\n    <div data-dojo-attach-point=\"submitButton\" type=\"submit\" value=\"Submit\" data-dojo-type=\"dijit/form/Button\">Login</div>\n  </div>\n  <div style=\"font-size:.85em;\">\n    <!-- New to PATRIC?  <a href=\"/register\">REGISTER HERE</a> </br> -->\n    <a href=\"/reset_password\">Forgot Your password?</a>\n  </div>\n</form>\n"}});
define("p3/widget/suLoginForm", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/suLoginForm.html', 'dijit/form/Form', 'dojo/request',
  'dojo/dom-form', 'dojo/_base/lang'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, FormMixin, xhr,
  domForm, lang
) {
  return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
    baseClass: 'App Sleep',
    templateString: Template,
    callbackURL: '',
    onSubmit: function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      domClass.add(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      this.submitButton.set('disabled', true);
      var vals = this.getValues();

      var def = xhr.post('/sulogin', {
        data: vals,
        withCredentials: true
      });

      def.then(lang.hitch(this, function (results) {
        // console.log("Login Results: ", results, arguments);
        console.log('Login Window location: ', window.location, window.location.query);
        domClass.remove(this.domNode, 'Working');
        console.log('this.callbackURL', this.callbackURL);
        if (this.callbackURL) {
          window.location = this.callbackURL;
        } else {
          window.location = '/';
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

      if (!this.showCancel && this.cancelButton) {
        domClass.add(this.cancelButton.domNode, 'dijitHidden');
      }

      this.gethelp();
      this._started = true;
    }
  });
});
