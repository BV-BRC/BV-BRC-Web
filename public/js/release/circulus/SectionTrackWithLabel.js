define("circulus/SectionTrackWithLabel", [
        "dojo/_base/declare","dojox/gfx","dojox/gfx/matrix",
        "dojo/_base/lang","./SectionTrack","dojo/on","dijit/Dialog",
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
		fill: "grey",
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
			console.log("this.visible: ",this.visible, " referenceTrack: ", this.referenceTrack);
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
		//gap: .25,

		renderData: function(data) {
			var totalLength = 0;
			var numSections = data.length;
			var sections={}
			data.forEach(function(d){
				totalLength += d.length;
				console.log("data :" , data , "Total: ", totalLength, " Contig Len: ", d.length);
			})

			var lastSectionEnd=270;

			var deg = (360 - (this.gap*numSections))/totalLength;
			console.log("this.gap: ", this.gap, " numSections: ", numSections, " deg: ", deg, " totalLength : ", totalLength);

			var gap = (this.gap);
			data.forEach(lang.hitch(this,function(d,index){
				var trackWidth = this.get("trackWidth");
				// console.log("Render Section Data GroupIdx: ", this.surface.groupIdx);

				d.startAngle = deg + lastSectionEnd;
				d.endAngle = (deg*d.length) + lastSectionEnd;
				sections[d[this.sectionIdProperty]]=d;
				var startRads = d.startAngle *Math.PI/180;
				var rads = d.endAngle *Math.PI/180;
				lastSectionEnd=(deg*d.length) + lastSectionEnd+gap;
				console.log(d.name, " : ", "Degrees: ", deg, " Length: ", d.length, " trackWidth: ", trackWidth, " d: ", d, " startRads: ", startRads, " lastSectionEnd: ", lastSectionEnd, "SectionTrack Start: ", deg + lastSectionEnd, " End: ", ((deg*d.length)+lastSectionEnd))

				var innerStart= {
					x:  this.centerPoint.x + this.internalRadius * Math.cos(startRads),
					y: this.centerPoint.y + this.internalRadius * Math.sin(startRads)
				}

				var outerStart = {
					x: this.centerPoint.x + (this.internalRadius + trackWidth/5) * Math.cos(startRads),
					y: this.centerPoint.y + (this.internalRadius + trackWidth/5) * Math.sin(startRads)
				}

				var outerEnd = {
					x: this.centerPoint.x + (this.internalRadius + trackWidth/5) * Math.cos(rads),
					y: this.centerPoint.y + (this.internalRadius + trackWidth/5) * Math.sin(rads)
				}
				var innerEnd = {
					x: this.centerPoint.x + (this.internalRadius) * Math.cos(rads),
					y: this.centerPoint.y  + (this.internalRadius) * Math.sin(rads) 
				}

				var outerRadius = this.internalRadius + trackWidth;
				var innerRadius = this.internalRadius;
				var large=false;
				if ((deg*d.length)>180){
					large=true;
				}

				var i=0;
				var line;
				var textShape;
				var	textouterEnd;
				textouterEnd = {
					x: this.centerPoint.x + (this.internalRadius + trackWidth) * Math.cos(startRads),
					y: this.centerPoint.y + (this.internalRadius + trackWidth) * Math.sin(startRads)
				}
				
				var unit = 10000;
				
				if (totalLength >5000000) {
					unit = 100000;
				}
				else if (totalLength <300000)
				{
					unit = 1000;
				}
				
				var factor = unit/1000000;	
				var decimal = Math									
				var ticks = Math.round(d.length/unit);	
				//console.log(d.name, " : ", "Degrees: ", deg, " Length: ", d.length, " ticks: ", ticks, " factor: ", factor);
				var mydeg = deg;
				var mystartRads = startRads;

				var myText = 0;
				myText = myText.toFixed(Math.log10(1/factor)-1);

				line = this.surface.createLine({ x1: innerStart.x, y1: innerStart.y, x2:outerStart.x, y2:outerStart.y }).setStroke("grey");
				textShape = this.surface.createTextPath({text: myText})
						.moveTo(outerStart)
						.lineTo(textouterEnd)
						.setFill("grey")
						.setFont({size: "8pt"});

				if (this.fill) {
					line.setStroke(this.fill);
					//textShape.setStroke(this.fill);
					textShape.setFill(this.fill);
				}
				this._foregroundColorPaths.push(line);
				this._foregroundColorPaths.push(textShape);
				

				for (i=0; i<ticks-1; i++)
				{
				 	mydeg = d.startAngle + i*unit*(360 - (this.gap*numSections))/totalLength;
					mystartRads = mydeg *Math.PI/180;
					//console.log("i: ", i, " mydeg: ", mydeg, " mystartRads: ", mystartRads);

					innerStart= {
						x: this.centerPoint.x + this.internalRadius * Math.cos(mystartRads),
						y: this.centerPoint.y + this.internalRadius * Math.sin(mystartRads)
					}

					outerStart = {
						x: this.centerPoint.x + (this.internalRadius + trackWidth/5) * Math.cos(mystartRads),
						y: this.centerPoint.y + (this.internalRadius + trackWidth/5) * Math.sin(mystartRads)
					}

					textouterEnd = {
						x: this.centerPoint.x + (this.internalRadius + trackWidth) * Math.cos(mystartRads),
						y: this.centerPoint.y + (this.internalRadius + trackWidth) * Math.sin(mystartRads)
					}

					//console.log("Degrees: ", mydeg, " i: ", i, " ticks: ", ticks);

					myText = i*factor;
					myText = myText.toFixed(Math.log10(1/factor)-1);
					if (i!=0) {					
						if (i%10 == 0)
						{
							line = this.surface.createLine({ x1: innerStart.x, y1: innerStart.y, x2:outerStart.x, y2:outerStart.y }).setStroke("grey");
							textShape = this.surface.createTextPath({text: myText})
								.moveTo(outerStart)
								.lineTo(textouterEnd)
								.setFill("grey")
								.setFont({size: "8pt"});
						}
						else if (i%5 == 0)
						{
							line = this.surface.createLine({ x1: innerStart.x, y1: innerStart.y, x2:outerStart.x, y2:outerStart.y }).setStroke("grey");
						}
						else
						{
							outerStart = {
								x: this.centerPoint.x + (this.internalRadius + trackWidth/10) * Math.cos(mystartRads),
								y: this.centerPoint.y + (this.internalRadius + trackWidth/10) * Math.sin(mystartRads)
							}
							line = this.surface.createLine({ x1: innerStart.x, y1: innerStart.y, x2:outerStart.x, y2:outerStart.y }).setStroke("grey");					
						}
							
						if (this.fill) {
							line.setStroke(this.fill);
							//textShape.setStroke(this.fill);
							textShape.setFill(this.fill);
						}
						this._foregroundColorPaths.push(line);
						this._foregroundColorPaths.push(textShape);
						
					}
				
				}	
			}));

			console.log("Set Sections: ", sections);
			this.set("sections", sections);

		}
	});
});

