define([], function () {

  var pathogenDomains = ['Bacteria', 'Archaea'];

  this.createInteractorCyEle = function (d, ab) {
    return {
      data: {
        id: d['interactor_' + ab],
        interactor_type: d['interactor_type_' + ab],
        interactor_desc: d['interactor_desc_' + ab],
        feature_id: d['feature_id_' + ab],
        gene: d['gene_' + ab],
        genome: d['genome_name_' + ab],
        refseq_locus_tag: d['refseq_locus_tag_' + ab]
      },
      classes: (pathogenDomains.indexOf(d['domain_' + ab]) > -1 ? '' : 'host'),
      selectable: true
    };
  };

  this.getUniqueRootNodes = function (cy) {
    var candidateNodes = cy.nodes().leaves();
    var rootNodes = [];

    console.time('getUniqueRootNodes');
    for (var ti = 0; ti < candidateNodes.length; ti++) {
      var candidate = candidateNodes[ti];
      // console.log("Candidate: ", candidate.data('name'));

      var graph = cy.elements().dijkstra({
        root: candidate,
        directed: false
      });

      var check = cy.collection(rootNodes).every(function (ele, i) {
        // console.log(i, "distance to ", ele.data('name'), ": ", graph.distanceTo(ele));
        return graph.distanceTo(ele) == Infinity;
      });

      if (check) {
        rootNodes.push(candidate);
        // console.log("added to rootNodes: ", rootNodes.length);
      }
    }
    console.timeEnd('getUniqueRootNodes');

    return rootNodes;
  };

  this.getUniqueRootNodes2 = function (cy) {
    var candidateNodes = cy.nodes().roots();
    var rootNodes = cy.nodes().roots();

    console.time('getUniqueRootNodes');
    var allElements = cy.elements();
    for (var i = 0; i < candidateNodes.length; i++) {
      for (var j = i + 1; j < candidateNodes.length; j++) {
        var found = allElements.aStar({ root: candidateNodes[i], goal: candidateNodes[j] }).found;
        console.log(i, j, found);
        if (found) {
          rootNodes = rootNodes.difference(candidateNodes[i]);
          break;
        }
      }
    }
    console.timeEnd('getUniqueRootNodes');

    return rootNodes;
  };

  this.getSubGraphs = function (cy, minSize) {
    var boolGetLargestMode = false;
    var selectedEles = {};
    var rootNodes = this.getUniqueRootNodes(cy);

    if (typeof (minSize) == 'undefined' || minSize == 'max') {
      boolGetLargestMode = true;
      minSize = 0;
    }

    console.time('selectSubGraphs');
    rootNodes.forEach(function (node) {
      var visitedArr = [];
      var nodeCount = 0;
      cy.elements().bfs({
        roots: node,
        visit: function (v, e, u, i, depth) {
          visitedArr.push(v);
          v.connectedEdges().forEach(function (e) {
            visitedArr.push(e);
          });
          nodeCount++;
        },
        directed: false
      });

      // console.log(i, rootNodes[i].data('name'), visitedArr.length, nodeCount);
      if (nodeCount > minSize) {
        selectedEles[node.data('id')] = { count: nodeCount, subElements: visitedArr };

        if (boolGetLargestMode) {
          minSize = nodeCount;
        }
      }
    });
    console.timeEnd('selectSubGraphs');

    if (boolGetLargestMode) {
      return Object.keys(selectedEles).filter(function (key) {
        return selectedEles[key].count >= minSize;
      }).map(function (key) {
        return selectedEles[key].subElements;
      }).reduce(function (a, b) {
        return a.concat(b);
      });
    }
    return Object.keys(selectedEles).map(function (key) {
      return selectedEles[key].subElements;
    }).reduce(function (a, b) {
      return a.concat(b);
    });

  };

  this.getHubs = function (cy, minSize) {
    var boolGetLargestMode = false;
    var selectedEles = {};

    if (typeof (minSize) == 'undefined' || minSize == 'max') {
      boolGetLargestMode = true;
      minSize = 0;
    }

    console.time('selectHubs');
    cy.nodes().forEach(function (node) {
      // console.log(node.data('name'), node.connectedEdges().length);
      if (node.connectedEdges().length >= minSize) {
        var connectedNodes = {};
        node.connectedEdges().forEach(function (edge) {
          if (node.same(edge.source())) {
            if (!Object.prototype.hasOwnProperty.call(connectedNodes, edge.target().data('id'))) {
              connectedNodes[edge.target().data('id')] = true;
            }
          } else if (node.same(edge.target())) {
            if (!Object.prototype.hasOwnProperty.call(connectedNodes, edge.source().data('id'))) {
              connectedNodes[edge.source().data('id')] = true;
            }
          }
        });
        // console.log(connectedNodes);
        var nodeCount = Object.keys(connectedNodes).length;

        if (nodeCount >= minSize) {
          // selectedHubs.push(node);
          selectedEles[node.data('id')] = nodeCount;

          if (boolGetLargestMode) {
            minSize = nodeCount; // to reduce the size of largestNodes collection
          }
        }
      }
    });
    console.timeEnd('selectHubs');

    if (boolGetLargestMode) {
      return Object.keys(selectedEles).filter(function (key) {
        return (selectedEles[key] >= minSize);
      }).map(function (key) {
        return cy.getElementById(key);
      });
    }
    return Object.keys(selectedEles).map(function (key) {
      return cy.getElementById(key);
    });

  };

  return this;
});
