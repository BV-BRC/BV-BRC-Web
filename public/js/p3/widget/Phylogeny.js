define([
	"dojo/_base/declare", "raphael/raphael", "jsphylosvg/jsphylosvg",
	"dijit/_WidgetBase", "dojo/request","dojo/dom-construct"
], function(declare, raphael, jsphylosvg, WidgetBase, request,domConstruct){
	console.log("Raphael: ", Raphael);
	console.log("jsphylosvg: ", Smits);

	return declare([WidgetBase],{
		newickURL: "/public/766.nwk",
		postCreate: function(){
			this.containerNode = this.canvasNode = domConstruct.create("div",{id: this.id +"_canvas"}, this.domNode);

		},
		startup: function(){
			var _self=this;
			request.get(this.newickURL).then(function(newick){
				Smits.PhyloCanvas.Render.Parameters.Rectangular.alignRight = true;
				Smits.PhyloCanvas.Render.Parameters.Rectangular.bufferX = 400;
				Smits.PhyloCanvas.Render.Parameters.Circular.bufferRadius = .75;
				Smits.PhyloCanvas.Render.Parameters.Circular.bufferAngle = 0;
				_self.canvas = new Smits.PhyloCanvas({newick:newick}, _self.canvasNode,1500,2500);
			})

		}

	});
});
