define("circulus/HeatmapTrack", [
        "dojo/_base/declare","dojox/gfx","dojox/gfx/matrix",
        "dojo/_base/lang","./Track", "dojo/on","dijit/Dialog",
        "dijit/TooltipDialog","dijit/popup"
],function(
        declare,gfx,matrix,
        lang,Track, on,Dialog,
        TooltipDialog,Popup
){
	var TTDialog = new TooltipDialog({
		onMouseLeave: function(){
		    Popup.close(TTDialog);
		}
	})
	Popup.moveOffScreen(TTDialog);
	
	return declare([Track], {
		max:1,
		min: 0,
		data:null,
		fill: "red",
		stroke: {color: "black", width: 1},
		scoreProperty: "score",
		sectionIdProperty: "accession",
		gridLines: false,

		constructor: function(){
			this.surface.connect("onclick", lang.hitch(this,function(evt){
				//console.log("ON CLICK: ", evt)
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
				//console.log("Mouse Over EVT: ", evt)
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


		applyForegroundColor: function(color){
/*			var stroke = this.stroke;
			if (!this.stroke || (typeof this.stroke=='string')) { 
				//this.stroke = {color: color} 
			}else{
				//this.stroke.color = color;
			}
			//this.fill =  color;

			this._foregroundColorPaths.forEach(function(p){
				//p.setStroke(this.stroke);
				//p.setFill(color);				
			},this)
*/
		},

		applyBackgroundColor: function(color){
			if (!this.background || (typeof this.background=='string')) { 
				this.background = {fill: color} 
			}else{
				this.background.fill = color;
			}

			this._backgroundPaths.forEach(function(p){
				if (p){
					p.setFill(color);
				}
			},this)
		},

		render: function(){
			console.log("Line Track Visible in render(): ", this.visible)
			if (this.visible){
				this.renderBackground();
				if (this.data && this.data.length>0){
					// console.log("RENDER DATA: ", this.data)
					this.set("loading", false);
					this.renderData(this.data);		
				}else{
					this.set("loading", true);
				}
			}
		},

		renderAlignedData: function(data){
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
			var pathPoints = [];
			var numSections = data.length;

			// console.log("Degrees for Section: ",(endAngle-startAngle - (this.gap*numSections)), "TotalLenght: ", totalLength)
			var deg = (endAngle-startAngle)/sectionLength;

			// console.log("degPerBP ", deg);

			var path = this.surface.createPath("");
			var trackWidth = this.get("trackWidth");
			data.forEach(function(d,index){

				// console.log("D: ", d)
				// console.log("SectionTrack this.surface: ", this.surface, " GroupIdx: ", this.surface.groupIdx);
				var path = this.surface.createPath("");
				path.data = d;
				//path.rawNode.data = JSON.stringify(d);
				var score = d[this.scoreProperty];
				// console.log("PATH: ", path);
				// console.log("Section StartAngle: ", startAngle, " d.start: ", d.start, " degPerBp*start: ", deg*d.start);


				var inpoint = {x: 0, y: this.internalRadius} ;
				var outpoint = {x: 0, y: this.internalRadius + trackWidth} ;
				
				var m = d.start; // + ((d.end-d.start)/2)
				var rads = ((deg*m) + startAngle) *Math.PI/180;
				var rads2 = ((deg*(d.end)) + startAngle) *Math.PI/180;

				var nextPoint = {
					x: outpoint.y * Math.cos(rads) + this.centerPoint.x,
					y: outpoint.y * Math.sin(rads) + this.centerPoint.y
				}
				var nextPoint2 = {
					x: outpoint.y * Math.cos(rads2) + this.centerPoint.x,
					y: outpoint.y * Math.sin(rads2) + this.centerPoint.y
				}
				var startPoint = {
					x: inpoint.y * Math.cos(rads) + this.centerPoint.x,
					y: inpoint.y * Math.sin(rads) + this.centerPoint.y
				}
				var endPoint = {
					x: inpoint.y * Math.cos(rads2) + this.centerPoint.x,
					y: inpoint.y * Math.sin(rads2) + this.centerPoint.y
				}
				
				var scorePct = score/this.max;
				//console.log("scorePct=", scorePct);
				var large=false;
				if ((deg*d,length)>180){
					large=true;
				}
				
				path.moveTo(startPoint)
					.arcTo(inpoint.y,inpoint.y,deg*(d.end-d.start),large,true,endPoint.x,endPoint.y)
					.lineTo(nextPoint2)
					.arcTo(outpoint.y,outpoint.y,deg*(d.end-d.start),large,false,nextPoint.x,nextPoint.y)
					.closePath();
					
/*					
				if (this.fill) {	
					path.setFill([this.fill, opacity]);
				} else {
					path.setFill(["blue", opacity]);			
				}
*/
				var currColor = this.getHeatmapColor(scorePct);
				//console.log("currColor=", currColor);
				path.setFill(currColor);
				this._foregroundColorPaths.push(path);	
							
			},this);

		},

		getHeatmapColor: function(scorePct) {
			// http://htmlcolorcodes.com/color-chart
			var red_colors = ["#FFEBEE", "#FFCDD2", "#EF9A9A", "#E57373", "#EF5350", "#F44336", "#E53935", "#D32F2F", "#C62828", "#B71C1C"];
			var blue_colors = ["#E8EAF6", "#C5CAE9", "#9FA8DA", "#7986CB", "#5C6BC0", "#3F51B5", "#3949AB", "#303F9F", "#283593", "#1A237E"];
			var green_colors = ["#E8F5E9", "#C8E6C9", "#A5D6A7", "#81C784", "#66BB6A", "#4CAF50", "#43A047", "#388E3C", "#2E7D32", "#1B5E20"];
			var currColor = "red";
			//console.log("scorePct=", scorePct);
			switch(true){
				case scorePct >0 && scorePct <=0.1:
					currColor = red_colors[0];
					break;
				case scorePct >0.1 && scorePct <=0.2:
					currColor = red_colors[1];
					break;
				case scorePct >0.2 && scorePct <=0.3:
					currColor = red_colors[2];
					break;
				case scorePct >0.3 && scorePct <=0.4:
					currColor = red_colors[3];
					break;
				case scorePct >0.4 && scorePct <=0.5:
					currColor = red_colors[4];
					break;
				case scorePct >0.5 && scorePct <=0.6:
					currColor = red_colors[5];
					break;
				case scorePct >0.6 && scorePct <=0.7:
					currColor = red_colors[6];
					break;
				case scorePct >0.7 && scorePct <=0.8:
					currColor = red_colors[7];
					break;
				case scorePct >0.8 && scorePct <=0.9:
					currColor = red_colors[8];
					break;
				case scorePct >0.9:
					currColor = red_colors[9];
					break;
				case scorePct >=-0.1 && scorePct <0:
					currColor = blue_colors[0];
					break;
				case scorePct >=-0.2 && scorePct <-0.1:
					currColor = blue_colors[1];
					break;
				case scorePct >=-0.3 && scorePct <-0.2:
					currColor = blue_colors[2];
					break;
				case scorePct >=-0.4 && scorePct <-0.3:
					currColor = blue_colors[3];
					break;
				case scorePct >=-0.5 && scorePct <-0.4:
					currColor = blue_colors[4];
					break;
				case scorePct >=-0.6 && scorePct <-0.5:
					currColor = blue_colors[5];
					break;
				case scorePct >=-0.7 && scorePct <-0.6:
					currColor = blue_colors[6];
					break;
				case scorePct >=-0.8 && scorePct <-0.7:
					currColor = blue_colors[7];
					break;
				case scorePct >=-0.9 && scorePct <-0.8:
					currColor = blue_colors[8];
					break;
				case scorePct <-0.9:
					currColor = blue_colors[9];
					break;
				default:
					break;			
			}
			//console.log("currColor=", currColor);
			return currColor;
		},

		renderData: function(data) {
			//console.log("in renderData this.referenceTrack=", this.referenceTrack);
			
			if (this.referenceTrack){
				return this.renderAlignedData(data);
			}
			
			// The following block is used when the track does not correspond to the referenceTrack 
			var numPoints = data.length;
			var deg = 360/numPoints

			if (this.path){ return; }

			// console.log("lineTrack this.surface: ", this.surface);
			this.path = this.surface.createPath("");
		
			var pathPoints = [];	

			var diff = this.max - this.min;
			var trackWidth = this.get("trackWidth");

			this.data.forEach(function(item,index){
				var path = this.surface.createPath("");
				//path.rawNode.data = JSON.stringify(d);
				var score = item[this.scoreProperty];
				var inpoint = {x: 0, y: this.internalRadius} ;
				var outpoint = {x: 0, y: this.internalRadius + trackWidth} ;
				
				var rads = (deg*index)*Math.PI/180;
				var rads2 = (deg*(index+1)) *Math.PI/180;

				var nextPoint = {
					x: outpoint.y * Math.cos(rads) + this.centerPoint.x,
					y: outpoint.y * Math.sin(rads) + this.centerPoint.y
				}
				var nextPoint2 = {
					x: outpoint.y * Math.cos(rads2) + this.centerPoint.x,
					y: outpoint.y * Math.sin(rads2) + this.centerPoint.y
				}
				var startPoint = {
					x: inpoint.y * Math.cos(rads) + this.centerPoint.x,
					y: inpoint.y * Math.sin(rads) + this.centerPoint.y
				}
				var endPoint = {
					x: inpoint.y * Math.cos(rads2) + this.centerPoint.x,
					y: inpoint.y * Math.sin(rads2) + this.centerPoint.y
				}
				
				var scorePct = score/this.max;
				//console.log("scorePct=", scorePct);
				var large=false;
				if ((deg*d,length)>180){
					large=true;
				}
				
				path.moveTo(startPoint)
					.arcTo(inpoint.y,inpoint.y,deg*data.length,large,true,endPoint.x,endPoint.y)
					.lineTo(nextPoint2)
					.arcTo(outpoint.y,outpoint.y,deg*data.length,large,false,nextPoint.x,nextPoint.y)
					.closePath();
					
				var currColor = this.getHeatmapColor(scorePct);
				//console.log("currColor=", currColor);
				path.setFill(currColor);
				this._foregroundColorPaths.push(path);	

			},this);

		},
		renderBackground: function(refresh){
			// if (!refresh && this._backgroundRendered){ return; }

			this.inherited(arguments);
			var trackWidth = this.get("trackWidth");
			if (this.gridLines){
				this.centerPath = this.surface.createPath("");
				var r = this.internalRadius+(trackWidth/2)
				var start = {x: this.centerPoint.x, y: this.centerPoint.y - r};
				var end   = {x: this.centerPoint.x, y: this.centerPoint.y + r};
				this.centerPath.moveTo(start).arcTo(r, r, 0, true, true, end).arcTo(r, r, 0, true, true, start).closePath();
				this.centerPath.setStroke({color: "#666666",style: "dot"});

				this.topQuarterPath = this.surface.createPath("");
				var r1 = this.internalRadius+((trackWidth/4)*3)
				var start1 = {x: this.centerPoint.x, y: this.centerPoint.y - r1};
				var end1   = {x: this.centerPoint.x, y: this.centerPoint.y + r1};
				this.topQuarterPath.moveTo(start1).arcTo(r1, r1, 0, true, true, end1).arcTo(r1, r1, 0, true, true, start1).closePath();
				this.topQuarterPath.setStroke({color: "#aaaaaa",style: "dot"});

				this.bottomQuarterPath = this.surface.createPath("");
				var r2 = this.internalRadius+(trackWidth/4)
				var start2 = {x: this.centerPoint.x, y: this.centerPoint.y - r2};
				var end2   = {x: this.centerPoint.x, y: this.centerPoint.y + r2};
				this.bottomQuarterPath.moveTo(start2).arcTo(r2, r2, 0, true, true, end2).arcTo(r2, r2, 0, true, true, start2).closePath();
				this.bottomQuarterPath.setStroke({color: "#aaaaaa",style: "dot"});
			}
			this._backgroundRendered=true;
			this._backgroundPaths.push(this.bgPath);
			return this.bgPath;
		}
	});
});

