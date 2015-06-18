define([
	"dijit/form/FilteringSelect","dojo/_base/declare",
	"dojo/store/JsonRest","dojo/_base/lang","dojo/when"
], function(
	FilteringSelect, declare, 
	Store,lang,when
){
	
	return declare([FilteringSelect], {
		apiServiceUrl: window.App.dataAPI,
		promptMessage:'Scientific name of the organism being annotated.',
		missingMessage:'Scientific Name must be provided.',
		placeHolder:'e.g. Bacillus Cereus',
		searchAttr: "taxon_name",
		//query: "?&select(taxon_name)",
		queryExpr: "*${0}*",
		pageSize: 25,
		highlightMatch: "all",
		autoComplete: false,
		store: null,
		constructor: function(){
			if (!this.store){
				this.store = new Store({target: this.apiServiceUrl + "/taxonomy/", idProperty: "taxon_id", headers: {accept: "application/json"}});
			}
		},
		isValid: function(){
			return (!this.required || this.get('displayedValue') != "");
		},

		_setDisplayedValueAttr: function(/*String*/ label, /*Boolean?*/ priorityChange){
			// summary:
			//		Hook so set('displayedValue', label) works.
			// description:
			//		Sets textbox to display label. Also performs reverse lookup
			//		to set the hidden value.  label should corresponding to item.searchAttr.

			if(label == null){ label = ''; }

			// This is called at initialization along with every custom setter.
			// Usually (or always?) the call can be ignored.   If it needs to be
			// processed then at least make sure that the XHR request doesn't trigger an onChange()
			// event, even if it returns after creation has finished
			if(!this._created){
				if(!("displayedValue" in this.params)){
					return;
				}
				priorityChange = false;
			}

			if (typeof text != 'undefined') {
				text = text.replace(/\ /g,"%20");
			}

			// Do a reverse lookup to map the specified displayedValue to the hidden value.
			// Note that if there's a custom labelFunc() this code
			if(this.store){
				this.closeDropDown();
				var query = lang.clone(this.query); // #6196: populate query with user-specifics

				// Generate query
				var qs = this._getDisplayQueryString(label), q;
				if(this.store._oldAPI){
					// remove this branch for 2.0
					q = qs;
				}else{
					// Query on searchAttr is a regex for benefit of dojo/store/Memory,
					// but with a toString() method to help dojo/store/JsonRest.
					// Search string like "Co*" converted to regex like /^Co.*$/i.
					q = this._patternToRegExp(qs);
					q.toString = function(){ return qs; };
				}
				this._lastQuery = query[this.searchAttr] = q;

				// If the label is not valid, the callback will never set it,
				// so the last valid value will get the warning textbox.   Set the
				// textbox value now so that the impending warning will make
				// sense to the user
				this.textbox.value = label;
				this._lastDisplayedValue = label;
				this._set("displayedValue", label);	// for watch("displayedValue") notification
				var _this = this;
				var options = {
					queryOptions: {
						ignoreCase: this.ignoreCase,
						deep: true
					}
				};
				lang.mixin(options, this.fetchProperties);
				this._fetchHandle = this.store.query(query, options);
				when(this._fetchHandle, function(result){
					_this._fetchHandle = null;
					_this._callbackSetLabel(result || [], query, options, priorityChange);
				}, function(err){
					_this._fetchHandle = null;
					if(!_this._cancelingQuery){	// don't treat canceled query as an error
						console.error('dijit.form.FilteringSelect: ' + err.toString());
					}
				});
			}
		}
	});
});
