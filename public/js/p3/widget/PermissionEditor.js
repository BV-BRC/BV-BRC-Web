/**
 * PermissionEditor
 *
 * - Takes a single selection {path: 'path/to/some/object'}
 *  and allows user to edit permissions on that object.
 *
 * - Note: this editor saves permissions on each add/remove,
 *    using the appropriate API (as opposed to saving after
 *    the dialog is closed).
 *
 *
 * Example Usage:
 *
 *  var editor = PermissionEditor({
 *    path: 'my/object',
 *    user: user@patricbrc.org
*  })
 *  editor.onConfirm = function(){ //do something }
 *  editor.show()
 *
 * API
 *
 *    .selection - object (meta) for which we are editing permissions
 *    .show() - opens the eidtor
 *    .onConfirm() - callback for when "ok" button is clicked
 *    .onCancel() - callback for when dialog is canceled
 *
 * Author(s):
 *  nconrad
 *
 */

define([
  'dojo', 'dojo/_base/declare', 'dijit/_WidgetBase', './Confirmation', // dojo/on
  '../widget/UserSelector', './formatter', 'dojo/dom-construct',
  'dijit/form/Select', 'dijit/form/Button', 'dijit/form/CheckBox', 'dojo/query'
], function (
  dojo, declare, WidgetBase, Confirmation,
  UserSelector, Formatter, domConstruct,
  Select, Button, CheckBox, query
) {
  return declare([WidgetBase], {
    /* required widget input */
    selection: null,    // objects to be shared
    permissions: [],    // initial permissions of objects/items/whatever
    user: null,        // owner of object(s)
    useSolrAPI: false,

    /**
     * Data model and data model helpers
     */
    _userPerms: [],

    constructor: function (o) {
      this.selection = o.selection;
      this.onConfirm = o.onConfirm ? o.onConfirm : function () {};
      this.onCancel = o.onCancel ? o.onCancel : function () {};
      this.useSolrAPI = o.useSolrAPI || false;
      this._userPerms = [];
    },
    postCreate: function (o) {

    },
    startup: function (o) {
      if (this._started) {
        return;
      }

      this._started = true;
    },

    /**
     * What to do after confirm
     */
    onConfirm: function () {},

    /**
     * What to do after cancel (x button)
     */
    onCancel: function () {},

    loadingHTML:
      '<img src="/patric/images/loader.gif" class="pull-right" height="20"/>',


    rmUser: function (userId) {
      this._userPerms = this._userPerms.filter(function (perm) {
        return userId != perm.user;
      });
    },

    addUser: function (userId, perm) {
      if (this.findUser(userId)) return false;

      this._userPerms.push({
        user: userId,
        permission: perm
      });

      return true;
    },

    findUser: function (userId) {
      return this._userPerms.find(function (perm) {
        return userId == perm.user;
      });
    },

    setPerm: function (userId, newPerm) {
      this._userPerms.forEach(function (perm, i, perms) {
        if (perm.user == userId) perms[i].permission = newPerm;
      });
    },


    /**
     * Opens the editor (in dialog)
     */
    show: function () {
      var self = this;


      /**
       * Build the form and events
       */
      var form = self.form = domConstruct.toDom('<div class="userPermForm">');
      domConstruct.place(
        '<h4 style="margin-bottom: 5px;">' +
          'Share with Specific Users' +
        '</h4>'
        , form
      );

      self.progressEle = domConstruct.place(
        '<span>' +
          self.loadingHTML +
        '</span>'
        , form
      );
      self.currentUsers = domConstruct.toDom('<table class="currentUsers p3basic striped" style="margin-bottom: 10px;">' +
          '<thead>' +
            '<tr>' +
              '<th>User Name' +
              '<th>Permission' +
              '<th>&nbsp;' +
          '<tbody>' +
            '<tr>' +
              '<td><i>' + self.user.split('@')[0] + ' ' + (self.user == 'me' ? '(me)' : '') + '</i>' +
              '<td>Owner' +
              '<td>&nbsp;');

      // user search box
      var userSelector = new UserSelector({ name: 'user' });

      // user's permission
      var newPermSelect = new Select({
        name: 'perm',
        style: { width: '100px', margin: '0 10px' },
        options: [
          {
            label: 'Can view',
            value: 'r',
            selected: true
          }, {
            label: 'Can edit',
            value: 'w'
          }
        ]
      });

      // add user's permission button
      var addUserBtn = new Button({
        label: '<i class="icon-plus"></i> Add User',
        onClick: function () {
          var user = userSelector.getSelected();
          var perm = newPermSelect.attr('value');

          if (!user) return;

          // don't add already existing users
          if (self.findUser(user)) {
            return;
          }

          // add a new row of user, perm selector, and trash button
          var permSelector = self.permSelector(user, perm);
          var row = domConstruct.toDom('<tr><td data-user="' + user + '">' + Formatter.baseUsername(user) + '</td></tr>');

          var td = domConstruct.toDom('<td>');
          domConstruct.place(permSelector.domNode, td);
          domConstruct.place(td, row);
          domConstruct.place(
            domConstruct.toDom('<td style="width: 1px"><i class="fa icon-trash-o fa-2x"></i></td>')
            , row
          );
          var newRow = domConstruct.place(row, query('tbody', self.currentUsers)[0]);

          self.addUser(user, perm);
          self.addDeleteEvent(newRow);
          self.progressEle.innerHTML = '';

          // reset filter select
          userSelector.reset();

          // allow save now
          self.dialog.okButton.set('disabled', false);
        }
      });

      domConstruct.place(self.currentUsers, form);
      domConstruct.place(userSelector.domNode, form);
      domConstruct.place(newPermSelect.domNode, form, 'last');
      domConstruct.place(addUserBtn.domNode, form, 'last');

      // open form in dialog
      var itemCount = self.selection.length;
      this.dialog = new Confirmation({
        title: 'Edit Sharing' + (itemCount > 1 ? ' (for ' + itemCount + ' Items)' : ''),
        okLabel: 'Save',
        cancelLabel: 'Cancel',
        content: form,
        style: { width: '510px' },
        onConfirm: function (evt) {
          self.onConfirm(self._userPerms, self.isPublic ? 'r' : 'n');
        }
      });
      this.dialog.okButton.set('disabled', true);

      if (this.useSolrAPI) {
        this.listSolrPermissions();
      } else {
        this.listWSPermissions();
      }

      this.dialog.startup();
      this.dialog.show();

      // destroy dialog on links
      query('.navigationLink', form).on('click', function (e) {
        self.dialog.destroy();
      });
    },


    /*
      * list solr (initial) permissions in dom
    */
    listSolrPermissions: function () {
      var self = this;
      // var form = self.form;
      var selection = this.selection;

      /**
       * not yet allowing publication
       *
      if (selection.length == 1) {
        var isPublic = this.selection['public'];
        var checkBox = domConstruct.toDom('<div class="publicCheckBox">');
        var cb = new CheckBox({
          name: 'checkBox',
          value: 'isPublic',
          checked: isPublic,
          onChange: function (e) {
          }
        });
        cb.placeAt(checkBox);
        checkBox.appendChild(domConstruct.create('label', {
          'for': 'publicCB',
          'innerHTML': ' Publicly Readable'
        }));
        domConstruct.place(checkBox, form, 'first');

        domConstruct.place(
          '<h4 style="margin-bottom: 5px;">' +
            'Share with Everybody' +
          '</h4>',
          form, 'first'
        );
      }
      */


      // user perms

      var userSet = {}; // ensures users aren't listed more than once in multi object permissions
      var perms = this.permissions;
      perms.forEach(function (p) {
        var userCount = perms.filter(function (pp) {
          return pp.user == p.user && pp.perm == p.perm;
        }).length;

        var user = p.user,
          perm = p.perm;

        if (user in userSet) return;
        userSet[user] = 1;

        // we won't want to change permission if different amount objects
        if (userCount !== selection.length) perm = 'Varies';

        self.addUser(user, perm);

        // adding rows of user, perm selector, and trash button
        var permSelector = self.permSelector(user, perm);
        var row = domConstruct.toDom('<tr><td data-user="' + user + '">' + Formatter.baseUsername(user) + '</td></tr>');

        var td = domConstruct.toDom('<td>');
        domConstruct.place(permSelector.domNode, td);
        domConstruct.place(td, row);
        domConstruct.place(
          domConstruct.toDom('<td style="width: 1px"><i class="fa icon-trash-o fa-2x"></i></td>')
          , row
        );
        var newRow = domConstruct.place(row, query('tbody', self.currentUsers)[0]);

        // event for deleting users
        self.addDeleteEvent(newRow);
      });


      self.progressEle.innerHTML = '';
    },


    permSelector: function (user, defaultPerm) {
      var self = this;
      var opts = [
        {
          label: 'Can view',
          value: self.useSolrAPI ? 'Can view' : 'r'
        }, {
          label: 'Can edit',
          value: self.useSolrAPI ? 'Can edit' : 'w'
        }
      ];

      // checking that perm is a string for old ws bug mangled data bug
      // https://github.com/PATRIC3/patric3_website/issues/2215
      if (typeof defaultPerm !== 'string') {
        return domConstruct.toDom('<span class="Failed">Invalid permission</span');
      }

      if (defaultPerm.toLowerCase() == 'varies') {
        opts.unshift({
          label: 'Varies*',
          value: 'varies'
        });
      }

      opts.forEach(function (opt, i ) {
        if (defaultPerm == opt.value || defaultPerm == opt.label)
        { opts[i].selected = true; }
      });

      var selector = new Select({
        name: 'perm',
        style: { width: '100px', margin: '0 0px' },
        options: opts,
        user: user
      });

      selector.on('change', function () {
        var user = this.get('user'),
          perm = this.get('value');

        self.setPerm(user, perm);
        self.dialog.okButton.set('disabled', false);
      });

      return selector;
    },

    /*
     * list workspace (initial) permissions in dom
    */
    listWSPermissions: function () {
      var self = this,
        form = self.form;


      var perms = this.permissions;
      // add global permission toggle (using latest state)
      var globalPerm = perms.filter(function (p) {
        return p[0] == 'global_permission';
      })[0][1];

      self.isPublic = globalPerm != 'n';

      var checkBox = domConstruct.toDom('<div class="publicCheckBox">');
      var cb = new CheckBox({
        name: 'checkBox',
        value: 'isPublic',
        checked: self.isPublic,
        onChange: function (isChecked) {
          self.isPublic = isChecked;
          self.dialog.okButton.set('disabled', false);
        }
      });
      cb.placeAt(checkBox);

      checkBox.appendChild(domConstruct.create('label', {
        'for': 'publicCB',
        'innerHTML': ' Publicly Readable'
      }));

      domConstruct.place(checkBox, form, 'first');
      domConstruct.place(
        '<h4 style="margin-bottom: 10px;">' +
          'Share with Everybody' +
        '</h4>',
        form, 'first'
      );

      domConstruct.place(
        '<p class="WarningAlert">' +
        '<b>Note:</b> Sharing your workspace does not provide access to your private genomes. ' +
        'If you would like to share your private genomes, please go to ' +
        '<a class="navigationLink" href="/view/GenomeList/?eq(public,false)">My Genomes</a>, ' +
        'select the genomes, and then click "Share" to edit permissions.</p><br>',
        form, 'first'
      );

      // user perms
      perms.forEach(function (p) {
        var user = p[0],
          perm = p[1];

        // server sometimes returns 'none' permissions, so ignore them.
        if (perm == 'n' || user == 'global_permission') return;

        self.addUser(user, perm);

        // adding rows of user, perm selector, and trash button
        var permSelector = self.permSelector(user, perm);
        var row = domConstruct.toDom('<tr><td data-user="' + user + '">' + Formatter.baseUsername(user) + '</td></tr>');

        var td = domConstruct.toDom('<td>');
        domConstruct.place(permSelector.domNode || permSelector, td);
        domConstruct.place(td, row);
        domConstruct.place(
          domConstruct.toDom('<td style="width: 1px"><i class="fa icon-trash-o fa-2x"></i></td>')
          , row
        );
        var fullRow = domConstruct.place(row, query('tbody', self.currentUsers)[0]);

        // add delete event for this row
        self.addDeleteEvent(fullRow);
      });


      self.progressEle.innerHTML = '';
    },

    addDeleteEvent: function (row) {
      var self = this;

      query('.icon-trash-o', row).on('click', function () {
        var userRow = query(this).parents('tr')[0],
          userId = dojo.attr(query('[data-user]', userRow)[0], 'data-user');

        domConstruct.destroy(userRow);
        self.rmUser(userId);

        // allow save
        self.dialog.okButton.set('disabled', false);
      });
    }
  });
});
