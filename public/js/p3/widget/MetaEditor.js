/**
 * MetaEditor
 * - Takes spec file, order of tables, and initial data to edit.
 * - Provides editing capabilities:
 *
 * Supports the following input types:
 * 		- text
 * 		- textarea
 * 		- multivalued
 * 		- date
 *
 * Inputs
 * 		 spec - Spec for form.  Should be a hash with table names as keys.
 * 				Ex: {
 * 						table1: [{
 * 							name: 'human readable name',
 * 							text: 'some_key_to_data',
 * 							type: (text|textarea|multivalued|date)
 * 						}, ...]
 * 					...
 * 					}
 *
 *       tableNames - The order of the tables.
 * 				Ex: ['table1', 'table2', ...]\
 *
 *       data: {} - (Current) data representation for the form.
 *
 * API
 * 		.getValues - returns current values (state) of editor
 * 		.getSolrJSON - returns current values of editor, but in solr update form
 *
 * Author(s):
 *		nc
 *
 */

define([
    "dojo", "dojo/_base/declare", "dijit/_WidgetBase", "dojo/dom-construct",
    "dijit/form/Form", "dijit/form/TextBox", "./Confirmation",
     "dijit/form/SimpleTextarea", "dijit/form/DateTextBox", "./InputList"
],function(
    dojo, declare, WidgetBase, dom,
    Form, TextBox, Confirmation,
    TextArea, DateTextBox, InputList
){
	return declare([WidgetBase], {
        spec: {},		 // Spec for form.  Should be a hash with table names as keys.
        tableNames: [],	 // The data to be edited is organized into groups, ordered by these names.
        data: {},		 // (Current) data repreentation for the form.

		_inputs: [],	 // UI input objects
 		constructor: function(){

		},
		postCreate: function(){

		},
		startup: function(){
			if(this._started){
				return;
			}

			this._started = true;
		},

		/**
		 * Opens the editor (in dialog)
		 */
		show: function(){
            var self = this
            var tableNames = self.tableNames,
                spec = self.spec,
                data = self.data;

			/**
			 * Create form
			 */
			var content = dom.toDom('<div>');
			var form = new Form();

            // organize table specs according to tableNames list
			var tableSpecs = tableNames.map(function(name){ return spec[name] });

            // for each table spec, add appropriate inputs
			var inputs = [];
			tableSpecs.forEach(function(tableSpec, i) {
				var tableName = tableNames[i];

				dom.place(
					'<h5 class="DataItemSectionHead" style="margin: 10px 0 0 0;">'
						+ tableName +
					'</h5>'
				, form.domNode);

				var table = dom.toDom('<table>'),
					tbody = dom.place('<tbody>', table);
				tableSpec.forEach(function(item){

					var input;
					if(item.type == "date"){
						input = new DateTextBox({
							value: data[item.text],
							name: item.text,
							style: {width: '275px'}
						})
					}else if(item.multiValued){
						input = new InputList({
							type: item.type,
							name: item.text,
							values:  data[item.text] || [],
							placeHolder: item.editable ? "Enter " + item.name + "..." : '-'
						})
					}else if(item.type == 'textarea'){
						input = new TextArea({
							name: item.text,
							value: data[item.text] || '',
							style: {width: '275px'},
							placeHolder: item.editable ? "Enter " + item.name : '-',
							disabled: item.editable ? false : true
						});
					}else{
						input = new TextBox({
							name: item.text,
							value: data[item.text],
							style: {width: '275px'},
							placeHolder: item.editable ? "Enter " + item.name : '-',
							disabled: item.editable ? false : true
						});
					}
					self._inputs.push(input);

					var tr = dom.place('<tr>', tbody);
					dom.place('<td style="width: 50%; vertical-align: top;">'+item.name, tr);
					dom.place(input.domNode, tr);
				})

				dom.place(table, form.domNode);
			})

			dom.place('<br><br>', form.domNode);


			/**
			 * put form in dialog
			 */
			self.dialog = new Confirmation({
				title: "Edit Metadata",
				okLabel: "Save",
				style: {width: '800px', height: '80%', overflow: 'scroll'},
				content: form,
				onConfirm: function(){
					this.hideAndDestroy();
					self.onSave(inputs)
				},
				onCancel: function(){
					this.hideAndDestroy();
				}
			})

			self.dialog.startup();
			self.dialog.show();
		},

		hide: function(){
			self.dialog.hideAndDestroy();
		},

		/**
		 * handling for when "save" button is clicked
		 */
		onSave: function(inputs){
			var json = this.getSolrJSON()

			new Confirmation({
				title: "This is just a demo",
				content: 'This is just a demo.  The following would be sent to server:<br>' +
						'<pre>'+JSON.stringify(json, null, 4)+'</pre>'
			}).show()
		},

		/**
		 * returns key/value pair of form based on spec names
		 */
		getValues: function(){
			var state = {};
			this._inputs.forEach(function(input){
				var key = input.get('name'),
					value = input.get('value');

				state[key] = (value == '' ? null : value);
			})

			return state;
		},

		_getValue: function(){
			return this.getValues();
		},

		/**
		 * takes form data and puts into neccessary JSON format for Solr
		 */
		getSolrJSON: function(){
			var hash = this.getValues();

			var json = [];
			Object.keys(hash).forEach(function(key){
    			var value = hash[key]

				var obj = {};
				obj[key] = {set: value};
				json.push(obj);
			})

			return json;
		}

	});
});
