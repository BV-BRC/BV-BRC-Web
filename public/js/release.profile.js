var profile = {
	basePath: "./",
	layerOptimize: "closure",
	cssOptimize: false, //"comments.keepLines",
	releaseDir: "./release",
	stripConsole: "all",
	mini: true,
	hasReport: true,
	selectorEngine: "lite",
	staticHasFeatures: {
		"dojo-firebug": false,
		"dojo-debug-messages": true,
		'dojo-trace-api': false,
		'dojo-log-api': true,
		"async": true
	},
	plugins: {
		"xstyle/css": "xstyle/build/amd-css"
	},

	packages: [
		{
			name: "dojo",
			location: "./dojo"
		},
		{
			name: "dijit",
			location: "./dijit"
		},
		{
			name: "dojox",
			location: "./dojox"
		},
		{
			name: "p3",
			location: "./p3"
		},
		{
			name: "dgrid",
			location: "./dgrid"
		},
		{
			name: "put-selector",
			location: "./put-selector"
		},
		{
			name: "xstyle",
			location: "./xstyle"
		},
		{
			name: "dbind",
			location: "./dbind"
		},
		{
			name: "rql",
			location: "./rql"
		},
		{
			name: "JBrowse",
			location: "./JBrowse"
		},
		{
			name: "jszlib",
			location: "./jszlib"
		},
		{
			name: "FileSaver",
			location: "./FileSaver"
		},
		{
			name: "circulus",
			location: "./circulus"
		},
		{
			name: "lazyload",
			location: "./lazyload/",
			main: "lazyload"
		},
		{name: 'jDataView', location: './jDataView/src', main: 'jdataview'},
		{
			name: "d3",
			location: "./d3"
		},
		{
			name: "swfobject",
			location: "./swfobject"
		},
		{
			name: "phyloview",
			location: "./phyloview"
		}

	],

	layers: {
		"p3/layer/core": {
			include: [
				"p3/app/p3app",
				"p3/panels",
				"dijit/layout/BorderContainer",
				"put-selector/put",
				"dijit/_base",
				"dijit/form/ComboButton",
				"dijit/form/RadioButton",
				"dijit/CheckedMenuItem",
				"dojo/dnd/AutoSource",
				"dijit/TooltipDialog",
				"dijit/PopupMenuItem",
				"dijit/MenuSeparator",
				"p3/widget/GlobalSearch",
				"p3/widget/WorkspaceManager",
				"p3/widget/viewer/GenomeList",
				"p3/widget/app/Annotation",
                "p3/widget/SelectionToGroup"
			]
		},
		"p3/layer/panels": {
			include: [
				"p3/widget/CreateFolder",
				"p3/widget/CreateWorkspace",
				"p3/widget/Uploader"
			],
			exclude: [
				"p3/layer/core"
			]
		},
		"p3/layer/p3user": {
			include: [
				"dojo/parser",
				"dijit/form/Form",
				"dijit/form/TextBox",
				"dijit/form/Button",
				"dojox/validate/web",
				"dijit/form/DropDownButton",
				"dijit/_base/manager",
				"dijit/_base",
				"dijit/WidgetSet",
				"dijit/selection",
				"dijit/form/ComboButton",
				"dijit/form/ToggleButton"
			]
		},
		"p3/layer/globalWSObject": {
			customBase: true,
			boot: true,
			include: [
				"p3/GlobalWorkspace"
			],
			deps: ["p3/GlobalWorkspace"]
		}
	}
};

