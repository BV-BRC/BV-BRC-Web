define([
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
