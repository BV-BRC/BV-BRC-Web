require({cache:{
'url:p3/widget/templates/SelectionToGroup.html':"<div class=\"SelectionToGroup\" style=\"width:400px;\">\n\n\n  <div data-dojo-attach-point=\"groupTypeBox\" class=\"dijitHidden\">\n    <label>Group Type</label><br>\n    <div data-dojo-type=\"dijit/form/Select\"\n      data-dojo-attach-point=\"groupTypeSelect\"\n      style=\"width:95%;margin:10px;\"\n      data-dojo-attach-event=\"onChange:onChangeOutputType\" >\n    </div>\n  </div>\n\n  <label>New/Existing</label><br>\n  <div data-dojo-type=\"dijit/form/Select\"\n    style=\"width: 95%;margin:10px;\"\n    data-dojo-attach-event=\"onChange:onChangeTarget\"\n    data-dojo-attach-point=\"targetType\">\n    <option value=\"new\">New Group</option>\n    <option value=\"existing\" selected=\"true\">Existing Group</option>\n  </div>\n\n\n\n  <label data-dojo-attach-point=\"groupPathLabel\" class='dijitHidden'>\n    Group Folder\n    <span style=\"opacity: 0.7;\">(defaults to your groups folder)</span>\n  </label><br>\n  <div data-dojo-attach-point=\"groupPathSelector\"\n    data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"group_path\" style=\"width:95%;margin:10px;\"\n    required=\"false\"\n    class='dijitHidden'\n    data-dojo-props=\"allowUpload:false,type:['folder'],multi:false,promptMessage:'Enter alternative group folder',missingMessage:'Optional'\"\n    data-dojo-attach-event=\"onChange:onChangeGroupPath\">\n  </div>\n\n\n\n  <label>Group Name</label><br>\n  <div data-dojo-attach-point=\"groupNameBox\"\n    data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\"\n    style=\"width:95%;margin:10px;\"\n    class='dijitHidden'\n    data-dojo-props=\"promptMessage:'Enter New Group Name'\"\n    data-dojo-attach-event=\"onChange:onChangeTarget\" >\n  </div>\n\n  <div data-dojo-attach-point=\"workspaceObjectSelector\"\n    data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"\n    style=\"width:95%;margin:10px;\"\n    data-dojo-props=\"type:['genome_group']\"\n    data-dojo-attach-event=\"onChange:onChangeTarget\"\n    class=''>\n  </div>\n\n\n\n  <div class=\"buttonContainer\" style=\"text-align: right;\">\n    <div data-dojo-type=\"dijit/form/Button\" label=\"Cancel\" data-dojo-attach-event=\"onClick:onCancel\"></div>\n<!--    <div data-dojo-type=\"dijit/form/Button\" label=\"Split\" disabled='true'></div> -->\n    <div data-dojo-type=\"dijit/form/Button\" disabled='true' label=\"Add\" data-dojo-attach-point=\"copyButton\" data-dojo-attach-event=\"onClick:onCopy\"></div>\n  </div>\n</div>\n"}});
define("p3/widget/SelectionToGroup", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/SelectionToGroup.html', 'dojo/_base/lang',
  '../WorkspaceManager', 'dojo/dom-style', 'dojo/parser', 'dijit/form/Select', './WorkspaceFilenameValidationTextBox',
  './WorkspaceObjectSelector'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, lang, WorkspaceManager, domStyle, Parser, Select, WorkspaceFilenameValidationTextBox,
  WorkspaceObjectSelector
) {
  return declare([WidgetBase, Templated, WidgetsInTemplate], {
    baseClass: 'Panel',
    disabled: false,
    templateString: Template,
    selection: null,
    path: null,
    type: 'genome_group',
    idType: null,
    inputType: null,
    conversionTypes: {
      feature_data: [{ label: 'Feature', value: 'feature_group' }, { label: 'Genome', value: 'genome_group' }]
    },
    selectType: false,
    _setTypeAttr: function (t) {
      this.type = t;
      if (this.workspaceObjectSelector) {
        this.workspaceObjectSelector.set('type', [t]);
      }
    },

    _setPathAttr: function (path) {
      this.path = path;

      if (this.workspaceObjectSelector) {
        this.workspaceObjectSelector.set('path', this.path);
      }

      // for new groups
      if (this.groupPathSelector) {
        this.groupPathSelector.set('path', '/' + window.App.user.id);
        this.groupPathSelector.set('value', this.path);
      }
      if (this.groupNameBox) {
        this.groupNameBox.set('path', this.path);
      }
    },
    onChangeOutputType: function () {
      this.set('type', this.groupTypeSelect.get('value'));
      this.set('path', WorkspaceManager.getDefaultFolder(this.type));
      this.onChangeTarget(this.type);
      if (this.type == 'genome_group') {
        this.idType = 'genome_id';
      }
      else if (this.type == 'feature_group') {
        this.idType = 'feature_id';
      }
    },

    // only used for new groups
    onChangeGroupPath: function (newPath) {
      this.path = newPath;

      // need to update path of group name box since validation
      // and value (full path) state is kept and fetched from there.
      this.groupNameBox.set('path', newPath);
    },

    onChangeTarget: function (target) {
      if (!this._started) {
        return;
      }
      var targetType = this.targetType.get('value');
      var val;

      if (targetType == 'existing') {
        domClass.remove(this.workspaceObjectSelector.domNode, 'dijitHidden');

        // only if new group
        domClass.add(this.groupPathLabel, 'dijitHidden');
        domClass.add(this.groupPathSelector.domNode, 'dijitHidden');
        domClass.add(this.groupNameBox.domNode, 'dijitHidden');

        val = this.workspaceObjectSelector.get('value');

      } else {
        domClass.add(this.workspaceObjectSelector.domNode, 'dijitHidden');

        // only if new group
        domClass.remove(this.groupPathLabel, 'dijitHidden');
        domClass.remove(this.groupPathSelector.domNode, 'dijitHidden');
        domClass.remove(this.groupNameBox.domNode, 'dijitHidden');


        val = this.groupNameBox.isValid() ? this.groupNameBox.get('value') : false;
      }
      // console.log("Target Val: ", val);
      this.value = val;
      if (val) {
        this.copyButton.set('disabled', false);
      } else {
        this.copyButton.set('disabled', true);
      }
    },
    startup: function () {
      // var _self = this;
      if (this._started) {
        return;
      }
      // var currentIcon;
      this.watch('selection', lang.hitch(this, function (prop, oldVal, item) {
        console.log('set selection(): ', arguments);
      }));
      if (!this.path) {

        this.path = WorkspaceManager.getDefaultFolder(this.type);
        this.set('path', WorkspaceManager.getDefaultFolder(this.type));

      }
      this.inherited(arguments);

      if (this.inputType in this.conversionTypes) {
        this.selectType = true;
        domClass.remove(this.groupTypeBox, 'dijitHidden');
        this.groupTypeSelect.set('options', this.conversionTypes[this.inputType]);
        this.groupTypeSelect.set('value', this.conversionTypes[this.inputType][0].value);
        this.groupTypeSelect.set('displayedValue', this.conversionTypes[this.inputType][0].label);
      }
    },

    onCancel: function (evt) {
      on.emit(this.domNode, 'dialogAction', { action: 'close', bubbles: true });
    },
    onCopy: function (evt) {

      if (!this.idType) {
        this.idType = 'genome_id';
        if (this.type == 'genome_group') {
          this.idType = 'genome_id';
        }
        else if (this.type == 'feature_group') {
          this.idType = 'feature_id';
        }
        else if (this.type == 'experiment_group') {
          this.idType = 'eid';
        }
      }
      var def;
      if (this.targetType.get('value') == 'existing') {
        def = WorkspaceManager.addToGroup(this.value, this.idType, this.selection.filter(lang.hitch(this, function (d) {
          return this.idType in d;
        })).map(lang.hitch(this, function (o) {
          return o[this.idType];
        })));
      } else {
        def = WorkspaceManager.createGroup(this.value, this.type, this.path, this.idType, this.selection.filter(lang.hitch(this, function (d) {
          return this.idType in d;
        })).map(lang.hitch(this, function (o) {
          return o[this.idType];
        })));
      }
      def.then(lang.hitch(this, function () {
        on.emit(this.domNode, 'dialogAction', { action: 'close', bubbles: true });
      }));
    }

  });
});
