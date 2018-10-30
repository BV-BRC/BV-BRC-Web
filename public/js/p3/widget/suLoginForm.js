define([
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
