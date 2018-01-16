/**
 * PermissionEditor
 * - Takes a single selection {path: 'path/to/some/object'}
 * 	and allows user to edit permissions on that object.
 *
 * - Note: this editor saves permissions on each add/remove,
 * 		using the appropriate API (as opposed to saving after
 * 		the dialog is closed).
 *
 * Example Usage:
 *
 *		var editor = PermissionEditor({path: 'my/object'})
 *		editor.onConfirm = function(){ //do something }
 *		editor.show()
 *
 * API
 * 		.selection - object to edit perms on
 * 		.show() - opens the eidtor
 * 		.onConfirm() - callback for when "ok" button is clicked
 * 		.onCancel() - callback for when dialog is canceled
 *
 * Author(s):
 *		nc
 *
 */

define([
	"dojo", "dojo/_base/declare", "dijit/_WidgetBase", "./Confirmation", // dojo/on
	"../widget/UserSelector", "./Formatter", "dojo/dom-construct",
	"dijit/form/Select", "dijit/form/Button", "../WorkspaceManager",
	"dojo/_base/Deferred", "dijit/form/CheckBox", "dojo/query", "dojo/topic"
],function(
	dojo, declare, WidgetBase, Confirmation,
	UserSelector, Formatter, domConstruct,
	Select, Button, WorkspaceManager,
	Deferred, CheckBox, query, Topic
){
	return declare([WidgetBase], {
		/* required widget input */
		selection: null,    // objects to be shared

 		constructor: function(o){
			this.selection = o.selection;
			this.onConfirm = o.onConfirm ? o.onConfirm : function(){};
			this.onCancel = o.onCancel ? o.onCancel : function(){};
		},
		postCreate: function(){},
		startup: function(){
			if(this._started){
				return;
			}

			this._started = true;
		},

		/**
		 * What to do after confirm
		 */
		onConfirm: function(){},

		/**
		 * What to do after cancel (x button)
		 */
		onCancel: function(){},

		/**
		 * Opens the editor (in dialog)
		 */
		show: function(){
			var self = this;

			var folderPath = this.selection.path;

			/**
			 * Data model and data model helpers
			 */
			var userPerms = [];

			function rmUser(userId){
				userPerms = userPerms.filter(function(perm){ return userId != perm.user });
			}

			function addUser(userId, perm){
				var alreadyExists = findUser(userId);
				if(alreadyExists) return false;

				userPerms.push({
					user: userId,
					permission: perm
				});

				return true;
			}

			function findUser(userId){
				return userPerms.find(function(perm){ return userId == perm.user });
			}


			/**
			 * Build the form and events
			 */
			var ownerId = Formatter.baseUsername(this.selection.owner_id);

			var form = domConstruct.toDom('<div class="userPermForm">')
			domConstruct.place(
				'<h4 style="margin-bottom: 5px;">'+
					'Share with Specific Users'+
				'</h4>'
			, form);
			var currentUsers = domConstruct.toDom(
				'<table class="currentUsers p3basic striped" style="margin-bottom: 10px;">'+
					'<thead>'+
						'<tr>'+
							'<th>User Name'+
							'<th>Permission'+
							'<th>&nbsp;'+
					'<tbody>'+
						'<tr>'+
							'<td><i>'+ this.selection.owner_id.split('@')[0] + ' ' + (ownerId == 'me' ? '(me)': '')+'</i>'+
							'<td>Owner'+
							'<td>&nbsp;'
			);

			// user search box
			var userSelector = new UserSelector({name: "user"});

			// user's permission
			var permSelect = new Select({
				name: "perm",
				style: { width: '100px', margin: '0 10px' },
				options: [
					{
						label: "Can view",
						value: "r",
						selected: true
					},{
						label: "Can edit",
						value: "w"
					}
				]
			})

			// add user's permission button
			// Note: on click, the user is added server side.
			var addUserBtn = new Button({
				label: '<i class="icon-plus"></i> Add User',
				//disabled: true,
				onClick: function(){
					var userId = userSelector.getSelected();
						perm = permSelect.attr('value')

					if (!userId) return;

					// don't add already existing users
					if(findUser(userId)) return;

					var prom = WorkspaceManager.setPermissions(folderPath, [[userId, perm]]);
					Deferred.when(prom, function(result) {
						//console.log('adding user to dom', userId, perm)
						dojo.place(
							'<tr>'+
								'<td data-user="'+userId+'">'+Formatter.baseUsername(userId)+
								'<td data-perm="'+perm+'">'+Formatter.permissionMap(perm)+
								'<td style="width: 1px;"><i class="fa icon-trash-o fa-2x">',
							query('tbody', currentUsers)[0]
						);

						reinitDeleteEvents();

						// reset filter select
						userSelector.reset();
					})
				}
			});

			domConstruct.place(currentUsers, form)
			domConstruct.place(userSelector.domNode, form)
			domConstruct.place(permSelect.domNode, form, "last")
			domConstruct.place(addUserBtn.domNode, form, "last")

			// open form in dialog
			var dlg = new Confirmation({
				title: "Edit Sharing",
				okLabel: "Done",
				cancelLabel: false,
				content: form,
				style: { width: '500px'},
				onConfirm: this.onConfirm,
				onCancel: this.onCancel
			})

			/*
		     * list current permissions
			 */
			var prom = WorkspaceManager.listPermissions(folderPath);
			Deferred.when(prom, function(perms){

				// add global permission toggle
				var globalPerm = perms.filter(function(perm){ return perm[0] == 'global_permission' })[0][1]
				var isPublic = globalPerm != 'n';

				var checkBox = domConstruct.toDom('<div class="publicCheckBox">');
				var cb = new CheckBox({
					id: "publicCB",
					name: "checkBox",
					value: "isPublic",
					checked: isPublic,
					onChange: function(e){
						var prom = WorkspaceManager.setPublicPermission(folderPath, isPublic ? 'n' : 'r');
						Deferred.when(prom, function(res){
						}, function(e){
							alert('oh no, something has went wrong!')
						})
					}
				})
				cb.placeAt(checkBox);
				checkBox.appendChild(domConstruct.create('label', {
					'for': 'publicCB',
					'innerHTML': " Publicly Readable"
				}))

				domConstruct.place(checkBox, form, 'first');
				domConstruct.place(
					'<h4 style="margin-bottom: 5px;">'+
						'Share with Everybody'+
					'</h4>',
				form, 'first');

				// user perms
				perms.forEach(function(perm){
					// server sometimes returns 'none' permissions, so ignore them.
					if(perm[0] == 'global_permission' || perm[1] == 'n') return;

					userPerms.push({
						user: perm[0],
						permission: perm[1]
					})

					dojo.place(
						'<tr>'+
							'<td data-user="'+perm[0]+'">'+Formatter.baseUsername(perm[0])+
							'<td data-perm="'+perm[1]+'">'+Formatter.permissionMap(perm[1])+
							'<td style="width: 1px;"><i class="fa icon-trash-o fa-2x">',
						query('tbody', currentUsers)[0]
					);
				})

				// event for deleting users
				reinitDeleteEvents();
			})


			function reinitDeleteEvents(){
				query('tbody .icon-trash-o', currentUsers).on('click', function(){
					var userRow = query(this).parents('tr')[0],
						userId = dojo.attr(query('[data-user]', userRow)[0], 'data-user');

					var prom = WorkspaceManager.setPermissions(folderPath, [[userId, 'n']]);
					Deferred.when(prom, function(result){
						domConstruct.destroy(userRow)

						rmUser(userId);
					}, function(err){
						var parts = err.split("_ERROR_");
						var d = new Dialog({
							content: parts[1] || parts[0],
							title: "Error deleting user: "+userId,
							style: "width: 250px !important;"
						}).show();
					})
				})
			}

			dlg.startup()
			dlg.show();
		},


	});
});
