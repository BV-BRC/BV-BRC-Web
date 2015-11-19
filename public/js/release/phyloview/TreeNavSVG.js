// wrapped by build app
define("phyloview/TreeNavSVG", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
window.d3Tree = {
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
    d3Tree: function(containerName, customOptions)
{
    // build the options object
     var options = dojo.mixin({
        iNodeRadius: 3, tipNodeRadius: 3, fontSize: 12, phylogram:true, supportCutoff:100,
    }, customOptions);

    // Calculate total nodes, max label length
    var totalNodes = 0;
    var maxLabelLength = 0;
    var maxNodeDistanceToRoot = 0;
    var maxNodeDepth = 0;
    var leafCount = 0;
    var heightPerLeaf = options.fontSize + 2;
    var topMargin = 20;
    var colorSpecies = customOptions.colorSpecies;
    var colorGenus = customOptions.colorGenus;
    var tipLinkPrefix = "http://www.google.com/search?q=";
    var tipLinkSuffix = "";
    var fontWidthForMargin = Math.max(options.fontSize*2/3, 9);
    var tipToColors;
    var treeData;
    var tree;
    var svgContainer; 

    console.log(options);
    console.log(colorSpecies + ", " + colorGenus);
    // size of the diagram
    var canvasHeight = leafCount * heightPerLeaf + topMargin;
    var size = { width:dojo.position(dojo.query(containerName)[0]).w, height: canvasHeight};
    
    this.setTree = function(treeString) { 
               phyloTree = new PhyloTree.PhyloTree(treeString);
        treeData = phyloTree.getJSONTree();

        leafCount = phyloTree.getLeafCount();
        maxNodeDepth = treeData.cx;
        d3Tree.visit(treeData, function(d)
        {
            totalNodes++;
            if(d.n) {
                maxLabelLength = Math.max(d.n.length, maxLabelLength);
            }
            var toRoot = d.px ? d.px : 0;
            maxNodeDistanceToRoot = Math.max(toRoot, maxNodeDistanceToRoot);
        }, function(d)
        {
            return d.c && d.c.length > 0 ? d.c : null;
        });
        canvasHeight = leafCount * heightPerLeaf + topMargin;
        size = { width:dojo.position(dojo.query(containerName)[0]).w, height: canvasHeight};

        tree = d3.layout.tree()
            .sort(null)
            .size([size.height, size.width - maxLabelLength*fontWidthForMargin])
            .children(function(d)
            {
                return (!d.c || d.c.length === 0) ? null : d.c;
            });

        tipToColors  = getTipColors(colorGenus, colorSpecies);

    /*
        <svg>
            <g class="container" />
        </svg>
     */
        svgContainer = d3.select(containerName)
        .html("")
        .append("svg:svg").attr("width", size.width).attr("height", size.height)
        .append("svg:g")
        .attr("class", "container")
        .attr("transform", "translate(" + maxLabelLength + ",0)")
        ;

        init();
        update();
    }

    this.getDataURL = function() {
        var svgs = d3.select("svg")
            .attr("version", 1.1)
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .node().parentNode.innerHTML;
        return svgs;
    }

    this.setPhylogram = function(p) {
        options.phylogram = p;
        update();
    }

    this.setSupportValueCutoff = function(sv) {
        options.supportCutoff = sv;
        update();
    }

    this.getSelectedItems = function() {
        var selected = new Array();
            tree.nodes(treeData).forEach(function(d){
            if(d.selected && !d.c) {
                selected.push(d);
            }
        });
        return selected;
    }

    function clearSelections() {
        tree.nodes(treeData).forEach(function(d){
            d.selected = false;
        });
    }

    var startingBranch = function(d){
        var source = d.source;;
        var target = d.target;

        var r = "M0," + source.x
               + "C0," + target.x 
               + ",0," + target.x 
               + ",0," + target.x;
        return r;
    };

    var curvedBranch = function (d){
        var source = d.source;;
        var target = d.target;
        var r = "M" + source.y + "," + source.x
               + "L" + source.y + "," + target.x 
               + "," + source.y + "," + target.x 
               + "," + target.y + "," + target.x;
        return r;
    };

    var squareBranch = function (d){
        var source = d.source;;
        var target = d.target;
        var r = "M" + source.y + "," + source.x
               + "L" + source.y + "," + target.x 
               + "," + source.y + "," + target.x 
               + "," + target.y + "," + target.x;
        return r;
    };

    var branch = squareBranch;

    function getDescendants(d) {
        var descendants = new Array();
        if(d.c) {
            for(var i = d.c.length-1; i >=0; i--) {
                getDescendants(d.c[i]).forEach(function(d){descendants.push(d);});;
            }
        } else {
            descendants.push(d);
        }
        return descendants;
    }

    function hover(d) {
        d = d.target ? d.target : d;
        d3Tree.visit(d, function(d){
            d.hover = true;
        });

        update();
    }

    function mouseout(d) {
        d = d.target ? d.target : d;
        d3Tree.visit(d, function(d){
            d.hover = false;
        });
        update();
    }

    function click(d) {
        if(!d.n) {
            //click was on a branch, not a node, so get the target node for the branch and
            //treat it as though that node was clicked
            d = d.target;
        }
        var toggleTo = !d.selected;
        var mouseEvent = d3.event;
        var keepSelections = mouseEvent.ctrlKey || mouseEvent.metaKey;
        if(!keepSelections) {
            clearSelections();
        }
        d3Tree.visit(d, function(d){
            d.selected = toggleTo;
        });
        update();
    }

    function update() {
       //console.log("update()");
        var nodes = tree.nodes(treeData);
        var links = tree.links(nodes);
        var treeWidth = size.width - maxLabelLength*(fontWidthForMargin);
 
        //adjust y values (because x and y are reversed) for nodes based on the branch lengths
        for(var i = nodes.length-1; i >=0; i--) {
            var d = nodes[i];
            var toRoot = d.px ? d.px : 0;
            //console.log("toRoot: " + toRoot);
            if(options.phylogram) {
                d.y = treeWidth * toRoot / maxNodeDistanceToRoot; //for phylogram
            } else {
                d.y = treeWidth * (maxNodeDepth - d.cx) / maxNodeDepth; //for cladogram
            }
            d.x = d.py*heightPerLeaf + topMargin;
        }

    var nodeGroup = svgContainer.selectAll("g.node");
    nodeGroup.selectAll("text").remove();
    var anchors = nodeGroup.append("svg:text")
        .attr("width", function(d){
            var r = d.n.length * options.fontSize + 10;
            return r;
        })
        .attr("height", heightPerLeaf*2)
        .attr("x", function(d)
        {
            var r = 4 * options.tipNodeRadius;
            if(d.c && d.c.length > 0) {
                r = -4 * options.iNodeRadius;;
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
            r = +(heightPerLeaf/4);
            return r;
        })
        .append("svg:a")
        .attr("xlink:href", function(d){
            var r = "";
            if(!d.c || d.children.length == 0) {
                r = tipLinkPrefix + d.n + tipLinkSuffix;
            }
            return r;
        });

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
            if(tipToColors[colorKey]) {
                r = tipToColors[colorKey][0];
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
            if(tipToColors[colorKey]) {
                r = tipToColors[colorKey][1];
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

        nodeGroup
            .transition()
            .duration(1200)
            .attr("transform", function(d)
            {
                return "translate(" + d.y + "," + d.x + ")";
            })
            ;

        svgContainer.selectAll("path.link")
            .transition()
            .duration(1200)
            .attr("d", branch)
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
            var r = 4 * options.tipNodeRadius;
            if(d.c && d.c.length > 0) {
                r = -4 * options.iNodeRadius;
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
                if(d.s && d.s < options.supportCutoff) {
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
    }


    function init() {
        //console.log("init()");
        var nodes = tree.nodes(treeData);
        var links = tree.links(nodes);

        var treeWidth = size.width - maxLabelLength*(fontWidthForMargin);

    //adjust y values (because x and y are reversed) for nodes based on the branch lengths
    for(var i = nodes.length-1; i >=0; i--) {
        var d = nodes[i];
        var toRoot = d.px ? d.px : 0;
        if(options.phylogram) {
            d.y = treeWidth * toRoot / maxNodeDistanceToRoot; //for phylogram
        } else {
            d.y = treeWidth * (maxNodeDepth - d.cx) / maxNodeDepth; //for cladogram
            //console.log("cladogram d.cx: " + d.cx + " d.y: " + d.y);
        }

        d.x = d.py*heightPerLeaf + topMargin;
        //console.log("d.x: " + d.x + " d.y: " + d.y);
    }

    var pathLinks = svgContainer.selectAll("path.link")
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
        .on("click", click)
        .on("mouseover", hover)
        .on("mouseout", mouseout)
        .attr("d", startingBranch)
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
        .on("click", click)
        .on("mouseover", hover)
        .on("mouseout", mouseout)
        .attr("d", startingBranch)
        ;

    /*
        Nodes as
        <g class="node">
            <circle class="node-dot" />
            <text />
        </g>
     */
    var nodeGroup = svgContainer.selectAll("g.node")
        .data(nodes)
        .enter()
        .append("svg:g")
        .attr("class", function(d){
            var r = "node";
            if(d.selected) {
                r = r + " selected";
            }
            return r;
        })
        .attr("transform", function(d)
        {
            //return "translate(" + d.y + "," + d.x + ")";
            return "translate(" + 0 + "," + d.x + ")";
        })
        .on("click", click);

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
            var r = options.tipNodeRadius;
            if(d.c && d.c.length > 0) {
                r = options.iNodeRadius;;
            }
            return r;
        })
        .on("mouseover", hover)
        .on("mouseout", mouseout)
        ;

    var anchors = nodeGroup.append("svg:text")
        .attr("width", function(d){
            var r = d.n.length * options.fontSize + 10;
            return r;
        })
        .attr("height", heightPerLeaf*2)
        .attr("x", function(d)
        {
            var r = 4 * options.tipNodeRadius;
            if(d.c && d.c.length > 0) {
                r = -4 * options.iNodeRadius;;
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
            r = +(heightPerLeaf/4);
            return r;
        })
        .append("svg:a")
        .attr("xlink:href", function(d){
            var r = "";
            if(!d.c || d.c.length == 0) {
                r = tipLinkPrefix + d.n + tipLinkSuffix + "'>";
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
            if(tipToColors[colorKey]) {
                r = tipToColors[colorKey][0];
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
            if(tipToColors[colorKey]) {
                r = tipToColors[colorKey][1];
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
            var r = 4 * options.tipNodeRadius;
            if(d.c && d.c.length > 0) {
                r = -4 * options.iNodeRadius;
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
                if(d.s && d.s < options.supportCutoff) {
                    r = d.s;
                }
            }
            return r;
        });


}
}
}

        function getRGBRainbow(n, offset) {
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
        }

        function getGenusSpeciesSets(minToInclude) {
                var genusSets = new Array();
                var genusToSpecies = new Array();
                var genusToSpeciesSeen = new Array();
                var speciesSets = new Array();
                var uniqueList = new Array();
                              
                var tipList = phyloTree.getTipLabels();
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
        }
                

        function getTipColors(colorGenus, colorSpecies) {
                var colorTips = colorGenus | colorSpecies;
                var genusSets = getGenusSpeciesSets(2);
                var commonGenera = genusSets[0];
                var genusToSpecies = genusSets[1];
                 
                var rainbow = getRGBRainbow(commonGenera.length, 21);
                var speciesToColor = new Array();
                 
                var length = Math.min(commonGenera.length, rainbow.length);
        
                if(colorTips) {
                        for(var i = 0; i < length; i++ ) {
                                var genusColor =
                                        getColorHex(rainbow[i][0], rainbow[i][1], rainbow[i][2]);
                                var speciesInGenus = genusToSpecies[commonGenera[i]];
                                var speciesRainbow = getRGBRainbow(speciesInGenus.length+1, 16);
                                var sLength = speciesInGenus.length;
                                var sColorIndex = 0;
                                for(var j = 0; j < sLength; j++) {
                                        var speciesColor =
                                                getColorHex(speciesRainbow[sColorIndex][0],
                                                                speciesRainbow[sColorIndex][1], speciesRainbow[sColorIndex][2]);
                                        if(speciesColor == genusColor) {
                                                sColorIndex++;
                                                speciesColor =
                                                        getColorHex(speciesRainbow[sColorIndex][0],
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
                                var genusColor = getColorHex(rainbow[i][0], rainbow[i][1], rainbow[i][2]);
                                var sLength = speciesInGenus.length;
                                for(var j = 0; j < sLength; j++) {
                                        speciesToColor[speciesInGenus[j]] = genusColor;
                                }
                        }

                }

                var tipLabels = phyloTree.getTipLabels();
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
        }

        /**
         * Converts integer R, G, and B values to hex color strings.
         */
        getColorHex = function(r, g, b) {
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
