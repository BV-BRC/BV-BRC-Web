define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Sleep.html", "dijit/form/Form", "p3/widget/WorkspaceObjectSelector",
	"dijit/Dialog", "dojo/request", "dojo/dom-construct", "dojo/query", "dijit/TooltipDialog", "dijit/popup", "dijit/registry", "dojo/dom"
], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, FormMixin, WorkspaceObjectSelector,
			Dialog, xhr, domConstruct, query, TooltipDialog, popup, registry, dom){
	return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
		"baseClass": "App Sleep",
		templateString: Template,
		path: "",
		applicationName: "Date",
		showCancel: false,
		activeWorkspace: "",
		activeWorkspacePath: "",
		help_doc: null,

		postMixInProperties: function(){
			this.activeWorkspace = this.activeWorkspace || window.App.activeWorkspace;
			this.activeWorkspacePath = this.activeWorkspacePath || window.App.activeWorkspacePath;
			this.inherited(arguments);
		},

		_setValueAttr: function(val){
			this.value = val || window.App.activeWorkspacePath;
		},

		gethelp: function(){

			var helprequest = xhr.get("/js/p3/widget/app/help/" + this.applicationName + "Help.html", {
				handleAs: "text"
			});
			helprequest.then(function(data){
				this.help_doc = domConstruct.toDom(data);
				var ibuttons = query(".infobutton");
				ibuttons.forEach(function(item){
					//var help_text= help_doc.getElementById(item.attributes.name.value) || "Help text missing";
					//basic flat child workaround for getting help in safari. will break if nested.
					var help_text = null;
					for(i = 0; i < this.help_doc.childNodes.length; i++){
						if(this.help_doc.childNodes[i].id == item.attributes.name.value){
							help_text = this.help_doc.childNodes[i];
						}
					}
					help_text = help_text || dom.byId(item.attributes.name.value, this.help_doc) || domConstruct.toDom("<div>Help text missing</div>");
					help_text.style.overflowY = 'auto';
					help_text.style.maxHeight = '400px';
					if(dojo.hasClass(item, "dialoginfo")){
						item.info_dialog = new Dialog({
							content: help_text,
							"class": 'nonModal',
							draggable: true,
							style: "max-width: 350px;"
						});
						item.open = false;
						on(item, 'click', function(){
							if(!item.open){
								item.open = true;
								item.info_dialog.show();
							}
							else{
								item.open = false;
								item.info_dialog.hide();
							}
						});
					}
					else if(dojo.hasClass(item, "tooltipinfo")){
						item.info_dialog = new TooltipDialog({
							content: help_text,
							style: "overflow-y: auto; max-width: 350px; max-height: 400px",
							onMouseLeave: function(){
								popup.close(item.info_dialog);
							}
						});
						on(item, 'mouseover', function(){
							popup.open({
								popup: item.info_dialog,
								around: item
							});
						});
						on(item, 'mouseout', function(){
							popup.close(item.info_dialog);
						});
					}
				});
			});
		},

		onOutputPathChange: function(val){
			registry.byClass("p3.widget.WorkspaceFilenameValidationTextBox").forEach(function(obj){
				obj.set("path", val);
			});
		},

		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
			var state = this.get("state");
			if((state == "Incomplete") || (state == "Error")){
				this.submitButton.set("disabled", true);
			}

			this.watch("state", function(prop, val, val2){
				if(val2 == "Incomplete" || val2 == "Error"){
					this.submitButton.set("disabled", true);
				}else{
					this.submitButton.set('disabled', false);
				}
			});

			if(!this.showCancel && this.cancelButton){
				domClass.add(this.cancelButton.domNode, "dijitHidden");
			}

			if(this.pageTitle){
				window.document.title = this.pageTitle;
			}

			this.gethelp();
			this._started = true;
		},

		onSubmit: function(evt){
			var _self = this;

			evt.preventDefault();
			evt.stopPropagation();
			if(this.validate()){
				var values = this.getValues();

				domClass.add(this.domNode, "Working");
				domClass.remove(this.domNode, "Error");
				domClass.remove(this.domNode, "Submitted");

				if(window.App.noJobSubmission){
					var dlg = new Dialog({
						title: "Job Submission Params: ",
						content: "<pre>" + JSON.stringify(values, null, 4) + "</pre>"
					});
					dlg.startup();
					dlg.show();
					return;
				}
				this.submitButton.set("disabled", true);
				window.App.api.service("AppService.start_app", [this.applicationName, values]).then(function(results){
					console.log("Job Submission Results: ", results);
					domClass.remove(_self.domNode, "Working")
					domClass.add(_self.domNode, "Submitted");
					_self.submitButton.set("disabled", false);
					registry.byClass("p3.widget.WorkspaceFilenameValidationTextBox").forEach(function(obj){
						obj.reset();
					});
				}, function(err){
					console.log("Error:", err)
					domClass.remove(_self.domNode, "Working");
					domClass.add(_self.domNode, "Error");
					_self.errorMessage.innerHTML = err;
				})
			}else{
				console.log("Form is incomplete");
			}

		},

		onCancel: function(evt){
			console.log("Cancel/Close Dialog", evt)
			on.emit(this.domNode, "dialogAction", {action: "close", bubbles: true});
		}
	});
});
