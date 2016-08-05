define("circulus/SectionTrack", [
        "dojo/_base/declare","dojox/gfx","dojox/gfx/matrix",
        "dojo/_base/lang","./Track","dojo/on","dijit/Dialog",
        "dijit/TooltipDialog","dijit/popup"
],function(
        declare,gfx,matrix,
        lang,Track,on,Dialog,
        TooltipDialog,Popup
){

	var TTDialog = new TooltipDialog({
		onMouseLeave: function(){
		    Popup.close(TTDialog);
		}
	})
	Popup.moveOffScreen(TTDialog);

	return declare([Track], {
		max:100,
		min: 0,
		stroke: null,
		//stroke:"",//{color: "black", width:.25},
		fill: "orange",
		sectionIdProperty: "accession",
		sections: null,
		referenceTrack: null,

		constructor: function(){
			this.surface.connect("onclick", lang.hitch(this,function(evt){
				console.log("ON CLICK: ", evt)
				if (evt.gfxTarget.data){
					if (!this.dialog){
						this.dialog = new Dialog({});
					}

					this.dialog.set('content',this.formatDialogContent(evt.gfxTarget.data));
					this.dialog.show();
				}
			}));
			var inside=false;
			var timer;
			// on(this.surface.getEventSource(),"mouseover", function(evt){
			this.surface.connect("onmouseover", lang.hitch(this,function(evt){
				inside=true;
				console.log("Mouse Over EVT: ", evt)
				if (!evt.gfxTarget.data){
					return;
				}
				var cur = evt.gfxTarget.getFill();
				// console.log("Current: ", cur)
				evt.gfxTarget.currentFill = cur;
				evt.gfxTarget.setFill('#ff0000');

				TTDialog.set('content', this.formatPopupContent(evt.gfxTarget.data))

				Popup.open({
					// parent: this,
					x: evt.x-10,
					y: evt.y+15,
					popup: TTDialog
					//around: evt.gfxTarget.rawNode
				})
			}))

			// on(this.surface.getEventSource(),"mouseout", function(evt){
			this.surface.connect("onmouseout", function(evt){
				inside=false;
				// console.log("Mouse Out EVT: ", evt, evt.gfxTarget.currentFill);
				if (evt.gfxTarget.currentFill){
					evt.gfxTarget.setFill(evt.gfxTarget.currentFill)
				}
				if (timer){
					clearTimeout(timer);
				}
				timer = setTimeout(function(){
					if (!inside){
						Popup.close(TTDialog);
					}
				},1500)
				
			})
		},

		render: function(){
			if (this.visible){
				// console.log("render() this.surface.groupIdx: ", this.surface.groupIdx)
				this.renderBackground();

				if (this.data && this.data.length>0){
					// console.log("RENDER DATA: ", this.data)
					this.set("loading", false)
					this.renderData(this.data);		
				}else{
					this.set("loading", true);
				}
			}
		},
		gap: .25,

		renderAlignedData: function(data){
			// console.log("Render Aligned to Reference Track", data);
			var dataSections = {}

			data.forEach(function(d){
				if (d[this.sectionIdProperty]){
					if (!dataSections[d[this.sectionIdProperty]]){
						dataSections[d[this.sectionIdProperty]]=[d]
					}else{
						dataSections[d[this.sectionIdProperty]].push(d);
					}
				}
			},this)

			var refSections = this.referenceTrack.get('sections');

			Object.keys(dataSections).forEach(function(secName){
					var ds = dataSections[secName];
					// if (ds.length>20){ return; };
					// console.log("Adding ",ds.length, " Data Items to Section", secName);
					// console.log("   Starting Angle: ", refSections[secName].startAngle, refSections[secName].endAngle);
					this.renderAlignedSection(ds,refSections[secName].startAngle, refSections[secName].endAngle, refSections[secName].length);
			},this)
		},

		renderAlignedSection: function(data,startAngle,endAngle, sectionLength){
			var totalLength = 0;
			var numSections = data.length;
			data.forEach(function(d){
				totalLength += d.length;
			})

			var numPoints = data.length;

			// console.log("Degrees for Section: ",(endAngle-startAngle - (this.gap*numSections)), "TotalLenght: ", totalLength)
			var deg = (endAngle-startAngle - (this.gap*numSections))/sectionLength;

			// console.log("Gap Deg: ",(this.gap*numSections) )
			// console.log("degPerBP ", deg);
			var trackWidth = this.get("trackWidth");
			var gap = (this.gap);
			data.forEach(function(d,index){
				// console.log("SectionTrack this.surface: ", this.surface, " GroupIdx: ", this.surface.groupIdx);
				var path = this.surface.createPath("");
				//path.rawNode.data = JSON.stringify(d);
				path.data = d;
				// console.log("PATH: ", path);
				// console.log("Section StartAngle: ", startAngle, " d.start: ", d.start, " degPerBp*start: ", deg*d.start);
				d.startAngle = (deg*d.start) + startAngle;
				d.endAngle = (deg*(d.start+d.length)) + startAngle;
				// console.log("Start: ", d.startAngle, " End: ", d.endAngle);
				path.setStroke(this.stroke);
				var startRads = d.startAngle *Math.PI/180;
				var rads = d.endAngle *Math.PI/180;
				// console.log(d.name, " : ", "Start: ", d.startAngle, "end: ", d.endAngle)
				var innerStart= {
					x:  this.centerPoint.x + this.internalRadius * Math.cos(startRads),
					y: this.centerPoint.y + this.internalRadius * Math.sin(startRads)
				}

				var outerStart = {
					x: this.centerPoint.x + (this.internalRadius + trackWidth) * Math.cos(startRads),
					y: this.centerPoint.y + (this.internalRadius + trackWidth) * Math.sin(startRads)
				}

				var outerEnd = {
					x: this.centerPoint.x + (this.internalRadius + trackWidth) * Math.cos(rads),
					y: this.centerPoint.y + (this.internalRadius + trackWidth) * Math.sin(rads)
				}
				var innerEnd = {
					x: this.centerPoint.x + (this.internalRadius) * Math.cos(rads),
					y: this.centerPoint.y  + (this.internalRadius) * Math.sin(rads) 
				}
				// var fillSel = index % 3;
				var outerRadius = this.internalRadius + trackWidth;
				var innerRadius = this.internalRadius
				var large=false
				if ((deg*d.length)>180){
					large=true
				}

				path.moveTo(innerStart)
					.arcTo(innerRadius,innerRadius,deg*d.length,large,true,innerEnd.x,innerEnd.y)
					.lineTo(outerEnd)
					.arcTo(outerRadius,outerRadius,deg*d.length,large,false,outerStart.x,outerStart.y)
					.closePath()
	
				if (this.fill){
					if (typeof this.fill == "function") {
						path.setFill(this.fill(d,index))
					}else{
						path.setFill(this.fill)
					}
				}
				this._foregroundColorPaths.push(path);
			},this);
		},

		renderData: function(data) {
			if (this.referenceTrack){
				return this.renderAlignedData(data);
			}
			var totalLength = 0;
			var numSections = data.length;
			var sections={}
			data.forEach(function(d){
				totalLength += d.length;
				// console.log("Total: ", totalLength, " Contig Len: ", d.length);
			})

			var lastSectionEnd=270;

			var deg = (360 - (this.gap*numSections))/totalLength;
			var gap = (this.gap);
			data.forEach(lang.hitch(this,function(d,index){
				var trackWidth = this.get("trackWidth");
				// console.log("Render Section Data GroupIdx: ", this.surface.groupIdx);
				var path = this.surface.createPath("");
				// path.rawNode.data = JSON.stringify(d);
				path.data = d;
				d.startAngle = deg + lastSectionEnd;
				d.endAngle = (deg*d.length) + lastSectionEnd;
				sections[d[this.sectionIdProperty]]=d;
				path.setStroke(this.stroke);
				var startRads = d.startAngle *Math.PI/180;
				var rads = d.endAngle *Math.PI/180;
				// console.log(d.name, " : ", "Degrees: ", (deg & d.length), "lastSectionEnd: ", lastSectionEnd, "SectionTrack Start: ", deg + lastSectionEnd, " End: ", ((deg*d.length)+lastSectionEnd))
				lastSectionEnd=(deg*d.length) + lastSectionEnd+gap;

				var innerStart= {
					x:  this.centerPoint.x + this.internalRadius * Math.cos(startRads),
					y: this.centerPoint.y + this.internalRadius * Math.sin(startRads)
				}

				var outerStart = {
					x: this.centerPoint.x + (this.internalRadius + trackWidth) * Math.cos(startRads),
					y: this.centerPoint.y + (this.internalRadius + trackWidth) * Math.sin(startRads)
				}

				var outerEnd = {
					x: this.centerPoint.x + (this.internalRadius + trackWidth) * Math.cos(rads),
					y: this.centerPoint.y + (this.internalRadius + trackWidth) * Math.sin(rads)
				}
				var innerEnd = {
					x: this.centerPoint.x + (this.internalRadius) * Math.cos(rads),
					y: this.centerPoint.y  + (this.internalRadius) * Math.sin(rads) 
				}
				// var fillSel = index % 3;
				var outerRadius = this.internalRadius + trackWidth;
				var innerRadius = this.internalRadius
				var large=false
				if ((deg*d.length)>180){
					large=true
				}

				path.moveTo(innerStart)
					.arcTo(innerRadius,innerRadius,deg*d.length,large,true,innerEnd.x,innerEnd.y)
					.lineTo(outerEnd)
					.arcTo(outerRadius,outerRadius,deg*d.length,large,false,outerStart.x,outerStart.y)
					.closePath()
				
				if (this.fill){
					if (typeof this.fill == "function") {
						path.setFill(this.fill(d,index))
					}else{
						path.setFill(this.fill)
					}
				}
				this._foregroundColorPaths.push(path);
			}));

			// console.log("Set Sections: ", sections)
			this.set("sections", sections)

		}
	});
});

