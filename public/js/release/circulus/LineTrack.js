define("circulus/LineTrack", [
        "dojo/_base/declare","dojox/gfx","dojox/gfx/matrix",
        "dojo/_base/lang","./Track"
],function(
        declare,gfx,matrix,
        lang,Track
){
	return declare([Track], {
		max:1,
		min: 0,
		data:null,
		stroke: {color: "black", width: 2},
		scoreProperty: "score",
		sectionIdProperty: "accession",
		gridLines: true,

		applyForegroundColor: function(color){
			var stroke = this.stroke;
			if (!this.stroke || (typeof this.stroke=='string')) { 
				this.stroke = {color: color} 
			}else{
				this.stroke.color = color;
			}



			this._foregroundColorPaths.forEach(function(p){
				p.setStroke(this.stroke);
			},this)
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
					//console.log("   Starting Angle: ", refSections[secName].startAngle, "refSections[secName].endAngle: ", refSections[secName].endAngle, "refSections[secName].length= ", refSections[secName].length);
					this.renderAlignedSection(ds,refSections[secName].startAngle, refSections[secName].endAngle, refSections[secName].length);
			},this)
		},

		renderAlignedSection: function(data,startAngle,endAngle, sectionLength){
			var pathPoints = [];
			var numSections = data.length;

			//console.log("Degrees for Section: ",(endAngle-startAngle - (this.gap*numSections)), " data: ", data)
			var deg = (endAngle-startAngle)/sectionLength;

			// console.log("degPerBP ", deg);

			var path = this.surface.createPath("");
			var trackWidth = this.get("trackWidth");
			data.forEach(function(d,index){

				// console.log("D: ", d)
				// console.log("SectionTrack this.surface: ", this.surface, " GroupIdx: ", this.surface.groupIdx);
				var path = this.surface.createPath("");
				//path.rawNode.data = JSON.stringify(d);
				var score = d[this.scoreProperty];
				// console.log("PATH: ", path);
			    //console.log("Section StartAngle: ", startAngle, " d.start: ", d.start, " degPerBp*start: ", deg*d.start, "score", score);
				//console.log("----LineTrack Track Width trackWidth: ", trackWidth, " this.trackWidth: ", this.trackWidth, " score: ", score, " this.max", this.max, " (trackWidth * (score/this.max)): ", (trackWidth * (score/this.max)));

				var point;

				if (  (this.min < 0) && ((this.max+this.min)===0) ){
					var trackCenter = this.internalRadius + (trackWidth/2);
					point = {x: 0, y:trackCenter + ((score/this.max) * (trackWidth/2)) };
				}else if (this.min===0){
					point = {x: 0, y:this.internalRadius + ( (score/this.max) * trackWidth) };
				}else{
					// console.log("FIX ME (LineTrack.js line 56)");
				}
				//console.log("----LineTrack  d.start: ", d.start, " d.end: ", d.end, " score: ", score, " this.max", this.max, " (trackWidth * (score/this.max)): ", (trackWidth * (score/this.max)), " point.y:", point.y);
				var m = d.start; // + ((d.end-d.start)/2)
				var rads = ((deg*m) + startAngle) *Math.PI/180;
				var nextPoint = {
					x: point.y * Math.cos(rads) + this.centerPoint.x,
					y: point.y * Math.sin(rads) + this.centerPoint.y
				}

				pathPoints.push(nextPoint);
			},this);

			var first = pathPoints.shift();
			// smoothCurveTo sometimes draws wrong curve - made some lines outside the track.
			//path.moveTo(first).smoothCurveTo(pathPoints).setStroke(this.stroke);
			path.moveTo(first).curveTo(pathPoints).setStroke(this.stroke);
			this._foregroundColorPaths.push(path);
		},

		renderData: function(data) {
			if (this.referenceTrack){
				return this.renderAlignedData(data);
			}
			var numPoints = data.length;
			var deg = 360/numPoints

			if (this.path){ return; }

			// console.log("lineTrack this.surface: ", this.surface);
			this.path = this.surface.createPath("");
		
			var pathPoints = [];	

			var diff = this.max - this.min;
			var trackWidth = this.get("trackWidth");

			this.data.forEach(function(item,index){
				var score = item[this.scoreProperty];

				//console.log("----LineTrack Internal Radius: ", this.internalRadius, " Track Width trackWidth: ", trackWidth, " this.trackWidth: ", this.trackWidth, " score: ", score, " (trackWidth * (score/this.max)): ", (trackWidth * (score/this.max)));

				// var trackCenter = this.internalRadius + (this.trackWidth/2);

				var point;

				if (  (this.min < 0) && ((this.max+this.min)===0) ){
					var trackCenter = this.internalRadius + (trackWidth/2);
					point = {x: 0, y:trackCenter + ((score/this.max) * (trackWidth/2)) }
				}else if (this.min===0){
					point = {x: 0, y:this.internalRadius + ( (score/this.max) * trackWidth) }
				}else{
					// console.log("FIX ME (LineTrack.js line 56)");
				}

				var rads = (deg*index)*Math.PI/180;
				var nextPoint = {
					x: point.y * Math.cos(rads) + this.centerPoint.x,
					y: point.y * Math.sin(rads) + this.centerPoint.y
				}

				pathPoints.push(nextPoint);
			},this);

			var first = pathPoints.shift();
			this.path.moveTo(first).smoothCurveTo(pathPoints).closePath().setStroke(this.stroke);
			this._foregroundColorPaths.push(this.path)
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
				var r = this.internalRadius+((trackWidth/4)*3)
				var start = {x: this.centerPoint.x, y: this.centerPoint.y - r};
				var end   = {x: this.centerPoint.x, y: this.centerPoint.y + r};
				this.topQuarterPath.moveTo(start).arcTo(r, r, 0, true, true, end).arcTo(r, r, 0, true, true, start).closePath();
				this.topQuarterPath.setStroke({color: "#aaaaaa",style: "dot"});

				this.bottomQuarterPath = this.surface.createPath("");
				var r = this.internalRadius+(trackWidth/4)
				var start = {x: this.centerPoint.x, y: this.centerPoint.y - r};
				var end   = {x: this.centerPoint.x, y: this.centerPoint.y + r};
				this.bottomQuarterPath.moveTo(start).arcTo(r, r, 0, true, true, end).arcTo(r, r, 0, true, true, start).closePath();
				this.bottomQuarterPath.setStroke({color: "#aaaaaa",style: "dot"});
			}
			this._backgroundRendered=true;
			this._backgroundPaths.push(this.bgPath);
			return this.bgPath;
		}
	});
});

