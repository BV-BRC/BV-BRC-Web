
define("phyloview/TreeNavSVG", [
	"dojo/_base/declare", "dijit/_WidgetBase",
	"dojo/dom-construct","dojo/_base/lang", "dojo/request","dojo/dom-style", "./PhyloTree" 
],function(
	declare,WidgetBase,
	domConstruct,lang,request,domStyle,PhyloParse
){

    return declare([WidgetBase], {
    options: null,
    totalNodes : 0,
    maxLabelLength : 0,
    maxNodeDistanceToRoot : 0,
    maxNodeDepth : 0,
    leafCount : 0,
    heightPerLeaf :  null,
    topMargin : 20,
    colorSpecies : null,
    colorGenus : null,
    tipLinkPrefix : "http://www.google.com/search?q:",
    tipLinkSuffix : "",
    fontWidthForMargin : null,
    selectionTarget: null,
    containerName: null,
    tipToColors  : null,
    treeData : null,
    labelIndex: 0,
    labelLabels: {"PATRIC ID":0},
    tree : null,
    selected: [],
    svgContainer : null, 
    visit: function(parent, visitFn, childrenFn)
    {
        if (!parent) return;

        visitFn(parent);

        var children = childrenFn ? childrenFn(parent) : parent.children;
        if (children) {
            var count = children.length;
            for (var i = 0; i < count; i++) {
                this.visit(children[i], visitFn, childrenFn);
            }
        }
    },

    startup: function(){
        if(this._started){
            return;
        }

        this.watch("labelIndex", lang.hitch(this, "update"));

        this.inherited(arguments);
    },


    d3Tree: function(containerName, customOptions)
{
    this.options= {iNodeRadius: 3, tipNodeRadius: 3, fontSize: 12, phylogram:true, supportCutoff:100};
    // build the options object
    this.options = dojo.mixin(this.options, customOptions);
    this.heightPerLeaf = this.options.fontSize + 2;
    this.fontWidthForMargin = Math.max(this.options.fontSize*2/3, 9),
    this.colorSpecies = customOptions.colorSpecies;
    this.colorGenus = customOptions.colorGenus;
    this.containerName=containerName;

    // Calculate total nodes, max label length

    console.log(this.options);
    console.log(this.colorSpecies + ", " + this.colorGenus);
    // size of the diagram
    var canvasHeight = this.leafCount * this.heightPerLeaf + this.topMargin;
    var size = { width:dojo.position(dojo.query(containerName)[0]).w, height: canvasHeight};
    
    },
    setTree : function(treeString) {
        _self=this;
        phylotree = new PhyloTree.PhyloTree(treeString);
        this.treeData = phylotree.getJSONTree();

        this.leafCount = phylotree.getLeafCount();
        this.maxNodeDepth = this.treeData.cx;
        this.visit(this.treeData, function(d)
        {
            _self.totalNodes++;
            if(d.n) {
                _self.maxLabelLength = Math.max(d.n.length, _self.maxLabelLength);
            }
            var toRoot = d.px ? d.px : 0;
            _self.maxNodeDistanceToRoot = Math.max(toRoot, _self.maxNodeDistanceToRoot);
        }, function(d)
        {
            return d.c && d.c.length > 0 ? d.c : null;
        });
        canvasHeight = this.leafCount * this.heightPerLeaf + this.topMargin;
        size = { width:dojo.position(dojo.query(this.containerName)[0]).w, height: canvasHeight};

        this.tree = d3.layout.tree()
            .sort(null)
            .size([size.height, size.width - this.maxLabelLength*this.fontWidthForMargin])
            .children(function(d)
            {
                return (!d.c || d.c.length === 0) ? null : d.c;
            });

        this.tipToColors  = this.getTipColors(this.colorGenus, this.colorSpecies);

    /*
        <svg>
            <g class="container" />
        </svg>
     */
        this.svgContainer = d3.select(this.containerName)
        .html("")
        .append("svg:svg").attr("width", size.width).attr("height", size.height)
        .append("svg:g")
        .attr("class", "container")
        .attr("transform", "translate(" + this.maxLabelLength + ",0)")
        ;

        this.init();
        this.update();
    },

    addLabels: function(labelMap, labelAlias){ //object map for IDs to labels and a category name for the label
        this.labelLabels[labelAlias]=this.treeData.labels.length;
        this.treeData.labels.push(labelMap);
    },

    selectLabels: function(labelAlias){
        if (labelAlias in this.labelLabels){
            var labelIndex = this.labelLabels[labelAlias];
            this.maxLabelLength = 10;
            Object.keys(this.treeData.labels[labelIndex]).forEach(lang.hitch(this, function(leafID){
                this.maxLabelLength = Math.max(this.treeData.labels[labelIndex][leafID].length, this.maxLabelLength);
            }));
            this.set('labelIndex', labelIndex);
        }
    },


    getDataURL : function() {
        var svgs = d3.select("svg")
            .attr("version", 1.1)
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .node().parentNode.innerHTML;
        return svgs;
    },

    setPhylogram : function(p) {
        this.options.phylogram = p;
        this.update();
    },

    setSupportValueCutoff : function(sv) {
        this.options.supportCutoff = sv;
        this.update();
    },

    getSelectedItems : function() {
            this.tree.nodes(this.treeData).forEach(lang.hitch(this, function(d){
            if(d.selected && !d.c) {
                this.selected.push(d);
            }
        }));
        if (this.selectionTarget != null){
            this.selectionTarget.set("selection",this.selected);
        }
    },

    clearSelections : function() {
        this.tree.nodes(this.treeData).forEach(function(d){
            d.selected = false;
        });
        this.selected = [];
    },

    startingBranch : function(d){
        var source = d.source;;
        var target = d.target;

        var r = "M0," + source.x
               + "C0," + target.x 
               + ",0," + target.x 
               + ",0," + target.x;
        return r;
    },

    curvedBranch : function (d){
        var source = d.source;;
        var target = d.target;
        var r = "M" + source.y + "," + source.x
               + "L" + source.y + "," + target.x 
               + "," + source.y + "," + target.x 
               + "," + target.y + "," + target.x;
        return r;
    },

    squareBranch : function (d){
        var source = d.source;
        var target = d.target;
        var r = "M" + source.y + "," + source.x
               + "L" + source.y + "," + target.x 
               + "," + source.y + "," + target.x 
               + "," + target.y + "," + target.x;
        return r;
    },

    branch : function(d){
        return _self.squareBranch(d);
    },

    getDescendants: function(d) {
        var descendants = new Array();
        if(d.c) {
            for(var i = d.c.length-1; i >=0; i--) {
                getDescendants(d.c[i]).forEach(function(d){descendants.push(d);});;
            }
        } else {
            descendants.push(d);
        }
        return descendants;
    },

    hover: function(d) {
        d = d.target ? d.target : d;
        _self.visit(d, function(d){
            d.hover = true;
        });

        _self.update();
    },

    mouseout: function (d) {
        d = d.target ? d.target : d;
        _self.visit(d, function(d){
            d.hover = false;
        });
        _self.update();
    },

    click: function(d) {
        if(!d.n) {
            //click was on a branch, not a node, so get the target node for the branch and
            //treat it as though that node was clicked
            d = d.target;
        }
        var toggleTo = !d.selected;
        var mouseEvent = d3.event;
        var keepSelections = mouseEvent.ctrlKey || mouseEvent.metaKey;
        if(!keepSelections) {
            _self.clearSelections();
        }
        _self.visit(d, function(d){
            d.selected = toggleTo;
        });
        x = _self.getSelectedItems();
        _self.update();
    },

    update: function() {
        _self=this;
       //console.log("update()");
        var nodes = this.tree.nodes(this.treeData);
        var links = this.tree.links(nodes);
        var treeWidth = size.width - this.maxLabelLength*(this.fontWidthForMargin);
 
        //adjust y values (because x and y are reversed) for nodes based on the branch lengths
        for(var i = nodes.length-1; i >=0; i--) {
            var d = nodes[i];
            var toRoot = d.px ? d.px : 0;
            //console.log("toRoot: " + toRoot);
            if(this.options.phylogram) {
                d.y = treeWidth * toRoot / this.maxNodeDistanceToRoot; //for phylogram
            } else {
                d.y = treeWidth * (this.maxNodeDepth - d.cx) / this.maxNodeDepth; //for cladogram
            }
            d.x = d.py*this.heightPerLeaf + this.topMargin;
        }

    var nodeGroup = this.svgContainer.selectAll("g.node");
    nodeGroup.selectAll("text").remove();
    var anchors = nodeGroup.append("svg:text")
        .attr("width", function(d){
            var r = d.n.length * _self.options.fontSize + 10;
            return r;
        })
        .attr("height", _self.heightPerLeaf*2)
        .attr("x", function(d)
        {
            var r = 4 * _self.options.tipNodeRadius;
            if(d.c && d.c.length > 0) {
                r = -4 * _self.options.iNodeRadius;;
            }
            r = 5;
            return r;
        })
        .attr("y", function(d)
        {
            var r = 10;
            if(d.c && d.children.length > 0) {
                r= -2;
            }
            r = 0;
            r = +(_self.heightPerLeaf/4);
            return r;
        });
    if(_self.createLinks){
        anchors.append("svg:a")
        .attr("xlink:href", function(d){
            var r = "";
            if(!d.c || d.children.length == 0) {
                r = _self.tipLinkPrefix + d.n + _self.tipLinkSuffix;
            }
            return r;
        });
    }

    var fullLabels = anchors
        .append("svg:tspan")
        .style("opacity", "1")
        .attr("class", function(d){
            var r = "fl";//full label
            if(d.selected) {
                r += " selected";
                if(!d.prevSelected) {
                    r += " ns"; //new selection
                }
            } else {
                if(d.prevSelected) {
                    r += " ds"; //de-selected
                }
            }
            return r;
        })
        ;

    fullLabels
        .append("svg:tspan")
        .text(function(d){
            var r = "";
            if((!d.c || d.c.length == 0) &&d.selected) {
                r = "\u2713";
            } 
            return r;
        })
        .attr("class", function(d){
            var r = "ch";
            if(d.selected) {
                r += " selected";
            }
            return r;
        })
        ;

    fullLabels
        .append("svg:tspan")
        .style("fill", function(d){
            var prefixColor = "#000000";
            return prefixColor;
        })
        .text(function(d){
            var r = "";
            if(d.prefix) {
                r += d.prefix + " ";
            }
        })
        ;

    fullLabels
        .append("svg:tspan")
        .style("fill", function(d){
            var r = "";
            var colorKey = d.genus + " " + d.species;
            if(_self.tipToColors[colorKey]) {
                r = _self.tipToColors[colorKey][0];
            }            
            return r;
        })
        .text(function(d){
            var r = "";
            if(d.id && _self.treeData.labels.length && d.id in _self.treeData.labels[_self.labelIndex]){
                r = _self.treeData.labels[_self.labelIndex][d.id];
            }
            else if(d.label) {
                r = d.label
            }
            return r;
        })
        .attr("id", function(d){
            var r = "";
            if(d.id){
                r = d.id;
            }
            return r;
        })
        ;


        nodeGroup
            .transition()
            .duration(1200)
            .attr("transform", function(d)
            {
                return "translate(" + d.y + "," + d.x + ")";
            })
            ;

        this.svgContainer.selectAll("path.link")
            .transition()
            .duration(1200)
            .attr("d", _self.branch)
            .attr("class", function(d){
                var r = "link";
                if(d.target.selected) {
                    r += " selected";
                }
                if(d.hover || d.target.hover) {
                    r += " hover";
                }
                return r;
            })
            ;


    //add support value labels
    nodeGroup.append("svg:text")
        .attr("class", function(d)
        {
            var r = "";
            if(d.c && d.c.length > 0) {
                 r="support_label";
            }
            return r;
        })
        .attr("text-anchor", function(d)
        {
            var r = d.c ? "end" : "start";
            return r;
        })
        .attr("dx", function(d)
        {
            var r = 4 * _self.options.tipNodeRadius;
            if(d.c && d.c.length > 0) {
                r = -4 * _self.options.iNodeRadius;
            }
            return r;
        })
        .attr("dy", function(d)
        {
            var r = 3;
            if(d.c && d.c.length > 0) {
                r= -2;
            } 
            return r;
        })
        .text(function(d)
        {
            var r = "";
            if(d.c && d.c.length > 0) {
                r = "";
                if(d.s && d.s < _self.options.supportCutoff) {
                    r = d.s;
                }
            }
            return r;
        });


        for(var i = nodes.length; i >= 0; --i) {
            if(nodes[i]) {
                nodes[i].prevSelected = nodes[i].selected; 
            }
        }
    },


    init: function() {
        _self=this;
        //console.log("init()");
        var nodes = this.tree.nodes(this.treeData);
        var links = this.tree.links(nodes);

        var treeWidth = size.width - this.maxLabelLength*(this.fontWidthForMargin);

    //adjust y values (because x and y are reversed) for nodes based on the branch lengths
    for(var i = nodes.length-1; i >=0; i--) {
        var d = nodes[i];
        var toRoot = d.px ? d.px : 0;
        if(this.options.phylogram) {
            d.y = treeWidth * toRoot / this.maxNodeDistanceToRoot; //for phylogram
        } else {
            d.y = treeWidth * (this.maxNodeDepth - d.cx) / this.maxNodeDepth; //for cladogram
            //console.log("cladogram d.cx: " + d.cx + " d.y: " + d.y);
        }

        d.x = d.py*this.heightPerLeaf + this.topMargin;
        //console.log("d.x: " + d.x + " d.y: " + d.y);
    }

    var pathLinks = this.svgContainer.selectAll("path.link")
        .data(links)
        .enter();

    pathLinks.append("svg:path")
        .attr("class", function(d){
            var r = "link";
            if(d.target.selected) {
                r = "link selected";
            }
            return r;
        })
        .style("stroke-width", "10")
        .style("stroke", "white")
        .style("opacity", "0.1")
        .on("click", this.click)
        .on("mouseover", this.hover)
        .on("mouseout", this.mouseout)
        .attr("d", this.startingBranch)
        ;

    pathLinks.append("svg:path")
        .attr("class", function(d){
            var r = "link";
            if(d.target.selected) {
                r = "link selected";
            }
            return r;
        })
        .style("stroke-linejoin", "round")
        .on("click", this.click)
        .on("mouseover", this.hover)
        .on("mouseout", this.mouseout)
        .attr("d", this.startingBranch)
        ;

    /*
        Nodes as
        <g class="node">
            <circle class="node-dot" />
            <text />
        </g>
     */
    var nodeGroup = this.svgContainer.selectAll("g.node")
        .data(nodes)
        .enter()
        .append("svg:g")
        .attr("class", function(d){
            var r = "node";
            if(d.selected) {
                r = r + " selected";
            }
            if(d.c && d.c.length == 0) {
                r = r + " leaf";
            }
            return r;
        })
        .attr("transform", function(d)
        {
            //return "translate(" + d.y + "," + d.x + ")";
            return "translate(" + 0 + "," + d.x + ")";
        })
        .on("click", this.click);

    nodeGroup.append("svg:circle")
        .attr("class", function(d)
        {
             var r = "tip-dot"
            if(d.c && d.c.length > 0) {
                r = "inode-dot";
            }
            if(d.selected) {
                r = r + " selected";
            } 
            return r;
        })
        .attr("r", function(d)
        {
            var r = _self.options.tipNodeRadius;
            if(d.c && d.c.length > 0) {
                r = _self.options.iNodeRadius;;
            }
            return r;
        },_self)
        .on("mouseover", this.hover)
        .on("mouseout", this.mouseout)
        ;

    var anchors = nodeGroup.append("svg:text")
        .attr("width", function(d){
            var r = d.n.length * _self.options.fontSize + 10;
            return r;
        })
        .attr("height", this.heightPerLeaf*2)
        .attr("x", function(d)
        {
            var r = 4 * _self.options.tipNodeRadius;
            if(d.c && d.c.length > 0) {
                r = -4 * _self.options.iNodeRadius;;
            }
            r = 5;
            return r;
        })
        .attr("y", function(d)
        {
            var r = 10;
            if(d.c && d.c.length > 0) {
                r= -2;
            }
            r = 0;
            r = +(_self.heightPerLeaf/4);
            return r;
        })
        .append("svg:a")
        .attr("xlink:href", function(d){
            var r = "";
            if(!d.c || d.c.length == 0) {
                r = _self.tipLinkPrefix + d.n + _self.tipLinkSuffix + "'>";
            }
            return r;
        });

    var fullLabels = anchors
        .append("svg:tspan")
        .text(function(d) {
            var r = "";
            if(!d.c || d.c.length == 0)
            {
                if(d.selected) {
                    r += "&#10003 ";
                }
            }
            return r;
        })
        .attr("class", function(d){
            var r = "";
            if(d.selected) {
                r = "selected";
            }
        })
    ;

    fullLabels
        .append("svg:tspan")
        .style("fill", function(d){
            var prefixColor = "#000000";
            return prefixColor;
        })
        .text(function(d){
            var r = "";
            if(d.prefix) {
                r += d.prefix + " ";
            }
            return r;
        })
        ;

    fullLabels
        .append("svg:tspan")
        .style("fill", function(d){
            var r = "";
            var colorKey = d.genus + " " + d.species;
            if(_self.tipToColors[colorKey]) {
                r = _self.tipToColors[colorKey][0];
            }            
            return r;
        })
        .text(function(d){
            var r = "";
            if(d.genus) {
                r = d.genus + " ";
            }
            return r;
        })
        ;

    fullLabels
        .append("svg:tspan")
        .style("fill", function(d){
            var r = "";
            var colorKey = d.genus + " " + d.species;
            if(_self.tipToColors[colorKey]) {
                r = _self.tipToColors[colorKey][1];
            }
            return r;
        })
        .text(function(d){
            var r = "";
            if(d.species_strain) {
                r = d.species_strain;
            }
            return r;
        })
        ;

    //add support value labels
    nodeGroup.append("svg:text")
        .attr("class", function(d)
        {
            var r = "";
            if(d.c && d.c.length > 0) {
                 r="support_label";
            }
            return r;
        })
        .attr("text-anchor", function(d)
        {
            var r = d.c ? "end" : "start";
            return r;
        })
        .attr("dx", function(d)
        {
            var r = 4 * _self.options.tipNodeRadius;
            if(d.c && d.c.length > 0) {
                r = -4 * _self.options.iNodeRadius;
            }
            return r;
        })
        .attr("dy", function(d)
        {
            var r = 3;
            if(d.c && d.c.length > 0) {
                r= -2;
            }
            return r;
        })
        .text(function(d)
        {
            var r = "";
            if(d.c && d.c.length > 0) {
                r = "";
                if(d.s && d.s < _self.options.supportCutoff) {
                    r = d.s;
                }
            }
            return r;
        });


    },
    getRGBRainbow: function(n, offset) {
                var r;
                var rainbowLength;
                var fullRainbow = new Array();
                fullRainbow[0] = [255,0,0];   
                fullRainbow[1] = [255,51,0];
                fullRainbow[2] = [255,102,0];
                fullRainbow[3] = [255,153,0];
                fullRainbow[4] = [0,150,0];  
                fullRainbow[5] = [0,100,100];
                fullRainbow[6] = [0,255,102];
                fullRainbow[7] = [0,255,153];
                fullRainbow[8] = [0,153,255];
                fullRainbow[9] = [1,102,255];
                fullRainbow[10] = [0,51,255];
                fullRainbow[11] = [0,0,255]; 
                fullRainbow[12] = [51,0,255];
                fullRainbow[13] = [102,0,255];
                fullRainbow[14] = [153,0,255];
                fullRainbow[15] = [204,0,255];
                fullRainbow[16] = [210,0,210];
                fullRainbow[17] = [255,0,204];
                fullRainbow[18] = [255,0,153];
                fullRainbow[19] = [255,0,102];
                fullRainbow[20] = [255,0,51]; 
                
                rainbowLength = fullRainbow.length;
                var spacing = Math.floor(rainbowLength / (n));
                spacing = Math.max(spacing, 1);
                var subRainbow = new Array();  
                for(var i = 0; i < n; i++) { 
                        var index = spacing * i;
                        index = (index + offset) % rainbowLength;
                        subRainbow[i] = fullRainbow[index];
                }
                 
                //populate return array with non-adjacent entries from subRainbow
                r = new Array();
                var subLength = subRainbow.length;
                var desiredDistance = Math.ceil(subLength/3);
                var indexUsed = new Array();  
                var index = 0;
                for(var i = 0; i < subLength; i++) {
                        while(indexUsed[index]) {
                                index++;
                        }
                        r[i] = subRainbow[index];
                        indexUsed[index] = true;
                        index = (index + desiredDistance) % subLength;
                }
                
                return r;
        },

        getGenusSpeciesSets: function(minToInclude) {
                var genusSets = new Array();
                var genusToSpecies = new Array();
                var genusToSpeciesSeen = new Array();
                var speciesSets = new Array();
                var uniqueList = new Array();
                              
                var tipList = phylotree.getTipLabels();
                        //console.log("tips: " + tipList.length);
	                for(var i = tipList.length-1; i >=0; i--) {
                        var genusIndex = 0;
                        //tipList[i] = tipList[i].replace(/_/g, " ");
                        //console.log(tipList[i]);
                        var fields = tipList[i].split(" "); 
                        if(fields[0] == "Candidatus") {
                            genusIndex++;
                        }
                        var genus = fields[genusIndex];
                        var species = genus;
                        if(fields.length > 1) {  
                                species = fields[genusIndex]+" "+fields[genusIndex+1];
                        }
                         
                        if(genusSets[genus] == undefined) {
                                uniqueList.push(genus);
                                genusSets[genus] = new Array();
                                genusSets[genus].push(tipList[i]);
                                genusToSpecies[genus] = new Array();
                                genusToSpeciesSeen[genus] = new Array();
                                genusToSpecies[genus].push(species);
                                genusToSpeciesSeen[genus][species] = 1;
                        } else {
                                genusSets[genus].push(tipList[i]);
                                if(genusToSpeciesSeen[genus][species] == undefined) {
                                        genusToSpecies[genus].push(species);
                                        genusToSpeciesSeen[genus][species] = 1;
                                } else {
                                        genusToSpeciesSeen[genus][species]++;
                                }
                        }
                }
                
                //sort genera by occurrence
                function sortGeneraFunc(a, b) {
                        var r = genusSets[b].length - genusSets[a].length;
                        return r;
                }
                uniqueList = uniqueList.sort(sortGeneraFunc);
                
                //remove any genera that don't occur the required number of times
                for(var i = uniqueList.length-1; i >= 0; i--) {
                        if(genusSets[uniqueList[i]].length < minToInclude) {
                                uniqueList.splice(i, 1);
                        } else {
                                //sort species within genus by occurrence
                                //sort species by occurrence
                                function sortSpeciesFunc(a, b) {
                                        var r = genusToSpeciesSeen[uniqueList[i]][b] - genusToSpeciesSeen[uniqueList[i]][a];
                                        return r;
                                }
                                genusToSpecies[uniqueList[i]] = genusToSpecies[uniqueList[i]].sort(sortSpeciesFunc);
                        }
                }
                
                return [uniqueList, genusToSpecies];
        },
                

        getTipColors: function(colorGenus, colorSpecies) {
                var colorTips = colorGenus | colorSpecies;
                var genusSets = this.getGenusSpeciesSets(2);
                var commonGenera = genusSets[0];
                var genusToSpecies = genusSets[1];
                 
                var rainbow = this.getRGBRainbow(commonGenera.length, 21);
                var speciesToColor = new Array();
                 
                var length = Math.min(commonGenera.length, rainbow.length);
        
                if(colorTips) {
                        for(var i = 0; i < length; i++ ) {
                                var genusColor =
                                        this.getColorHex(rainbow[i][0], rainbow[i][1], rainbow[i][2]);
                                var speciesInGenus = genusToSpecies[commonGenera[i]];
                                var speciesRainbow = this.getRGBRainbow(speciesInGenus.length+1, 16);
                                var sLength = speciesInGenus.length;
                                var sColorIndex = 0;
                                for(var j = 0; j < sLength; j++) {
                                        var speciesColor =
                                                this.getColorHex(speciesRainbow[sColorIndex][0],
                                                                speciesRainbow[sColorIndex][1], speciesRainbow[sColorIndex][2]);
                                        if(speciesColor == genusColor) {
                                                sColorIndex++;
                                                speciesColor =
                                                        this.getColorHex(speciesRainbow[sColorIndex][0],
                                                                        speciesRainbow[sColorIndex][1], speciesRainbow[sColorIndex][2]);
                                        }
                                        sColorIndex++;
                                        if(colorSpecies) {
                                            speciesToColor[speciesInGenus[j]] = [genusColor, speciesColor];
                                        } else if(colorGenus) {
                                            speciesToColor[speciesInGenus[j]] = [genusColor, genusColor];
                                        }
                                }
                        }
                } else {   
                        for(var i = 0; i < length; i++ ) {
                                var speciesInGenus = genusToSpecies[commonGenera[i]];
                                var genusColor = this.getColorHex(rainbow[i][0], rainbow[i][1], rainbow[i][2]);
                                var sLength = speciesInGenus.length;
                                for(var j = 0; j < sLength; j++) {
                                        speciesToColor[speciesInGenus[j]] = genusColor;
                                }
                        }

                }

                var tipLabels = phylotree.getTipLabels();
                for(var i = tipLabels.length-1; i >= 0; i--) {
                        var fields = tipLabels[i].split("_");
                        if(fields.length > 1) {
                                var species = fields[0]+"_"+fields[1];
                                var speciesColor = speciesToColor[species];
                                if(speciesColor != undefined) {
                                        this.setLabelColor(tipLabels[i], speciesColor);
                                }
                        }
                }
             return speciesToColor;
        },

        /**
         * Converts integer R, G, and B values to hex color strings.
         */
        getColorHex : function(r, g, b) {
            var hexCodes = ["0","1","2","3","4","5","6","7","8","9","A","B","C","D",
                        "E","F"];
                //get values for r
                var r1 = Math.floor(r/16)%16;
                var r2 = r % 16;
                                 
                //get values for g
                var g2 = g % 16;
                var g1 = Math.floor(g/16) %16;
         
                //get values for b
                var b2 = b % 16;
                var b1 = Math.floor(b/16) %16;
                
                //assemble the hex string
                var hex = "#" + hexCodes[r1] + hexCodes[r2] +
                hexCodes[g1] + hexCodes[g2] +
                hexCodes[b1] + hexCodes[b2];
                return hex;
        }
                
    });
});


