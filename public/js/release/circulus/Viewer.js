define("circulus/Viewer", [
	"dojo/_base/declare", "dijit/_WidgetBase","dojox/gfx",
	"dojo/dom-construct","dojo/_base/lang", "dojo/dom-geometry","dojo/dom-style",
	"dojo/topic","dojox/gfx/utils","dojo/when"
],function(
	declare,WidgetBase,gfx,
	domConstruct,lang,domGeometry,domStyle,
	Topic,gfxUtils,when
){

	var idx=1;
	return declare([WidgetBase], {
		tracks: null,
		centerRadius: .1,
		trackMargin: 4,
		maxOuterRadius: 1000,
		constructor: function(){
			this._tracks=[];
		},
		exportSVG: function(){
			console.log("Export Surface to SVG", this.surface.rawNode);

			//var encoded = window.btoa(this.surface.rawNode.innerHTML);
			var data = this.surface.rawNode.outerHTML
			console.log("export length: ", data.length);
			return data;
		},
		postCreate: function(){
			this.inherited(arguments);
			this.surfaceNode = domConstruct.create("div", {style: {width: "100%",height:"100%"}}, this.domNode);
			this.surface = gfx.createSurface(this.surfaceNode,500,500);

            this.surface.rawNode.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", "http://www.w3.org/2000/svg");
            this.surface.rawNode.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
			this.group = this.surface.createGroup();
		},

		onUpdateReferenceTrackSections: function(attr,oldVal,sections){
			console.log("Update Reference Track Sections");
		},


		getTrackWidth: function(trackFrac){
			// console.log("Get Track Width: ", trackFrac, " Max Outer: ", this.maxOuterRadius);
			var out;
			if (typeof trackFrac == "string"){
				// console.log("TrackWidth is string")
				if(trackFrac.match("px")){
					// console.log("Has PX",trackFrac.replace(/px/gi,"") )
					out =  parseInt(trackFrac.replace(/px/gi,""));
				}
			}else{
				out = this.maxOuterRadius * trackFrac;
			}

			// console.log("Calculated TW: ", out);
			return out;
			return this.maxOuterRadius * trackFrac;
		},

		addTrack: function(track,position,isReferenceTrack){
			var opts = track.options || {};
			var pos = position;


			if (this.referenceTrack){
				opts.referenceTrack = this.referenceTrack;
			}

			var innerGroup = this.group.createGroup();
			innerGroup.groupIdx = idx++;
			opts.surface = innerGroup;

			console.log("Opts.surface.groupIdx: ", opts.surface.groupIdx);


			if (!opts.internalRadius){
				if (pos && pos=="perimeter"){
					opts.internalRadius = this.maxOuterRadius - this.getTrackWidth(opts.trackWidth||track.trackWidth) - this.trackMargin;
					opts.position = "perimeter";
					this._maxOuterRadius = opts.internalRadius;
					console.log("Internal Radius: ", opts.internalRadius, " max", this.maxOuterRadius, this.getTrackWidth(opts.trackWidth||track.trackWidth), this.trackMargin)
				}else if (pos=="inner"){
					opts.internalRadius = this.centerRadius;
					opts.position = "inner"
					this._tracks.forEach(function(t){
						if (t.position=="inner"){
							opts.internalRadius += this.getTrackWidth(t.trackWidth) + this.trackMargin;
						}
					},this);
				}else{
					opts.position = "outer";

					opts.internalRadius = (this._maxOuterRadius || this.maxOuterRadius) - this.getTrackWidth(opts.trackWidth||track.trackWidth) - this.trackMargin ;

					this._tracks.forEach(function(t){
						if (t.position=="outer"){
							opts.internalRadius -= this.getTrackWidth(t.trackWidth) + this.trackMargin;
						}
					},this);
				}
			}

			console.log("Create Track: ", opts, " SurfaceGroupIdx: ", opts.surface.groupIdx)
			var newTrack = new track.type(this, opts, track.data||[])

			if (isReferenceTrack){
				this.referenceTrack = newTrack;
			}

			this._tracks.push(newTrack);	

			// newTrack.render();

			Topic.publish("/addTrack", {track: newTrack, position: position, isReferenceTrack: isReferenceTrack});

			return newTrack;
		},

		startup: function(){
			if (this._started) { return; }
			this._started=true;	
			// this.surface.whenLoaded(lang.hitch(this,function(){
			// 	console.log("Tracks: ", this.tracks);	
			// 	if (this.tracks) {
			// 		console.log("Tracks: ", this.tracks);
			// 		this.tracks.forEach(function(track){
			// 			this.addTrack(track);	
			// 		},this);
			// 	}
			// }));
		},

		resize: function(changeSize, resultSize){
			//console.log("VIEWER RESIZE", changeSize)
			if (!this._started){ return }
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

            var curSurface = this._contentBox;

            this._contentBox = {
                    l: domStyle.toPixelValue(node, cs.paddingLeft),
                    t: domStyle.toPixelValue(node, cs.paddingTop),
                    w: bb.w - pe.w,
                    h: bb.h - pe.h
            };
            this.maxOuterRadius = Math.min(this._contentBox.w-15,this._contentBox.h-15)/2;
            this.set('centerPoint', {x: this._contentBox.w/2, y: this._contentBox.h/2})

            if (this.group && curSurface && curSurface.h){
            	var ns,cs;


            	// if (this._contentBox.h<this._contentBox.w){
            		ns = this._contentBox.h;
            		cs = curSurface.h
            	// }else{
            	// 	ns = this._contentBox.w;
            	// 	cs = curSurface.w;
            	// }

	   			var scale = ns/cs;
	   			if (scale != 1){
		   			this.group.applyTransform(gfx.matrix.scale({ x: scale, y: scale }));
		   		}
	   		}
	   		this.surface.setDimensions(this._contentBox.w,this._contentBox.h);
	        
        }	
	});

});
