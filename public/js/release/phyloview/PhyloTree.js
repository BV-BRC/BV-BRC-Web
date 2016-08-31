// wrapped by build app
define("phyloview/PhyloTree", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
window.PhyloTree = {

    PhyloTree: function(treeString) {
        //console.log("new PhyloTree for: " + treeString);
        var leafCount = 0;
        var jsonTree;
        if(treeString[0] == "(" ){
            console.log("tree looks like newick");
            jsonTree = newickToJSON(treeString);
        } else {
            jsonTree = eval("("+treeString+")");
            finalizeTree(jsonTree);
        }

        this.getJSONTree = function() {
            return jsonTree;
        }

        this.getLeafCount = function() {
            return leafCount;
        }

        this.getTipCount = function() {

        }

        this.getTipLabels = function() {
            var tipLabels = new Array();
            visit(this.getJSONTree(), function(node) { 
                if(!node.c || node.c.length == 0) {
                    tipLabels.push(node.n);
                }
            });
            return tipLabels;
        }

        function visit(parent, visitFn, childrenFn) {
            if (!parent) return;
  
            visitFn(parent);
 
            var children = childrenFn ? childrenFn(parent) : parent.c;
            if (children) {
                var count = children.length;
                for (var i = 0; i < count; i++) {
                    visit(children[i], visitFn, childrenFn);
                }
            }
        }

        function newickToJSON_biojs (s) {
            var ancestors = [];
            var tree = {};
            var tokens = s.split(/\s*(;|\(|\)|,|:)\s*/);
            for (var i=0; i<tokens.length; i++) {
                var token = tokens[i];
                switch (token) {
                    case '(': // new children
                        var subtree = {};
                        tree.c = [subtree];
                        ancestors.push(tree);
                        tree = subtree;
                        break;
                    case ',': // another branch
                        var subtree = {};
                        ancestors[ancestors.length-1].c.push(subtree);
                        tree = subtree;
                        break;
                    case ')': // optional name next
                        tree = ancestors.pop();
                        break;
                    case ':': // optional length next
                        break;
                    default:
                        var x = tokens[i-1];
                        if (x == ')' || x == '(' || x == ',') {
                            tree.s = parseInt(token);
                        } else if (x == ':') {
                            tree.l = parseFloat(token);
                        }
                }
            }
            finalizeTree(tree);
            return tree;
        }

        function newickToJSON(nwk) {
            var commaProtect = "&&";
            nwk=nwk.trim();
            if(nwk.substr(-1) != ";"){
                nwk=nwk+";";
            }
            nwk = nwk.replace(/;/, "}")
                .replace(/\=/g,"")
                .replace(/\'/g,"")
                .replace(/\#/g,"")
                .replace(/\)$/g, "}]}")
                .replace(/,([\w+\|\.\/-]+)/g, ",\"n\":\"$1\"")
                .replace(/\(([\w+\|\.\/-]+)/g, "\(\"n\":\"$1\"")
                .replace(/^\(/, "{\"c\":[{")
                .replace(/:([-+]?[0-9]*\.?[0-9]+)/g, commaProtect + "\"l\":$1")
                .replace(/\)(\d*)/g, ")" + commaProtect + "\"s\":$1")
                .replace(/&&\"s\":&&/g, "&&\"s\":0&&")
                .replace(/\(/g, "\"c\":[{")
                .replace(/\)/g, "}]")
                .replace(/,/g, "},{")
                .replace(/\"s\":\}/,"\"s\":0}")
                .replace(/&&/g, ",");
    //            .replace(/^\{\"c\"\:\[\{([\w+\.\/-]+)/,"{\"c\":[{\"n\":\"$1\"");
            console.log("tree json string: " + nwk);
            var r = JSON.parse(nwk);
            r.labels=[{}]; //list of objects that map node id to label
            finalizeTree(r);
            return r;
        }

        function setInternalNodeYs(node) {
            var r = 0;
            if(node.c) {
                var childYSum = 0;
                node.c.forEach(function(child){
                    childYSum += setInternalNodeYs(child)
                });
                r = childYSum / node.c.length;
                node.py = r;
            } else {
                r = node.py;
            }

            return r;
        }

        function setNodeMaxStepsToTip(node) {
            var r = 0;
            if(node.c) {
                var maxChildSteps = 0;
                node.c.forEach(function(child){
                    maxChildSteps = Math.max(maxChildSteps, setNodeMaxStepsToTip(child));
                });
                r = maxChildSteps +1;
                node.cx = r;
            } else {
                r = 0;
                node.cx = 0;
            }

            return r;
        }

        function countNodeDescendants(node) {
            var r = 0;
            if(node.c) {
                node.c.forEach(function(child){
                    r += countNodeDescendants(child)
                });
                node.d = r;
            } else {
                r = 1;
                node.d = 0;
            }

            return r;
        }

        function finalizeTree(tree){
            var tipIndex = 0;
            countNodeDescendants(tree);
            var nodeId = 0;
            tree.px = 0;
            visit(tree,                                                                                               
                function(node){
                    var tmp_label=[];
                    if(!node.c && node.n) {
                        //try to parse out the genus and species name
                        node.id = node.n;
                        node.n = node.n.replace(/_/g, " ");
                    } else {
                        node.id="inode"+nodeId;
                        node.n = ""+nodeId;
                    }
                    if(node.c) {
                        node.c.forEach(function(child){
                            child.parent = node;
                            if(child.l || child.l == 0) {
                                child.px = node.px + child.l + .02;
                            }
                        });

                        node.c.sort(function(a,b){
                            return b.d - a.d;
                        });                        
                    } else {
                        node.label = node.n;
                        tree.labels[0][node.id]=node.label;
                        leafCount++;
                        node.ti = tipIndex++;
                        node.py = node.ti;
                    }
                    nodeId++;
                },

                function(node){
                    var r = node.c ? node.c : null;
                    return r;
                 });
            setInternalNodeYs(tree);
            setNodeMaxStepsToTip(tree);
        }

    }


}


});
