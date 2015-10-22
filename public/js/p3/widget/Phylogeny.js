define([
	"dojo/_base/declare", "raphael/raphael", "jsphylosvg/jsphylosvg",
	"dijit/_WidgetBase", "dojo/request","dojo/dom-construct", "dojo/_base/lang",
	"dojo/dom-geometry", "dojo/dom-style"
], function(declare, raphael, jsphylosvg, WidgetBase, request,domConstruct,lang,domGeometry,domStyle){
	console.log("Raphael: ", Raphael);
	console.log("jsphylosvg: ", Smits);

	return declare([WidgetBase],{
		newickURL: "/public/766.nwk",
		type: "rectangular",
		postCreate: function(){
			this.containerNode = this.canvasNode = domConstruct.create("div",{id: this.id +"_canvas"}, this.domNode);

		},
		startup: function(){
			var _self=this;
			request.get(this.newickURL).then(lang.hitch(this,function(newick){
				this.newick=newick;
				this.resize();
			}));
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
            if( !("h" in mb) || !("w" in mb) ){

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
			Smits.PhyloCanvas.Render.Parameters.Rectangular.paddingX = 5;
			Smits.PhyloCanvas.Render.Parameters.Rectangular.alignRight = true;
			Smits.PhyloCanvas.Render.Parameters.Rectangular.minHeightBetweenLines = 5;
			// Smits.PhyloCanvas.Render.Parameters.Rectangular.
			Smits.PhyloCanvas.Render.Parameters.Rectangular.bufferX = 400;
			Smits.PhyloCanvas.Render.Parameters.Circular.bufferRadius = .75;
			Smits.PhyloCanvas.Render.Parameters.Circular.bufferAngle = 0;
			if (this.newick){
				if (this.debounceTimer){
					clearTimeout(this.debounceTimer);
				}
				this.debounceTimer = setTimeout(lang.hitch(this, function(){
					domConstruct.empty(this.canvasNode);
					this.canvas = new Smits.PhyloCanvas({newick:this.newick}, this.canvasNode,this._contentBox.w,(this._contentBox.h*5), this.type);
					delete this.debounceTimer;
				}),250);
			}
          
		}

	});
});
