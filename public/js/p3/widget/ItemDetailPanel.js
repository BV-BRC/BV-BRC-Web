define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/ItemDetailPanel.html', 'dojo/_base/lang', './formatter', 'dojo/dom-style',
  '../WorkspaceManager', 'dojo/dom-construct', 'dojo/query', './DataItemFormatter', 'dojo/topic'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, lang, formatter, domStyle,
  WorkspaceManager, domConstruct, query, DataItemFormatter, Topic
) {
  return declare([WidgetBase, Templated, WidgetsInTemplate], {
    baseClass: 'ItemDetailPanel',
    disabled: false,
    templateString: Template,
    selection: null,
    item: null,
    containerWidget: null,

    property_aliases: {
      document_type: 'type',
      organism_name: 'name'
    },
    _setContainerWidgetAttr: function (val) {

      // added this stuff so that the containerType can be
      // dynamically updated (for homology viewer).  It would normally be handled
      // by the watch in startup, but that doesn't seem to work
      // here, I think because the contiainerWidget itself isnt' changing
      // so the watch doesn't get triggered.
      if (this.containerWidget) {
        if (this.containerWidget.containerType !== val.containerType) {
          domClass.remove(this.domNode, this.containerWidget.containerType);
        }
        if (val.containerType) {
          domClass.add(this.domNode, val.containerType);
        }
      } else {
        if (val.containerType) {
          domClass.add(this.domNode, val.containerType);
        }
      }
      this._set('containerWidget', val);
    },
    startup: function () {
      var _self = this;
      // if (this._started) { return; }
      var currentIcon;

      this.watch('containerWidget', lang.hitch(this, function (prop, oldVal, containerWidget) {
        if (oldVal && oldVal.containerType) {
          domClass.remove(this.domNode, oldVal.containerType);
        }

        this.containerWidget = containerWidget;
        if (this.containerWidget && this.containerWidget.containerType) {
          domClass.add(this.domNode, this.containerWidget.containerType);
        }

      }));

      this.watch('selection', lang.hitch(this, function (prop, oldVal, selection) {
        if (!selection || selection.length < 1) {
          domClass.add(this.domNode, 'noSelection');
          domClass.remove(this.domNode, 'multipleSelection');
          domClass.remove(this.domNode, 'singleSelection');
        } else if (selection && selection.length == 1) {
          domClass.remove(this.domNode, 'noSelection');
          domClass.remove(this.domNode, 'multipleSelection');
          domClass.add(this.domNode, 'singleSelection');
          this.set('item', selection[0]);
        } else if (selection && selection.length > 1) {
          domClass.remove(this.domNode, 'noSelection');
          domClass.add(this.domNode, 'multipleSelection');
          domClass.remove(this.domNode, 'singleSelection');
          this.countDisplayNode.innerHTML = selection.length + ' items selected.';
        }
      }));

      this.watch('item', lang.hitch(this, function (prop, oldVal, item) {
        domClass.remove(_self.typeIcon, currentIcon);
        if (item.type) {
          domClass.add(this.domNode, 'workspaceItem');
          domClass.remove(this.domNode, 'dataItem');

          var t = item.document_type || item.type;

          // determine if workspace and if actually shared
          // Todo(nc): move logic to api method
          if (t == 'folder' && item.path.split('/').length <= 3) {
            if (item.global_permission != 'n') {
              t = 'publicWorkspace';
            } else {
              t = item.permissions.length > 1 ? 'sharedWorkspace' : 'workspace';
            }
          }

          switch (t) {
            case 'folder':
              domClass.add(_self.typeIcon, 'fa icon-folder fa-2x');
              currentIcon = 'fa icon-folder fa-2x';
              break;
            case 'workspace':
              domClass.add(_self.typeIcon, 'fa icon-hdd-o fa-2x');
              currentIcon = 'fa icon-hdd-o fa-2x';
              break;
            case 'sharedWorkspace':
              domClass.add(_self.typeIcon, 'fa icon-shared-workspace fa-2x');
              currentIcon = 'fa icon-shared-workspace fa-2x';
              break;
            case 'publicWorkspace':
              domClass.add(_self.typeIcon, 'fa icon-globe fa-2x');
              currentIcon = 'fa icon-globe fa-2x';
              break;
            case 'contigs':
              domClass.add(_self.typeIcon, 'fa icon-contigs fa-2x');
              currentIcon = 'fa icon-contigs fa-2x';
              break;
            case 'fasta':
              domClass.add(_self.typeIcon, 'fa icon-fasta fa-2x');
              currentIcon = 'fa icon-fasta fa-2x';
              break;
            case 'genome_group':
              domClass.add(_self.typeIcon, 'fa icon-genome_group fa-2x');
              currentIcon = 'fa icon-genome_group fa-2x';
              break;
            case 'job_result':
              domClass.add(_self.typeIcon, 'fa icon-flag-checkered fa-2x');
              currentIcon = 'fa icon-flag-checkered fa-2x';
              break;
            case 'feature_group':
              domClass.add(_self.typeIcon, 'fa icon-genome-features fa-2x');
              currentIcon = 'fa icon-genome-features fa-2x';
              break;

            default:
              domClass.add(_self.typeIcon, 'fa icon-file fa-2x');
              currentIcon = 'fa icon-file fa-2x';
              break;
          }

          // silence all special help divs
          var specialHelp = query('.specialHelp');
          specialHelp.forEach(function (item) {
            dojo.style(item, 'display', 'none');
          });
          Object.keys(item).forEach(function (key) {
            var val = item[key];
            if (key == 'creation_time') {
              val = formatter.date(val);
            }
            if (key == 'name') {
              if (val == 'Feature Groups') {
                dojo.style(this.featureGroupHelp, 'display', 'inline-block');
              }
              else if (val == 'Genome Groups') {
                dojo.style(this.genomeGroupHelp, 'display', 'inline-block');
              }
              else if (val == 'Experiments') {
                dojo.style(this.experimentHelp, 'display', 'inline-block');
              }
              else if (val == 'Experiment Groups') {
                dojo.style(this.experimentGroupHelp, 'display', 'inline-block');
              }
            }
            if (key == 'type') {
              _self[key + 'Node'].set('value', val);
              _self[key + 'Node'].set('displayedValue', val);
              _self[key + 'Node'].cancel();

              if (Object.prototype.hasOwnProperty.call(WorkspaceManager.changeableTypes, val)) {
                // build change type dropdown
                _self[key + 'Node'].set('disabled', false);
                domStyle.set(_self[key + 'Node'].domNode, 'text-decoration', 'underline');

                domConstruct.place(
                  ' <i class="fa icon-caret-down" style="text-decoration: none;"></i>',
                  _self[key + 'Node'].domNode
                );

                var type_options = Object.keys(WorkspaceManager.changeableTypes).map(function (key) {
                  return WorkspaceManager.changeableTypes[key];
                }, this);
                _self[key + 'Node'].editorParams.options = type_options;
              }
              else {
                _self[key + 'Node'].set('disabled', true);
                domStyle.set(_self[key + 'Node'].domNode, 'text-decoration', 'none');
              }
            } else if (key == 'permissions') {
              var node = _self[key + 'Node'];

              var rows = [];

              // add owner's priv
              if (item.user_permission == 'o')
              { rows.push(window.App.user.id.split('@')[0] + ' (me) - Owner'); }
              else
              { rows.push(formatter.baseUsername(item.owner_id) + ' - Owner'); }

              // add all other privs, ignoring global permisssion
              // and workaround this https://github.com/PATRIC3/Workspace/issues/54
              val.forEach(function (perm) {
                if (perm[0] == 'global_permission') return;
                var isOwner = (perm[0] == window.App.user.id);
                var user = perm[0].split('@')[0];

                rows.push((isOwner ? user + ' (me)' : user) + ' - ' + formatter.permissionMap(perm[1]));
              });

              // edit perms btn
              var editBtn = domConstruct.toDom('<a>Edit</a>');
              on(editBtn, 'click', function () {
                _self.openPermEditor(item);
              });

              domConstruct.empty(node);
              domConstruct.place('<b>Workspace Members</b> ', node);

              // only show edit button if user has the right permissions
              if (item.path.split('/').length <= 3 && ['o', 'a'].indexOf(item.user_permission) != -1)
              { domConstruct.place(editBtn, node); }

              domConstruct.place(
                '<br>' +
                rows.join('<br>') + '<br><br>'
                , node
              );

            } else if (this.property_aliases[key] && _self[this.property_aliases[key] + 'Node']) {
              _self[this.property_aliases[key] + 'Node'].innerHTML = val;
            } else if (this.property_aliases[key] && _self[this.property_aliases[key] + 'Widget']) {
              _self[this.property_aliases[key] + 'Widget'].set('value', val);
            } else if (_self[key + 'Node']) {
              _self[key + 'Node'].innerHTML = val;
            } else if (_self[key + 'Widget']) {
              _self[key + 'Widget'].set('value', val);
            } else if (key == 'autoMeta') {
              var curAuto = formatter.autoLabel('itemDetail', item.autoMeta);
              var subRecord = [];
              Object.keys(curAuto).forEach(function (prop) {
                if (!curAuto[prop] || prop == 'inspection_started') {
                  return;
                }
                if (Object.prototype.hasOwnProperty.call(curAuto[prop], 'label') && Object.prototype.hasOwnProperty.call(curAuto[prop], 'value')) {
                  subRecord.push('<div class="ItemDetailAttribute">' + curAuto[prop].label + ': <span class="ItemDetailAttributeValue">' + curAuto[prop].value + '</span></div></br>');
                }
                else if (Object.prototype.hasOwnProperty.call(curAuto[prop], 'label')) {
                  subRecord.push('<div class="ItemDetailAttribute">' + curAuto[prop].label + '</div></br>');
                }
              }, this);
              _self.autoMeta.innerHTML = subRecord.join('\n');
              // Object.keys(val).forEach(function(aprop){
              // },this);
            }
          }, this);
        } else if (this.containerWidget && this.containerWidget.containerType) {
          domClass.remove(this.domNode, 'workspaceItem');
          domClass.add(this.domNode, 'dataItem');

          var node;
          if (this.containerWidget.containerType === 'subsystem_data') {
            node = DataItemFormatter(item, this.containerWidget.containerType, this.containerWidget.state);
          } else {
            node = DataItemFormatter(item, this.containerWidget.containerType);
          }
          domConstruct.empty(this.itemBody);
          domConstruct.place(node, this.itemBody, 'first');
        } else if (item && item._formatterType) {
          domClass.remove(this.domNode, 'workspaceItem');
          domClass.add(this.domNode, 'dataItem');

          var node = DataItemFormatter(item, item._formatterType);
          domConstruct.empty(this.itemBody);
          domConstruct.place(node, this.itemBody, 'first');

        } else {

          domClass.remove(this.domNode, 'workspaceItem');
          domClass.add(this.domNode, 'dataItem');

          var node = DataItemFormatter(item, 'default');
          domConstruct.empty(this.itemBody);
          domConstruct.place(node, this.itemBody, 'first');
        }
      }));
      this.inherited(arguments);
    },

    // opens works permission editor for given item
    openPermEditor: function (item) {
      Topic.publish('/openUserPerms', [item]);
    },

    saveType: function (val, val2) {
      // only update meta if value has changed
      if (this.item.type == val) return;

      var newMeta = {
        path: this.item.path,
        userMeta: this.item.userMeta,
        type: val
      };

      WorkspaceManager.updateMetadata(newMeta)
        .then(function (meta) {
          this.item = WorkspaceManager.metaListToObj(meta);
        });
    }
  });
});
