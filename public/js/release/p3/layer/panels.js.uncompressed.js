require({cache:{
'p3/widget/CreateFolder':function(){
define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/CreateFolder.html","dijit/form/Form"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,FormMixin
){
	return declare([WidgetBase,FormMixin,Templated,WidgetsInTemplate], {
		"baseClass": "CreateWorkspace",
		templateString: Template,
		path: "",
		validate: function(){
			console.log("this.validate()",this);
			var valid = this.inherited(arguments);
			if (valid){
				this.saveButton.set("disabled", false)
			}else{
				this.saveButton.set("disabled",true);
			}
			return valid;
		},

		onSubmit: function(evt){
			var _self = this;
			if (this.validate()){
				var values = this.getValues();
				console.log("Submission Values", values);
				domClass.add(this.domNode,"Working");
				window.App.api.workspace("Workspace.create_workspace_directory",[{directory:this.path + "/" + values.name}]).then(function(results){
					console.log("RESULTS", results)
					domClass.remove(_self.domNode, "Working");
					console.log("create_workspace_folder results", results)
					var path = "/" + ["workspace", results[0][5],results[0][8],results[0][1]].join("/")
					on.emit(_self.domNode, "dialogAction", {action: "close", navigate: path, bubbles:true});
				}, function(err){
					console.log("Error:", err)
					domClass.remove(_self.domNode,"Working");
					domClass.add(_self.domNode, "Error");
					_self.errorMessage.innerHTML = err;
				})
			}else{
				console.log("Form is incomplete");
			}

			evt.preventDefault();
			evt.stopPropagation();
		},

		onCancel: function(evt){
			console.log("Cancel/Close Dialog", evt)
			on.emit(this.domNode, "dialogAction", {action:"close",bubbles:true});
		}
	});
});

},
'p3/widget/CreateWorkspace':function(){
define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/CreateWorkspace.html","dijit/form/Form"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,FormMixin
){
	return declare([WidgetBase,FormMixin,Templated,WidgetsInTemplate], {
		"baseClass": "CreateWorkspace",
		templateString: Template,

		validate: function(){
			console.log("this.validate()",this);
			var valid = this.inherited(arguments);
			if (valid){
				this.saveButton.set("disabled", false)
			}else{
				this.saveButton.set("disabled",true);
			}
			return valid;
		},

		onSubmit: function(evt){
			var _self = this;
			if (this.validate()){
				var values = this.getValues();
				console.log("Submission Values", values);
				window.App.api.workspace("Workspace.create_workspace",[{workspace:values.name}]).then(function(results){
					console.log("create_workspace results", results)
					var workspace = results[0][1];
					var path = "/" + ["workspace", results[0][2],results[0][1]].join("/")
					on.emit(_self.domNode, "dialogAction", {action: "close", navigate: path, bubbles:true});
				})
			}else{
				console.log("Form is incomplete");
			}

			evt.preventDefault();
			evt.stopPropagation();
		},

		onCancel: function(evt){
			console.log("Cancel/Close Dialog", evt)
            this.emit("dialogAction", {action:"close",bubbles:true});
		}
	});
});

},
'p3/widget/Uploader':function(){
define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Uploader.html","dijit/form/Form","dojo/_base/Deferred",
	"dijit/ProgressBar","dojo/dom-construct"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,FormMixin,Deferred,
	ProgressBar,domConstruct
){
	return declare([WidgetBase,FormMixin,Templated,WidgetsInTemplate], {
		"baseClass": "CreateWorkspace",
		templateString: Template,
		path: "",
		validate: function(){
			console.log("this.validate()",this);
			var valid = this.inherited(arguments);
			if (valid){
				this.saveButton.set("disabled", false)
			}else{
				this.saveButton.set("disabled",true);
			}
			return valid;
		},

		uploadFile: function(file, uploadDirectory){
			if (!this._uploading){ this._uploading=[]}
			var xhr = new XMLHttpRequest();
			var reader = new FileReader();
			this._uploading.push(file)
			var _self=this;

			return Deferred.when(window.App.api.workspace("Workspace.create_upload_node",[{objects:[[uploadDirectory,file.name,"Unspecified"]]}]), function(getUrlRes){
				domClass.add(_self.domNode,"Working");

				console.log("getUrlRes",getUrlRes);
				var uploadUrl = getUrlRes[0][0];
				if (!_self.uploadTable){
					var table = domConstruct.create("table",{style: {width: "100%"}}, _self.workingMessage);
					_self.uploadTable = domConstruct.create('tbody',{}, table)
				}

				var row = domConstruct.create("tr",{},_self.uploadTable);
				var nameNode = domConstruct.create("td",{innerHTML: file.name},row);
				var pnode = domConstruct.create("td",{style: {width: "80%"}},row);

				var progressBar = new ProgressBar({style: "100%"});
				progressBar.placeAt(pnode);
				progressBar.startup();
				console.log("progressBar", progressBar, ProgressBar)

				xhr.upload.addEventListener("progress", function(e){
					if (e.lengthComputable) {
						var percentage = Math.round((e.loaded*100)/e.total);
						progressBar.set("value",percentage);
					}
				})

				xhr.upload.addEventListener("load", function(e){
					progressBar.set("value", 100);
					console.log("File Upload Complete");
				})

				xhr.open("POST",uploadUrl);
				xhr.setRequestHeader("Authorization", window.App.authorizationToken)
				reader.onload = function(evt){
					xhr.send(evt.target.result);
				}

				reader.readAsBinaryString(file);
			});

		},
		onFileSelectionChange: function(evt){
			console.log("onFileSelectionChange",evt, this.fileInput);
			Object.keys(this.fileInput.files).forEach(function(key){
				var f = this.fileInput.files[key];
				if (f.name){
					this.uploadFile(f,"/reviewer/test8/");
					console.log("File: ",f);
				}
			},this)
		},

		onSubmit: function(evt){
			var _self = this;
			if (this.validate()){
				var values = this.getValues();
				console.log("Submission Values", values);
				domClass.add(this.domNode,"Working");
			}else{
				console.log("Form is incomplete");
			}

			evt.preventDefault();
			evt.stopPropagation();
		},

		onCancel: function(evt){
			console.log("Cancel/Close Dialog", evt)
			on.emit(this.domNode, "dialogAction", {action:"close",bubbles:true});
		}
	});
});

},
'dijit/ProgressBar':function(){
define([
	"require", // require.toUrl
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.toggle
	"dojo/_base/lang", // lang.mixin
	"dojo/number", // number.format
	"./_Widget",
	"./_TemplatedMixin",
	"dojo/text!./templates/ProgressBar.html"
], function(require, declare, domClass, lang, number, _Widget, _TemplatedMixin, template){

	// module:
	//		dijit/ProgressBar

	return declare("dijit.ProgressBar", [_Widget, _TemplatedMixin], {
		// summary:
		//		A progress indication widget, showing the amount completed
		//		(often the percentage completed) of a task.

		// progress: [const] String (Percentage or Number)
		//		Number or percentage indicating amount of task completed.
		//		Deprecated.   Use "value" instead.
		progress: "0",

		// value: String (Percentage or Number)
		//		Number or percentage indicating amount of task completed.
		//		With "%": percentage value, 0% <= progress <= 100%, or
		//		without "%": absolute value, 0 <= progress <= maximum.
		//		Infinity means that the progress bar is indeterminate.
		value: "",

		// maximum: [const] Float
		//		Max sample number
		maximum: 100,

		// places: [const] Number
		//		Number of places to show in values; 0 by default
		places: 0,

		// indeterminate: [const] Boolean
		//		If false: show progress value (number or percentage).
		//		If true: show that a process is underway but that the amount completed is unknown.
		//		Deprecated.   Use "value" instead.
		indeterminate: false,

		// label: String?
		//		HTML label on progress bar.   Defaults to percentage for determinate progress bar and
		//		blank for indeterminate progress bar.
		label: "",

		// name: String
		//		this is the field name (for a form) if set. This needs to be set if you want to use
		//		this widget in a dijit/form/Form widget (such as dijit/Dialog)
		name: '',

		templateString: template,

		// _indeterminateHighContrastImagePath: [private] URL
		//		URL to image to use for indeterminate progress bar when display is in high contrast mode
		_indeterminateHighContrastImagePath: require.toUrl("./themes/a11y/indeterminate_progress.gif"),

		postMixInProperties: function(){
			this.inherited(arguments);

			// Back-compat for when constructor specifies indeterminate or progress, rather than value.   Remove for 2.0.
			if(!(this.params && "value" in this.params)){
				this.value = this.indeterminate ? Infinity : this.progress;
			}
		},

		buildRendering: function(){
			this.inherited(arguments);
			this.indeterminateHighContrastImage.setAttribute("src",
				this._indeterminateHighContrastImagePath.toString());
			this.update();
		},

		_setDirAttr: function(val){
			// Normally _CssStateMixin takes care of this, but we aren't extending it
			var rtl = val.toLowerCase() == "rtl";
			domClass.toggle(this.domNode, "dijitProgressBarRtl", rtl);
			domClass.toggle(this.domNode, "dijitProgressBarIndeterminateRtl", this.indeterminate && rtl);
			this.inherited(arguments);
		},

		update: function(/*Object?*/attributes){
			// summary:
			//		Internal method to change attributes of ProgressBar, similar to set(hash).  Users should call
			//		set("value", ...) rather than calling this method directly.
			// attributes:
			//		May provide progress and/or maximum properties on this parameter;
			//		see attribute specs for details.
			// example:
			//	|	myProgressBar.update({'indeterminate': true});
			//	|	myProgressBar.update({'progress': 80});
			//	|	myProgressBar.update({'indeterminate': true, label:"Loading ..." })
			// tags:
			//		private

			// TODO: deprecate this method and use set() instead

			lang.mixin(this, attributes || {});
			var tip = this.internalProgress, ap = this.domNode;
			var percent = 1;
			if(this.indeterminate){
				ap.removeAttribute("aria-valuenow");
			}else{
				if(String(this.progress).indexOf("%") != -1){
					percent = Math.min(parseFloat(this.progress) / 100, 1);
					this.progress = percent * this.maximum;
				}else{
					this.progress = Math.min(this.progress, this.maximum);
					percent = this.maximum ? this.progress / this.maximum : 0;
				}
				ap.setAttribute("aria-valuenow", this.progress);
			}

			// Even indeterminate ProgressBars should have these attributes
			ap.setAttribute("aria-labelledby", this.labelNode.id);
			ap.setAttribute("aria-valuemin", 0);
			ap.setAttribute("aria-valuemax", this.maximum);

			this.labelNode.innerHTML = this.report(percent);

			domClass.toggle(this.domNode, "dijitProgressBarIndeterminate", this.indeterminate);
			domClass.toggle(this.domNode, "dijitProgressBarIndeterminateRtl", this.indeterminate && !this.isLeftToRight());

			tip.style.width = (percent * 100) + "%";
			this.onChange();
		},

		_setValueAttr: function(v){
			this._set("value", v);
			if(v == Infinity){
				this.update({indeterminate: true});
			}else{
				this.update({indeterminate: false, progress: v});
			}
		},

		_setLabelAttr: function(label){
			this._set("label", label);
			this.update();
		},

		_setIndeterminateAttr: function(indeterminate){
			// Deprecated, use set("value", ...) instead
			this._set("indeterminate", indeterminate);
			this.update();
		},

		report: function(/*float*/percent){
			// summary:
			//		Generates HTML message to show inside progress bar (normally indicating amount of task completed).
			//		May be overridden.
			// tags:
			//		extension

			return this.label ? this.label :
				(this.indeterminate ? "&#160;" : number.format(percent, { type: "percent", places: this.places, locale: this.lang }));
		},

		onChange: function(){
			// summary:
			//		Callback fired when progress updates.
			// tags:
			//		extension
		}
	});
});

},
'dojo/number':function(){
define([/*===== "./_base/declare", =====*/ "./_base/lang", "./i18n", "./i18n!./cldr/nls/number", "./string", "./regexp"],
	function(/*===== declare, =====*/ lang, i18n, nlsNumber, dstring, dregexp){

// module:
//		dojo/number

var number = {
	// summary:
	//		localized formatting and parsing routines for Number
};
lang.setObject("dojo.number", number);

/*=====
number.__FormatOptions = declare(null, {
	// pattern: String?
	//		override [formatting pattern](http://www.unicode.org/reports/tr35/#Number_Format_Patterns)
	//		with this string.  Default value is based on locale.  Overriding this property will defeat
	//		localization.  Literal characters in patterns are not supported.
	// type: String?
	//		choose a format type based on the locale from the following:
	//		decimal, scientific (not yet supported), percent, currency. decimal by default.
	// places: Number?
	//		fixed number of decimal places to show.  This overrides any
	//		information in the provided pattern.
	// round: Number?
	//		5 rounds to nearest .5; 0 rounds to nearest whole (default). -1
	//		means do not round.
	// locale: String?
	//		override the locale used to determine formatting rules
	// fractional: Boolean?
	//		If false, show no decimal places, overriding places and pattern settings.
});
=====*/

number.format = function(/*Number*/ value, /*number.__FormatOptions?*/ options){
	// summary:
	//		Format a Number as a String, using locale-specific settings
	// description:
	//		Create a string from a Number using a known localized pattern.
	//		Formatting patterns appropriate to the locale are chosen from the
	//		[Common Locale Data Repository](http://unicode.org/cldr) as well as the appropriate symbols and
	//		delimiters.
	//		If value is Infinity, -Infinity, or is not a valid JavaScript number, return null.
	// value:
	//		the number to be formatted

	options = lang.mixin({}, options || {});
	var locale = i18n.normalizeLocale(options.locale),
		bundle = i18n.getLocalization("dojo.cldr", "number", locale);
	options.customs = bundle;
	var pattern = options.pattern || bundle[(options.type || "decimal") + "Format"];
	if(isNaN(value) || Math.abs(value) == Infinity){ return null; } // null
	return number._applyPattern(value, pattern, options); // String
};

//number._numberPatternRE = /(?:[#0]*,?)*[#0](?:\.0*#*)?/; // not precise, but good enough
number._numberPatternRE = /[#0,]*[#0](?:\.0*#*)?/; // not precise, but good enough

number._applyPattern = function(/*Number*/ value, /*String*/ pattern, /*number.__FormatOptions?*/ options){
	// summary:
	//		Apply pattern to format value as a string using options. Gives no
	//		consideration to local customs.
	// value:
	//		the number to be formatted.
	// pattern:
	//		a pattern string as described by
	//		[unicode.org TR35](http://www.unicode.org/reports/tr35/#Number_Format_Patterns)
	// options: number.__FormatOptions?
	//		_applyPattern is usually called via `dojo/number.format()` which
	//		populates an extra property in the options parameter, "customs".
	//		The customs object specifies group and decimal parameters if set.

	//TODO: support escapes
	options = options || {};
	var group = options.customs.group,
		decimal = options.customs.decimal,
		patternList = pattern.split(';'),
		positivePattern = patternList[0];
	pattern = patternList[(value < 0) ? 1 : 0] || ("-" + positivePattern);

	//TODO: only test against unescaped
	if(pattern.indexOf('%') != -1){
		value *= 100;
	}else if(pattern.indexOf('\u2030') != -1){
		value *= 1000; // per mille
	}else if(pattern.indexOf('\u00a4') != -1){
		group = options.customs.currencyGroup || group;//mixins instead?
		decimal = options.customs.currencyDecimal || decimal;// Should these be mixins instead?
		pattern = pattern.replace(/\u00a4{1,3}/, function(match){
			var prop = ["symbol", "currency", "displayName"][match.length-1];
			return options[prop] || options.currency || "";
		});
	}else if(pattern.indexOf('E') != -1){
		throw new Error("exponential notation not supported");
	}

	//TODO: support @ sig figs?
	var numberPatternRE = number._numberPatternRE;
	var numberPattern = positivePattern.match(numberPatternRE);
	if(!numberPattern){
		throw new Error("unable to find a number expression in pattern: "+pattern);
	}
	if(options.fractional === false){ options.places = 0; }
	return pattern.replace(numberPatternRE,
		number._formatAbsolute(value, numberPattern[0], {decimal: decimal, group: group, places: options.places, round: options.round}));
};

number.round = function(/*Number*/ value, /*Number?*/ places, /*Number?*/ increment){
	// summary:
	//		Rounds to the nearest value with the given number of decimal places, away from zero
	// description:
	//		Rounds to the nearest value with the given number of decimal places, away from zero if equal.
	//		Similar to Number.toFixed(), but compensates for browser quirks. Rounding can be done by
	//		fractional increments also, such as the nearest quarter.
	//		NOTE: Subject to floating point errors.  See dojox/math/round for experimental workaround.
	// value:
	//		The number to round
	// places:
	//		The number of decimal places where rounding takes place.  Defaults to 0 for whole rounding.
	//		Must be non-negative.
	// increment:
	//		Rounds next place to nearest value of increment/10.  10 by default.
	// example:
	// |	>>> number.round(-0.5)
	// |	-1
	// |	>>> number.round(162.295, 2)
	// |	162.29  // note floating point error.  Should be 162.3
	// |	>>> number.round(10.71, 0, 2.5)
	// |	10.75
	var factor = 10 / (increment || 10);
	return (factor * +value).toFixed(places) / factor; // Number
};

if((0.9).toFixed() == 0){
	// (isIE) toFixed() bug workaround: Rounding fails on IE when most significant digit
	// is just after the rounding place and is >=5
	var round = number.round;
	number.round = function(v, p, m){
		var d = Math.pow(10, -p || 0), a = Math.abs(v);
		if(!v || a >= d){
			d = 0;
		}else{
			a /= d;
			if(a < 0.5 || a >= 0.95){
				d = 0;
			}
		}
		return round(v, p, m) + (v > 0 ? d : -d);
	};

	// Use "doc hint" so the doc parser ignores this new definition of round(), and uses the one above.
	/*===== number.round = round; =====*/
}

/*=====
number.__FormatAbsoluteOptions = declare(null, {
	// decimal: String?
	//		the decimal separator
	// group: String?
	//		the group separator
	// places: Number|String?
	//		number of decimal places.  the range "n,m" will format to m places.
	// round: Number?
	//		5 rounds to nearest .5; 0 rounds to nearest whole (default). -1
	//		means don't round.
});
=====*/

number._formatAbsolute = function(/*Number*/ value, /*String*/ pattern, /*number.__FormatAbsoluteOptions?*/ options){
	// summary:
	//		Apply numeric pattern to absolute value using options. Gives no
	//		consideration to local customs.
	// value:
	//		the number to be formatted, ignores sign
	// pattern:
	//		the number portion of a pattern (e.g. `#,##0.00`)
	options = options || {};
	if(options.places === true){options.places=0;}
	if(options.places === Infinity){options.places=6;} // avoid a loop; pick a limit

	var patternParts = pattern.split("."),
		comma = typeof options.places == "string" && options.places.indexOf(","),
		maxPlaces = options.places;
	if(comma){
		maxPlaces = options.places.substring(comma + 1);
	}else if(!(maxPlaces >= 0)){
		maxPlaces = (patternParts[1] || []).length;
	}
	if(!(options.round < 0)){
		value = number.round(value, maxPlaces, options.round);
	}

	var valueParts = String(Math.abs(value)).split("."),
		fractional = valueParts[1] || "";
	if(patternParts[1] || options.places){
		if(comma){
			options.places = options.places.substring(0, comma);
		}
		// Pad fractional with trailing zeros
		var pad = options.places !== undefined ? options.places : (patternParts[1] && patternParts[1].lastIndexOf("0") + 1);
		if(pad > fractional.length){
			valueParts[1] = dstring.pad(fractional, pad, '0', true);
		}

		// Truncate fractional
		if(maxPlaces < fractional.length){
			valueParts[1] = fractional.substr(0, maxPlaces);
		}
	}else{
		if(valueParts[1]){ valueParts.pop(); }
	}

	// Pad whole with leading zeros
	var patternDigits = patternParts[0].replace(',', '');
	pad = patternDigits.indexOf("0");
	if(pad != -1){
		pad = patternDigits.length - pad;
		if(pad > valueParts[0].length){
			valueParts[0] = dstring.pad(valueParts[0], pad);
		}

		// Truncate whole
		if(patternDigits.indexOf("#") == -1){
			valueParts[0] = valueParts[0].substr(valueParts[0].length - pad);
		}
	}

	// Add group separators
	var index = patternParts[0].lastIndexOf(','),
		groupSize, groupSize2;
	if(index != -1){
		groupSize = patternParts[0].length - index - 1;
		var remainder = patternParts[0].substr(0, index);
		index = remainder.lastIndexOf(',');
		if(index != -1){
			groupSize2 = remainder.length - index - 1;
		}
	}
	var pieces = [];
	for(var whole = valueParts[0]; whole;){
		var off = whole.length - groupSize;
		pieces.push((off > 0) ? whole.substr(off) : whole);
		whole = (off > 0) ? whole.slice(0, off) : "";
		if(groupSize2){
			groupSize = groupSize2;
			delete groupSize2;
		}
	}
	valueParts[0] = pieces.reverse().join(options.group || ",");

	return valueParts.join(options.decimal || ".");
};

/*=====
number.__RegexpOptions = declare(null, {
	// pattern: String?
	//		override [formatting pattern](http://www.unicode.org/reports/tr35/#Number_Format_Patterns)
	//		with this string.  Default value is based on locale.  Overriding this property will defeat
	//		localization.
	// type: String?
	//		choose a format type based on the locale from the following:
	//		decimal, scientific (not yet supported), percent, currency. decimal by default.
	// locale: String?
	//		override the locale used to determine formatting rules
	// strict: Boolean?
	//		strict parsing, false by default.  Strict parsing requires input as produced by the format() method.
	//		Non-strict is more permissive, e.g. flexible on white space, omitting thousands separators
	// places: Number|String?
	//		number of decimal places to accept: Infinity, a positive number, or
	//		a range "n,m".  Defined by pattern or Infinity if pattern not provided.
});
=====*/
number.regexp = function(/*number.__RegexpOptions?*/ options){
	// summary:
	//		Builds the regular needed to parse a number
	// description:
	//		Returns regular expression with positive and negative match, group
	//		and decimal separators
	return number._parseInfo(options).regexp; // String
};

number._parseInfo = function(/*Object?*/ options){
	options = options || {};
	var locale = i18n.normalizeLocale(options.locale),
		bundle = i18n.getLocalization("dojo.cldr", "number", locale),
		pattern = options.pattern || bundle[(options.type || "decimal") + "Format"],
//TODO: memoize?
		group = bundle.group,
		decimal = bundle.decimal,
		factor = 1;

	if(pattern.indexOf('%') != -1){
		factor /= 100;
	}else if(pattern.indexOf('\u2030') != -1){
		factor /= 1000; // per mille
	}else{
		var isCurrency = pattern.indexOf('\u00a4') != -1;
		if(isCurrency){
			group = bundle.currencyGroup || group;
			decimal = bundle.currencyDecimal || decimal;
		}
	}

	//TODO: handle quoted escapes
	var patternList = pattern.split(';');
	if(patternList.length == 1){
		patternList.push("-" + patternList[0]);
	}

	var re = dregexp.buildGroupRE(patternList, function(pattern){
		pattern = "(?:"+dregexp.escapeString(pattern, '.')+")";
		return pattern.replace(number._numberPatternRE, function(format){
			var flags = {
				signed: false,
				separator: options.strict ? group : [group,""],
				fractional: options.fractional,
				decimal: decimal,
				exponent: false
				},

				parts = format.split('.'),
				places = options.places;

			// special condition for percent (factor != 1)
			// allow decimal places even if not specified in pattern
			if(parts.length == 1 && factor != 1){
			    parts[1] = "###";
			}
			if(parts.length == 1 || places === 0){
				flags.fractional = false;
			}else{
				if(places === undefined){ places = options.pattern ? parts[1].lastIndexOf('0') + 1 : Infinity; }
				if(places && options.fractional == undefined){flags.fractional = true;} // required fractional, unless otherwise specified
				if(!options.places && (places < parts[1].length)){ places += "," + parts[1].length; }
				flags.places = places;
			}
			var groups = parts[0].split(',');
			if(groups.length > 1){
				flags.groupSize = groups.pop().length;
				if(groups.length > 1){
					flags.groupSize2 = groups.pop().length;
				}
			}
			return "("+number._realNumberRegexp(flags)+")";
		});
	}, true);

	if(isCurrency){
		// substitute the currency symbol for the placeholder in the pattern
		re = re.replace(/([\s\xa0]*)(\u00a4{1,3})([\s\xa0]*)/g, function(match, before, target, after){
			var prop = ["symbol", "currency", "displayName"][target.length-1],
				symbol = dregexp.escapeString(options[prop] || options.currency || "");
			before = before ? "[\\s\\xa0]" : "";
			after = after ? "[\\s\\xa0]" : "";
			if(!options.strict){
				if(before){before += "*";}
				if(after){after += "*";}
				return "(?:"+before+symbol+after+")?";
			}
			return before+symbol+after;
		});
	}

//TODO: substitute localized sign/percent/permille/etc.?

	// normalize whitespace and return
	return {regexp: re.replace(/[\xa0 ]/g, "[\\s\\xa0]"), group: group, decimal: decimal, factor: factor}; // Object
};

/*=====
number.__ParseOptions = declare(null, {
	// pattern: String?
	//		override [formatting pattern](http://www.unicode.org/reports/tr35/#Number_Format_Patterns)
	//		with this string.  Default value is based on locale.  Overriding this property will defeat
	//		localization.  Literal characters in patterns are not supported.
	// type: String?
	//		choose a format type based on the locale from the following:
	//		decimal, scientific (not yet supported), percent, currency. decimal by default.
	// locale: String?
	//		override the locale used to determine formatting rules
	// strict: Boolean?
	//		strict parsing, false by default.  Strict parsing requires input as produced by the format() method.
	//		Non-strict is more permissive, e.g. flexible on white space, omitting thousands separators
	// fractional: Boolean|Array?
	//		Whether to include the fractional portion, where the number of decimal places are implied by pattern
	//		or explicit 'places' parameter.  The value [true,false] makes the fractional portion optional.
});
=====*/
number.parse = function(/*String*/ expression, /*number.__ParseOptions?*/ options){
	// summary:
	//		Convert a properly formatted string to a primitive Number, using
	//		locale-specific settings.
	// description:
	//		Create a Number from a string using a known localized pattern.
	//		Formatting patterns are chosen appropriate to the locale
	//		and follow the syntax described by
	//		[unicode.org TR35](http://www.unicode.org/reports/tr35/#Number_Format_Patterns)
    	//		Note that literal characters in patterns are not supported.
	// expression:
	//		A string representation of a Number
	var info = number._parseInfo(options),
		results = (new RegExp("^"+info.regexp+"$")).exec(expression);
	if(!results){
		return NaN; //NaN
	}
	var absoluteMatch = results[1]; // match for the positive expression
	if(!results[1]){
		if(!results[2]){
			return NaN; //NaN
		}
		// matched the negative pattern
		absoluteMatch =results[2];
		info.factor *= -1;
	}

	// Transform it to something Javascript can parse as a number.  Normalize
	// decimal point and strip out group separators or alternate forms of whitespace
	absoluteMatch = absoluteMatch.
		replace(new RegExp("["+info.group + "\\s\\xa0"+"]", "g"), "").
		replace(info.decimal, ".");
	// Adjust for negative sign, percent, etc. as necessary
	return absoluteMatch * info.factor; //Number
};

/*=====
number.__RealNumberRegexpFlags = declare(null, {
	// places: Number?
	//		The integer number of decimal places or a range given as "n,m".  If
	//		not given, the decimal part is optional and the number of places is
	//		unlimited.
	// decimal: String?
	//		A string for the character used as the decimal point.  Default
	//		is ".".
	// fractional: Boolean|Array?
	//		Whether decimal places are used.  Can be true, false, or [true,
	//		false].  Default is [true, false] which means optional.
	// exponent: Boolean|Array?
	//		Express in exponential notation.  Can be true, false, or [true,
	//		false]. Default is [true, false], (i.e. will match if the
	//		exponential part is present are not).
	// eSigned: Boolean|Array?
	//		The leading plus-or-minus sign on the exponent.  Can be true,
	//		false, or [true, false].  Default is [true, false], (i.e. will
	//		match if it is signed or unsigned).  flags in regexp.integer can be
	//		applied.
});
=====*/

number._realNumberRegexp = function(/*__RealNumberRegexpFlags?*/ flags){
	// summary:
	//		Builds a regular expression to match a real number in exponential
	//		notation

	// assign default values to missing parameters
	flags = flags || {};
	//TODO: use mixin instead?
	if(!("places" in flags)){ flags.places = Infinity; }
	if(typeof flags.decimal != "string"){ flags.decimal = "."; }
	if(!("fractional" in flags) || /^0/.test(flags.places)){ flags.fractional = [true, false]; }
	if(!("exponent" in flags)){ flags.exponent = [true, false]; }
	if(!("eSigned" in flags)){ flags.eSigned = [true, false]; }

	var integerRE = number._integerRegexp(flags),
		decimalRE = dregexp.buildGroupRE(flags.fractional,
		function(q){
			var re = "";
			if(q && (flags.places!==0)){
				re = "\\" + flags.decimal;
				if(flags.places == Infinity){
					re = "(?:" + re + "\\d+)?";
				}else{
					re += "\\d{" + flags.places + "}";
				}
			}
			return re;
		},
		true
	);

	var exponentRE = dregexp.buildGroupRE(flags.exponent,
		function(q){
			if(q){ return "([eE]" + number._integerRegexp({ signed: flags.eSigned}) + ")"; }
			return "";
		}
	);

	var realRE = integerRE + decimalRE;
	// allow for decimals without integers, e.g. .25
	if(decimalRE){realRE = "(?:(?:"+ realRE + ")|(?:" + decimalRE + "))";}
	return realRE + exponentRE; // String
};

/*=====
number.__IntegerRegexpFlags = declare(null, {
	// signed: Boolean?
	//		The leading plus-or-minus sign. Can be true, false, or `[true,false]`.
	//		Default is `[true, false]`, (i.e. will match if it is signed
	//		or unsigned).
	// separator: String?
	//		The character used as the thousands separator. Default is no
	//		separator. For more than one symbol use an array, e.g. `[",", ""]`,
	//		makes ',' optional.
	// groupSize: Number?
	//		group size between separators
	// groupSize2: Number?
	//		second grouping, where separators 2..n have a different interval than the first separator (for India)
});
=====*/

number._integerRegexp = function(/*number.__IntegerRegexpFlags?*/ flags){
	// summary:
	//		Builds a regular expression that matches an integer

	// assign default values to missing parameters
	flags = flags || {};
	if(!("signed" in flags)){ flags.signed = [true, false]; }
	if(!("separator" in flags)){
		flags.separator = "";
	}else if(!("groupSize" in flags)){
		flags.groupSize = 3;
	}

	var signRE = dregexp.buildGroupRE(flags.signed,
		function(q){ return q ? "[-+]" : ""; },
		true
	);

	var numberRE = dregexp.buildGroupRE(flags.separator,
		function(sep){
			if(!sep){
				return "(?:\\d+)";
			}

			sep = dregexp.escapeString(sep);
			if(sep == " "){ sep = "\\s"; }
			else if(sep == "\xa0"){ sep = "\\s\\xa0"; }

			var grp = flags.groupSize, grp2 = flags.groupSize2;
			//TODO: should we continue to enforce that numbers with separators begin with 1-9?  See #6933
			if(grp2){
				var grp2RE = "(?:0|[1-9]\\d{0," + (grp2-1) + "}(?:[" + sep + "]\\d{" + grp2 + "})*[" + sep + "]\\d{" + grp + "})";
				return ((grp-grp2) > 0) ? "(?:" + grp2RE + "|(?:0|[1-9]\\d{0," + (grp-1) + "}))" : grp2RE;
			}
			return "(?:0|[1-9]\\d{0," + (grp-1) + "}(?:[" + sep + "]\\d{" + grp + "})*)";
		},
		true
	);

	return signRE + numberRE; // String
};

return number;
});

},
'url:p3/widget/templates/CreateFolder.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\t<div >\n\t\t<div data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"name\" data-dojo-attach-point=\"workspaceName\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\"></div>\n\t</div>\n\t\t<div class=\"workingMessage\">\n\t\t\tCreating new workspace ...\n\t\t</div>\n\n\t\t<div class=\"errorMessage\">\n\t\t\t<div style=\"font-weight:900;font-size:1.1em;\">Error Creating Folder:</div>\n\t\t\t<p data-dojo-attach-point=\"errorMessage\">Error</p>\n\t\t</div>\n\t\t\n\t\t<div style=\"margin:4px;margin-top:8px;text-align:right;\">\n\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t<div data-dojo-attach-point=\"saveButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Create Folder</div>\n\t\t</div>\t\n</form>\n\n",
'url:p3/widget/templates/CreateWorkspace.html':"<form dojoAttachPoint=\"containerNode\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\t<div class=\"PanelForm\" style=\"\">\n\t\t<input data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"name\" data-dojo-attach-point=\"workspaceName\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for new Workspace',trim:true,placeHolder:'MyWorkspace'\" />\n\t\t<div style=\"margin:4px;margin-top:8px;text-align:right;\">\n\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t<div data-dojo-attach-point=\"saveButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Create Workspace</div>\n\t\t</div>\t\n\t</div>\n</form>\n\n",
'url:p3/widget/templates/Uploader.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\t<div style='width:400px'>\n\t\t<select data-dojo-type=\"dijit/form/Select\" name=\"type\" data-dojo-attach-point=\"uploadType\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t<option value=\"auto\">Auto Detect</option>\n\t\t\t<option value=\"fasta\">FASTA</option>\t\t\t\n\t\t</select>\n\t\t<input type=\"file\" data-dojo-attach-point=\"fileInput\" multiple=\"true\" data-dojo-attach-event=\"onchange:onFileSelectionChange\" />\t\n\t</div>\n\t\t<div class=\"workingMessage\" style=\"width:400px;\" data-dojo-attach-point=\"workingMessage\">\n\t\t</div>\n\n\t\t<div class=\"errorMessage\">\n\t\t\t<div style=\"font-weight:900;font-size:1.1em;\">Error Creating Folder:</div>\n\t\t\t<p data-dojo-attach-point=\"errorMessage\">Error</p>\n\t\t</div>\n\t\t\n\t\t<div style=\"margin:4px;margin-top:8px;text-align:right;\">\n\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t<div data-dojo-attach-point=\"saveButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Create Folder</div>\n\t\t</div>\t\n</form>\n\n",
'url:dijit/templates/ProgressBar.html':"<div class=\"dijitProgressBar dijitProgressBarEmpty\" role=\"progressbar\"\n\t><div  data-dojo-attach-point=\"internalProgress\" class=\"dijitProgressBarFull\"\n\t\t><div class=\"dijitProgressBarTile\" role=\"presentation\"></div\n\t\t><span style=\"visibility:hidden\">&#160;</span\n\t></div\n\t><div data-dojo-attach-point=\"labelNode\" class=\"dijitProgressBarLabel\" id=\"${id}_label\"></div\n\t><span data-dojo-attach-point=\"indeterminateHighContrastImage\"\n\t\t   class=\"dijitInline dijitProgressBarIndeterminateHighContrastImage\"></span\n></div>\n",
'*now':function(r){r(['dojo/i18n!*preload*p3/layer/nls/panels*["ar","ca","cs","da","de","el","en-gb","en-us","es-es","fi-fi","fr-fr","he-il","hu","it-it","ja-jp","ko-kr","nl-nl","nb","pl","pt-br","pt-pt","ru","sk","sl","sv","th","tr","zh-tw","zh-cn","ROOT"]']);}
}});
define("p3/layer/panels", [], 1);
