require({cache:{
'url:p3/widget/app/templates/Sleep.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div style=\"width: 420px;margin:auto;margin-top: 10px;padding:10px;\">\n\t\t<h2>Sleep</h2>\n\t\t<p>Sleep Application For Testing Purposes</p>\n\t\t<div style=\"margin-top:10px;text-align:left\">\n\t\t\t<label>Sleep Time</label><br>\n\t\t\t<input data-dojo-type=\"dijit/form/NumberSpinner\" value=\"10\" name=\"sleep_time\" require=\"true\" data-dojo-props=\"constraints:{min:1,max:100}\" />\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tSubmitting Sleep Job\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tError Submitting Job\t\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tSleep Job has been queued.\n\t\t</div>\n\t\t<div style=\"margin-top: 10px; text-align:center;\">\n\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t<div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n\t\t\t<div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Run</div>\n\t\t</div>\t\n\t</div>\n</form>\n\n"}});
define("p3/widget/app/AppBase", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Sleep.html", "dijit/form/Form", "p3/widget/WorkspaceObjectSelector", "dojo/topic",
	"dijit/Dialog", "dojo/request", "dojo/dom-construct", "dojo/query", "dijit/TooltipDialog", "dijit/popup", "dijit/registry", "dojo/dom"
], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, FormMixin, WorkspaceObjectSelector, Topic,
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

			if (this.applicationHelp){
				var helprequest = xhr.get(window.App.docsServiceURL + this.applicationHelp, {
					handleAs: "text"
				});
				helprequest.then(function(data){
					data = data.replace('<img src="../../_static/patric_logo.png" class="logo" />','')
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
								"class": 'helpModal',
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
								"class": 'helpTooltip',
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
			}

			var tutorials = query(".tutorialButton");
			var tutorialLink = window.App.docsServiceURL + (this.tutorialLink || 'tutorial/');
			tutorials.forEach(function(item){
				if (dojo.hasClass(item, "tutorialInfo")){
					on(item, 'click', function() {
						// console.log(tutorialLink)
						window.open(tutorialLink, 'Tutorials')
					})
				}
			})

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

		onReset: function(evt){
			domClass.remove(this.domNode, "Working");
			domClass.remove(this.domNode, "Error");
			domClass.remove(this.domNode, "Submitted");
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
