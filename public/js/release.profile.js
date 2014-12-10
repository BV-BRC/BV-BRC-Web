var profile = {      
	basePath: "./", 
	layerOptimize: "closure", 
	cssOptimize:"comments.keepLines",
	releaseDir: "./release",
	stripConsole: "all",
	mini: true,
	hasReport: true,
	selectorEngine: "lite",
	staticHasFeatures:{
		"dojo-firebug": false,
		"dojo-debug-messages":true,
		'dojo-trace-api':false,
		'dojo-log-api':true,
		"async": true
	},
	plugins: {
		"xstyle/css": "xstyle/build/amd-css"
	},

	packages:[ 
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
				"p3/widget/app/Annotation"
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
		}
	
	}
};

