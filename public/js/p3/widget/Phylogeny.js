define([
	"dojo/_base/declare", "phyloview/PhyloTree", "phyloview/TreeNavSVG",
	"dijit/_WidgetBase", "dojo/request", "dojo/dom-construct", "dojo/_base/lang",
	"dojo/dom-geometry", "dojo/dom-style", "d3/d3", "../util/PathJoin",
	"dijit/form/DropDownButton", "dijit/DropDownMenu", "dijit/MenuItem"
], function(declare, PhyloTree, TreeNavSVG,
			WidgetBase, request, domConstruct,
			lang, domGeometry, domStyle, d3, PathJoin,
			DropDownButton, DropDownMenu, MenuItem){

	return declare([WidgetBase], {
		"baseClass": "Phylogeny",
		type: "rectangular",
		state: null,
		taxon_id: null,
		newick: null,
		jsonTree: null,
		tree: null,
		apiServer: window.App.dataAPI,
		phylogram: false,
		tooltip: 'The "Phylogeny" tab provides order or genus level phylogenetic tree, constructed using core protein families',
		postCreate: function(){
			this.containerNode = this.canvasNode = domConstruct.create("div", {id: this.id + "_canvas"}, this.domNode);
			var menuDiv = domConstruct.create("div", {}, this.containerNode);
			var typeMenuDom = domConstruct.create("div", {}, menuDiv);
			var typeMenu = new DropDownMenu({style: "display: none;"});
			typeMenu.addChild(new MenuItem({
				label: "phylogram", onClick: lang.hitch(this, function(){
					this.setTreeType("phylogram")
				})
			}));
			typeMenu.addChild(new MenuItem({
				label: "cladogram", onClick: lang.hitch(this, function(){
					this.setTreeType("cladogram")
				})
			}));
			typeMenu.startup();
			this.typeButton = new DropDownButton({
				name: "typeButton",
				label: this.phylogram ? "phylogram" : "cladogram",
				dropDown: typeMenu
			}, typeMenuDom);
			this.typeButton.startup();
			//this.typeButton = domConstruct.create("input",{type:"button",value:"phylogram"},menuDiv);
			//this.supportButton = domConstruct.create("input", {type: "button", value: "show support"}, menuDiv);
			//this.groupButton = domConstruct.create("input", {type: "button", value: "create genome group"}, menuDiv);
			//this.imageButton = domConstruct.create("input", {type: "button", value: "save image"}, menuDiv);
			this.treeDiv = domConstruct.create("div", {id: this.id + "tree-container"}, this.containerNode);
			this.watch("state", lang.hitch(this, "onSetState"));
			this.watch("taxon_id", lang.hitch(this, "onSetTaxonId"))
			this.watch("newick", lang.hitch(this, "processTree"))

		},

		onSetState: function(attr, oldVal, state){
			console.log("Phylogeny onSetState: ", state);
			if(!state){
				return;
			}

			if(state.taxon_id){
				this.set('taxon_id', state.taxon_id)
			}else if(state.genome){
				this.set("taxon_id", state.genome.taxon_id);
			}else if(state.taxonomy){
				this.set("taxon_id", state.taxonomy.taxon_id);
			}
		},

		onSetTaxonId: function(attr, oldVal, taxonId){
			request.get(PathJoin(this.apiServer, "taxonomy", taxonId), {
				headers: {accept: "application/newick"}
			}).then(lang.hitch(this, function(newick){
				console.log("Set Newick");
				if(!newick){
					console.log("No Newick in Request Response");
					return;
				}
				this.set('newick', newick);
			}), function(err){
				console.log("Error Retreiving newick for Taxon: ", err)
			});
		},

		processTree: function(){
			if(!this.newick){
				console.log("No Newick File To Render")
				return;
			}
			if(!this.tree){
				this.tree = new TreeNavSVG();
				this.tree.d3Tree("#" + this.id + "tree-container", {
					phylogram: this.phylogram,
					fontSize: 10,
					colorGenus: true
				});
			}

			this.tree.setTree(this.newick);
		},

		setTreeType: function(treeType){
			if(this.phylogram && treeType == "cladogram"){
				this.togglePhylo();
			}
			else if((!this.phylogram) && treeType == "phylogram"){
				this.togglePhylo();
			}
		},

		togglePhylo: function(){
			this.phylogram = !this.phylogram;
			this.tree.setPhylogram(this.phylogram);
			this.typeButton.set("label", this.phylogram ? "phylogram" : "cladogram");
		},

		updateTree: function(){
			if(!this.tree){
				console.log("No tree to update")
				return;
			}
			//this.tree.update();
		},

		renderTree: function(){
			if(!this.newick){
				console.log("No Newick File To Render")
				return;
			}
			console.log("D3: ", d3);
		},

		onFirstView: function(){
			this.updateTree();
		},
		resize: function(changeSize, resultSize){
			var node = this.domNode;

			// set margin box size, unless it wasn't specified, in which case use current size
			if(changeSize){

				domGeometry.setMarginBox(node, changeSize);
			}

			// If either height or width wasn't specified by the user, then query node for it.
			// But note that setting the margin box and then immediately querying dimensions may return
			// inaccurate results, so try not to depend on it.

			var mb = resultSize || {};
			lang.mixin(mb, changeSize || {});       // changeSize overrides resultSize
			if(!("h" in mb) || !("w" in mb)){

				mb = lang.mixin(domGeometry.getMarginBox(node), mb);    // just use domGeometry.marginBox() to fill in missing values
			}

			// Compute and save the size of my border box and content box
			// (w/out calling domGeometry.getContentBox() since that may fail if size was recently set)
			var cs = domStyle.getComputedStyle(node);
			var me = domGeometry.getMarginExtents(node, cs);
			var be = domGeometry.getBorderExtents(node, cs);
			var bb = (this._borderBox = {
				w: mb.w - (me.w + be.w),
				h: mb.h - (me.h + be.h)
			});
			var pe = domGeometry.getPadExtents(node, cs);
			this._contentBox = {
				l: domStyle.toPixelValue(node, cs.paddingLeft),
				t: domStyle.toPixelValue(node, cs.paddingTop),
				w: bb.w - pe.w,
				h: bb.h - pe.h
			};

			if(this.debounceTimer){
				clearTimeout(this.debounceTimer);
			}
			this.debounceTimer = setTimeout(lang.hitch(this, function(){
				this.updateTree();
			}), 250);

		}

	});
});
