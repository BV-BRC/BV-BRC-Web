define("p3/widget/ActionBar", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "./Button", "dojo/dom-construct",
	"dijit/Tooltip", "dojo/dom", "dojo/_base/event", "dojo/mouse",
	"dojo/topic"
], function(declare, WidgetBase, on,
			domClass, Button, domConstruct,
			Tooltip, dom, Event, mouse, Topic){
	return declare([WidgetBase], {
		"baseClass": "ActionBar",
		constructor: function(){
			this._actions = {}
		},
		selection: null,
		currentContainerType: null,
		currentContainerWidget: null,
		tooltipPosition: ["before", "above"],
		_setCurrentContainerWidgetAttr: function(widget){
			//console.log("_set Current Container Widget: ", widget);
			// console.log("_set CurrentContainerWidget: ", widget.containerType, widget, " Current: ", this.currentContainerWidget);

			if(widget.currentContainer === this.currentContainerWidget){
				return;
			}
			this.currentContainerType = widget.containerType;
			this.currentContainerWidget = widget;
			// console.log("CurrentContainerType: ", this.currentContainerType)
			this.set("selection", []);
		},
		_setSelectionAttr: function(sel){
			//console.log("setSelection sel", sel[0], sel.length);
			this.selection = sel;

//			return;
			var valid;
			var selectionTypes = {};
			sel.filter(function(x){
				return !!x;
			}).forEach(function(s){
				var type = s.document_type || s.type;
				//console.log("Checking s: ", type, s);
				if(!type){
					// console.log("MISSING TYPE: ", s);
					return;
				}
				if(type == "job_result"){
					if(s.autoMeta && s.autoMeta.app){
						if(typeof s.autoMeta.app == "string"){
							type = s.autoMeta.app
						}else if(s.autoMeta.app.id){
							type = s.autoMeta.app.id;
						}
					}
				}
				//console.log("Type: ", type);
				selectionTypes[type] = true;
			});
			//console.log("selectionTypes: ", selectionTypes);
			//console.log("_actions: ", this._actions);
			if(sel.length > 1){
				var multiTypedSelection = (Object.keys(selectionTypes).length > 1);
//				//console.log("isMultiTyped: ", multiTypedSelection);	
				valid = Object.keys(this._actions).filter(function(an){
					//console.log("Check action: ", an, this._actions[an].options);
					return this._actions[an] && this._actions[an].options && (this._actions[an].options.multiple && ((this._actions[an].options.ignoreDataType || !multiTypedSelection || (multiTypedSelection && this._actions[an].options.allowMultiTypes)) ) || this._actions[an].options.persistent)
				}, this);

				//console.log("multiselect valid: ", valid)
			}else if(sel.length == 1){
				valid = Object.keys(this._actions)
			}else{
				valid = Object.keys(this._actions).filter(function(an){
					return this._actions[an] && this._actions[an].options && this._actions[an].options.persistent;
				}, this);
			}

			var types = Object.keys(selectionTypes);
			//console.log("Filtering for Types: ", types);
			valid = valid.filter(function(an){
				var act = this._actions[an];
				var validTypes = act.options.validTypes || [];
				//console.log("validTypes for action : ",an, " validTypes=", validTypes);
				//console.log("validTypes sel[0].source : ",sel[0].source);
				if(sel[0] && sel[0].source && sel[0].source !== "PATRIC_VF" && an === "ViewSpgeneEvidence"){
					return false;
				}

				if(act.options.min && (sel.length < act.options.min )){
					return false;
				}

				if(act.options.max && (sel.length > act.options.max )){
					return false;
				}

				var validContainerTypes = act.options.validContainerTypes || null;

				if(validContainerTypes){
					//console.log("checkValidContainerTypes", validContainerTypes);
					//console.log("Current ContainerType: ", this.currentContainerType);
					//console.log("Current Container Widget: ", this.currentContainerWidget);
					if(!validContainerTypes.some(function(t){
							return ((t == "*") || (t == this.currentContainerType))
						}, this)){
						return false;
					}
				}

				return validTypes.some(function(t){
					return ((t == "*") || (types.indexOf(t) >= 0));
				});
			}, this);

			//console.log("ValidTypes: ", valid);
			Object.keys(this._actions).forEach(function(an){
				var act = this._actions[an];
				if(valid.indexOf(an) >= 0){
					domClass.remove(act.button, "dijitHidden");
				}else{
					domClass.add(act.button, "dijitHidden");
				}
			}, this);

		},

		postCreate: function(){
			this.inherited(arguments);
			var _self = this;
			this.containerNode = this.domNode;
			dom.setSelectable(this.domNode, false);

			var tooltip = new Tooltip({
				connectId: this.domNode,
				selector: ".ActionButtonWrapper",
				getContent: function(matched){
					//console.log("Matched: ", matched);
					var rel = matched.attributes.rel.value;
					//console.log("REL: ", rel);
					if(_self._actions[rel] && _self._actions[rel].options && _self._actions[rel].options.tooltip){
						//console.log("_self._actions[rel]:", rel, _self._actions[rel]);
						return _self._actions[rel].options.tooltip
					}else if(matched.attributes.title && matched.attributes.title.value){
						return matched.attributes.title.value;
					}
					return false;
				},
				position: this.tooltipPosition
			});

			on(this.domNode, ".ActionButtonWrapper:click", function(evt){
				//console.log("evt.target: ", evt.target);
				tooltip.close();
				var target;
				if(evt && evt.target && evt.target.attributes && evt.target.attributes.rel){
					target = evt.target;
				}else{
					target = evt.target.parentNode;
				}
				if(target && target.attributes && target.attributes.rel){
					var rel = target.attributes.rel.value;
					if(_self._actions[rel]){
						// console.log("actionButton: ", _self._actions[rel]);
						if(_self._actions[rel].options && _self._actions[rel].options.requireAuth && (!window.App.user || !window.App.user.id)){
							Topic.publish("/login");
							return;
						}

						_self._actions[rel].action.apply(_self, [_self.selection, _self.currentContainerWidget, _self._actions[rel].button]);
					}
				}
				domClass.remove(target, "depressed");
			});

			on(this.domNode, ".ActionButtonWrapper:mousedown", function(evt){
				var t = evt.target;
				if(!domClass.contains(evt.target, "ActionButtonWrapper")){
					t = evt.target.parentNode;
				}
				domClass.add(t, "depressed");
			});

			on(this.domNode, ".ActionButtonWrapper:mouseout", function(evt){
				var t = evt.target;
				if(!domClass.contains(evt.target, "ActionButtonWrapper")){
					t = evt.target.parentNode;
				}
				domClass.remove(t, "depressed");
			});

//			on(this.domNode, ".ActionButton:mouseover", function(evt){
//				//console.log("mouseover evt: ", evt.target);
//			});	

		},

		addAction: function(name, classes, opts, fn, enabled, target){
			// console.log("Add Action: ", name, classes, opts,enabled);
			target = target || this.containerNode;
			var wrapper = domConstruct.create("div", {
				"class": (enabled ? "" : "dijitHidden ") + "ActionButtonWrapper",
				rel: name
			});
			var b = domConstruct.create("div", {'className': "ActionButton " + classes}, wrapper);

			if(opts && opts.label){
				var t = domConstruct.create("div", {innerHTML: opts.label, "class": "ActionButtonText"}, wrapper);
			}

			if(opts && opts.pressAndHold && typeof opts.pressAndHold == "function"){
				var _self = this;
				var timer;
				on(wrapper, "mousedown", function(evt){
					// console.log("Handle Press MouseDownAction");

					var cancelClick = false;

					timer = setTimeout(function(){
						cancelClick = true;
						// console.log("Selection in ActionBar: ", _self.selection, _self);
						opts.pressAndHold(_self.get("selection"), wrapper, opts, evt);
					}, 800)

					on.once(wrapper, "click", function(clickEvt){
						// console.log("Cancel Click: ", cancelClick)
						if(timer){
							clearTimeout(timer);
						}

						if(cancelClick){
							Event.stop(clickEvt)
						}
					});
				});
			}

			domConstruct.place(wrapper, target, "last");

			this._actions[name] = {
				options: opts,
				action: fn,
				button: wrapper
			};
		}
	});
});
