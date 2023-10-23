define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dojo/topic',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  'dojo/_base/Deferred',
  'dojo/request', 'dojo/_base/lang', 'dojo/when', '../WorkspaceManager',
  'd3/d3', './Venn', 'dgrid/Grid', 'dgrid/extensions/ColumnResizer'
], function (
  declare, WidgetBase, on, Topic,
  domClass, ContentPane, domConstruct,
  fDeferred,
  xhr, lang, when, WorkspaceManager,
  d3, Venn, Grid, ColumnResizer
) {

  var groupCompare = null;
  var myURL = null;
  var myType = null;
  var ids = '';
  var regionName = null;
  var regionGroupName = null;
  var groups = [];
  var myPath = null;
  var id_array = [];

  function createRegionName(selectedRegions) {
    var max_mask = 0;
    var mask_array = [];
    var name_array = [];
    regionName = '';
    if (groups.length == 2) {
      max_mask = 3;
    } else if (groups.length == 3) {
      max_mask = 7;
    }

    for (var i = 0, ilen = max_mask; i < ilen; ++i) {
      mask_array[i] = 0;
      name_array[i] = '';
    }

    for (var i = 0, ilen = selectedRegions.length; i < ilen; ++i) {
      if (i == 0) {
        regionName = selectedRegions[i].region_name;
      } else {
        regionName = '(' + regionName + ') U (' + selectedRegions[i].region_name + ')';
      }
      mask_array[selectedRegions[i].region_mask - 1] = 1;
      name_array[selectedRegions[i].region_mask - 1] = selectedRegions[i].region_name;
      // console.log("i=" + i + " region_mask=" + selectedRegions[i].region_mask + " name=" +selectedRegions[i].region_name);
    }

    if (max_mask == 3) {
      if (mask_array[0] && mask_array[1] && mask_array[2]) {
        regionName = '(' + groups[0].name + ') U (' + groups[1].name + ')';
      } else if (mask_array[0] && mask_array[2]) {
        regionName = groups[0].name;
      } else if (mask_array[1] && mask_array[2]) {
        regionName = groups[1].name;
      }
    } else if (max_mask == 7) {
      var center_name = '(' + groups[0].name + ') + (' + groups[1].name + ') + (' + groups[2].name + ')';
      if (mask_array[0] && mask_array[1] && mask_array[2] && mask_array[3] && mask_array[4] && mask_array[5] && mask_array[6]) {
        regionName = '(' + groups[0].name + ') U (' + groups[1].name + ') U (' + groups[2].name + ')';
      } else if (mask_array[0] && mask_array[1] && mask_array[2] && mask_array[3] && mask_array[4] && mask_array[5] && mask_array[6] == 0) {
        regionName = '(' + groups[0].name + ') U (' + groups[1].name + ') U (' + groups[2].name + ') - (' + center_name + ')';
      } else if (mask_array[0] && mask_array[1] && mask_array[2] && mask_array[3] == 0 && mask_array[4] && mask_array[5] && mask_array[6]) {
        regionName = '(' + groups[0].name + ') U (' + groups[1].name + ')';
      } else if (mask_array[0] && mask_array[1] == 0 && mask_array[2] && mask_array[3] && mask_array[4] && mask_array[5] && mask_array[6]) {
        regionName = '(' + groups[0].name + ') U (' + groups[2].name + ')';
      } else if (mask_array[0] == 0 && mask_array[1] && mask_array[2] && mask_array[3] && mask_array[4] && mask_array[5] && mask_array[6]) {
        regionName = '(' + groups[1].name + ') U (' + groups[2].name + ')';
      } else if (mask_array[0] && mask_array[1] && mask_array[2] == 0 && mask_array[3] && mask_array[4] && mask_array[5] && mask_array[6]) {
        regionName = '(' + groups[2].name + ') U (' + name_array[0] + ') U (' + name_array[1] + ')';
      } else if (mask_array[0] && mask_array[1] == 0 && mask_array[2] == 0 && mask_array[3] && mask_array[4] && mask_array[5] && mask_array[6]) {
        regionName = '(' + groups[2].name + ') U (' + name_array[0] + ')';
      } else if (mask_array[0] == 0 && mask_array[1] && mask_array[2] == 0 && mask_array[3] && mask_array[4] && mask_array[5] && mask_array[6]) {
        regionName = '(' + groups[2].name + ') U (' + name_array[1] + ')';
      } else if (mask_array[0] == 0 && mask_array[1] == 0 && mask_array[2] && mask_array[3] && mask_array[4] && mask_array[5] && mask_array[6]) {
        regionName = '(' + groups[2].name + ') U (' + name_array[2] + ')';
      } else if (mask_array[0] == 0 && mask_array[1] == 0 && mask_array[2] == 0 && mask_array[3] && mask_array[4] && mask_array[5] && mask_array[6]) {
        regionName = groups[2].name;
      } else if (mask_array[0] && mask_array[1] && mask_array[2] && mask_array[3] && mask_array[4] == 0 && mask_array[5] && mask_array[6]) {
        regionName = '(' + groups[1].name + ') U (' + name_array[0] + ') U (' + name_array[3] + ')';
      } else if (mask_array[0] && mask_array[1] && mask_array[2] && mask_array[3] == 0 && mask_array[4] == 0 && mask_array[5] && mask_array[6]) {
        regionName = '(' + groups[1].name + ') U (' + name_array[0] + ')';
      } else if (mask_array[0] == 0 && mask_array[1] && mask_array[2] && mask_array[3] && mask_array[4] == 0 && mask_array[5] && mask_array[6]) {
        regionName = '(' + groups[1].name + ') U (' + name_array[3] + ')';
      } else if (mask_array[0] == 0 && mask_array[1] && mask_array[2] && mask_array[3] == 0 && mask_array[4] && mask_array[5] && mask_array[6]) {
        regionName = '(' + groups[1].name + ') U (' + name_array[4] + ')';
      } else if (mask_array[0] == 0 && mask_array[1] && mask_array[2] && mask_array[3] == 0 && mask_array[4] == 0 && mask_array[5] && mask_array[6]) {
        regionName = groups[1].name;
      } else if (mask_array[0] && mask_array[1] && mask_array[2] && mask_array[3] && mask_array[4] && mask_array[5] == 0 && mask_array[6]) {
        regionName = '(' + groups[0].name + ') U (' + name_array[1] + ') U (' + name_array[3] + ')';
      } else if (mask_array[0] && mask_array[1] && mask_array[2] && mask_array[3] == 0 && mask_array[4] && mask_array[5] == 0 && mask_array[6]) {
        regionName = '(' + groups[0].name + ') U (' + name_array[1] + ')';
      } else if (mask_array[0] && mask_array[1] == 0 && mask_array[2] && mask_array[3] && mask_array[4] && mask_array[5] == 0 && mask_array[6]) {
        regionName = '(' + groups[0].name + ') U (' + name_array[3] + ')';
      } else if (mask_array[0] && mask_array[1] == 0 && mask_array[2] && mask_array[3] == 0 && mask_array[4] && mask_array[5] && mask_array[6]) {
        regionName = '(' + groups[0].name + ') U (' + name_array[5] + ')';
      } else if (mask_array[0] && mask_array[1] == 0 && mask_array[2] && mask_array[3] == 0 && mask_array[4] && mask_array[5] == 0 && mask_array[6]) {
        regionName = groups[0].name;
      } else if (mask_array[0] && mask_array[1] && mask_array[2] && mask_array[3] == 0 && mask_array[4] == 0 && mask_array[5] == 0
        && mask_array[6] == 0) {
        regionName = '(' + groups[0].name + ') U (' + groups[1].name + ') - (' + groups[2].name + ')';
      } else if (mask_array[0] && mask_array[1] == 0 && mask_array[2] == 0 && mask_array[3] && mask_array[4] && mask_array[5] == 0
        && mask_array[6] == 0) {
        regionName = '(' + groups[0].name + ') U (' + groups[2].name + ') - (' + groups[1].name + ')';
      } else if (mask_array[0] == 0 && mask_array[1] && mask_array[2] == 0 && mask_array[3] && mask_array[4] == 0 && mask_array[5]
        && mask_array[6] == 0) {
        regionName = '(' + groups[1].name + ') U (' + groups[2].name + ') - (' + groups[0].name + ')';
      } else if (mask_array[0] && mask_array[1] && mask_array[2] == 0 && mask_array[3] && mask_array[4] && mask_array[5] && mask_array[6] == 0) {
        regionName = '(' + groups[0].name + ') U (' + groups[1].name + ') U (' + groups[2].name + ') - (' + center_name + ') - (('
          + groups[0].name + ') + (' + groups[1].name + ') - (' + groups[2].name + '))';
      } else if (mask_array[0] && mask_array[1] && mask_array[2] && mask_array[3] && mask_array[4] && mask_array[5] == 0 && mask_array[6] == 0) {
        regionName = '(' + groups[0].name + ') U (' + groups[1].name + ') U (' + groups[2].name + ') - (' + center_name + ') - (('
          + groups[1].name + ') + (' + groups[2].name + ') - (' + groups[0].name + '))';
      } else if (mask_array[0] && mask_array[1] && mask_array[2] && mask_array[3] && mask_array[4] == 0 && mask_array[5] && mask_array[6] == 0) {
        regionName = '(' + groups[0].name + ') U (' + groups[1].name + ') U (' + groups[2].name + ') - (' + center_name + ') - (('
          + groups[0].name + ') + (' + groups[2].name + ') - (' + groups[1].name + '))';
      }
    }
    return regionName;
  }

  var selectionListener = function () {
    var selected = groupCompare.getSelectedMembers();
    var regions = groupCompare.getSelectedRegions();

    if (regions.length == 0) {
      d3.selectAll('#gse-members-tbl').remove();
      regionName = '';
      regionGroupName = '';
    } else if (selected) {
      ids = '';
      id_array = [];

      d3.selectAll('#gse-members-tbl').remove();
      regionName = createRegionName(regions);
      regionGroupName = regionName.replace(/\) - \(/g, '| not |').replace(/\) U \(/g, '| or |').replace(/\) \+ \(/g, '| and |').replace(/\(/g, '|')
        .replace(/\)/g, '|');

      var memberArea = d3.select('#gse-members');
      var memberTable = memberArea.append('div').attr('id', 'gse-members-tbl').attr('style', 'overflow-y:scroll');
      memberTable.append('div').text('Region: ' + regionGroupName).attr('style', 'font-weight: bold');
      memberTable.append('div').attr('id', 'gse-members-grid');

      console.log('in selectionListener, selected', selected);
      console.log('in selectionListener, region', regions);

      if (selected.length > 0) {
        var dataArray = [];
        var url = '';
        document.getElementById('create_msg').innerHTML = '<b>Please select one or more regions to view members.</b>';
        document.getElementById('create_msg').style = 'color: black';

        for (var i = 0, ilen = selected.length; i < ilen; ++i) {
          id_array.push(selected[i]);
          if (i == 0) {
            ids = selected[i];
          } else {
            ids += ',' + selected[i];
          }
        }

        console.log('in selectionListener, id_array', id_array);

        if (myType === 'genome_group') {
          // genome name, status, country, host, disease, collection date, completion date
          url = window.App.dataServiceURL + '/genome/';
          var q = 'in(genome_id,(' + ids + '))&select(genome_id,genome_name,genome_status,isolation_country,host_name,disease,collection_date,complete_date)&sort(+genome_name)&limit(25000)';
          console.log('url: ', url);
          // url = window.App.dataServiceURL + "/genome/?limit(25000)&http_accept=application/json&select(genome_id,genome_name,genome_status,isolation_country,host_name,disease,collection_date,complete_date)&in(genome_id,(" +
          //  ids + "))&sort(+genome_name)";
          // console.log("url: ", url);
          xhr.post(url, {
            data: q,
            headers: {
              accept: 'application/solr+json',
              'content-type': 'application/rqlquery+x-www-form-urlencoded',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            handleAs: 'json'
          }).then(function (res) {
            console.log(' URL: ', url);
            console.log('Get GenomeList genomes: ', res);
            dataArray = res.response.docs;

            var grid = new Grid({
              columns: {
                genome_name: 'Genome Name',
                genome_status: 'Status',
                isolation_country: 'Isolation Country',
                host_name: 'Host Name',
                disease: 'disease',
                collection_date: 'Collection Date',
                complete_date: 'Complete Date'
              }
            }, 'gse-members-grid');
            grid.renderArray(dataArray);
            grid.resize();
          }, function (err) {
            console.log('Error Retreiving Genomes: ', err);
          });
        }
        else if (myType === 'feature_group') {
          url = window.App.dataServiceURL + '/genome_feature/';
          var q = 'in(feature_id,(' + ids + '))&select(genome_name,patric_id,refseq_locus_tag,alt_locus_tag,gene,product)&sort(+patric_id)&limit(25000)';

          xhr.post(url, {
            data: q,
            headers: {
              accept: 'application/solr+json',
              'content-type': 'application/rqlquery+x-www-form-urlencoded',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            handleAs: 'json'
          }).then(function (res) {
            console.log(' URL: ', url);
            console.log('Get feature list: ', res);
            dataArray = res.response.docs;

            var grid = new Grid({
              columns: {
                genome_name: 'Genome Name',
                patric_id: 'BRC ID',
                refseq_locus_tag: 'Refseq Locus Tag',
                gene: 'Gene',
                product: 'Product'
              }
            }, 'gse-members-grid');
            grid.renderArray(dataArray);
          }, function (err) {
            console.log('Error Retreiving Genomes: ', err);
          });
        }
        else if (myType === 'experiment_group') {
          url = window.App.dataServiceURL + '/transcriptomics_experiment/';
          var q = 'in(eid,(' + ids + '))&select(expid,accession,title,organism,strain,mutant,timeseries,condition)&sort(+expid)&limit(25000)';
          console.log('url: ', url);
          console.log('ids: ', ids);
          xhr.post(url, {
            data: q,
            headers: {
              accept: 'application/solr+json',
              'content-type': 'application/rqlquery+x-www-form-urlencoded',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            handleAs: 'json'
          }).then(function (res) {
            console.log(' URL: ', url);
            console.log('Get experiment list: ', res);
            dataArray = res.response.docs;

            var grid = new Grid({
              columns: {
                title: 'Title',
                organism: 'Organism',
                strain: 'Strain',
                mutant: 'Mutant',
                timeseries: 'Time Series',
                condition: 'Condition'
              }
            }, 'gse-members-grid');
            grid.renderArray(dataArray);
            grid.resize();
          }, function (err) {
            console.log('Error Retreiving Experiment: ', err);
            document.getElementById('gse-members-grid').innerHTML = 'This is a private experiment: ' + ids;
          });
        }
      }
    }
  };

  function createGroup() {
    if (regionGroupName && ids.length > 0) {
      var idType = 'genome_id';
      if (myType == 'genome_group') {
        idType = 'genome_id';
      }
      else if (myType == 'feature_group') {
        idType = 'feature_id';
      }
      else if (myType == 'experiment_group') {
        idType = 'eid';
      }
      console.log('clicked create group' + myURL + 'create ' + myType);
      console.log('idType=', idType);
      console.log('ids=', id_array);
      console.log('myPath=', myPath);
      WorkspaceManager.createGroup(regionGroupName, myType, myPath, idType, id_array);
      document.getElementById('create_msg').innerHTML = "<b>The group has been successfully created. Click <a href='/workspace" + myPath + '/' + regionGroupName + "' target=_blank>here</a> to view.</b>";
      document.getElementById('create_msg').style = 'color: green';
      // alert("Please refresh the workspace folder to view.");
    } else if (regionGroupName) {
      document.getElementById('create_msg').innerHTML = '<b>Please select the regions which have members.</b>';
      document.getElementById('create_msg').style = 'color: red';
      // alert("Please select the regions which have members.");
    } else {
      document.getElementById('create_msg').innerHTML = '<b>Please select one or more regions from the diagram.</b>';
      // document.getElementById('create_msg').style = "color: red";
      // alert("Please select a region or multiple regions from the diagram.");
    }
  }

  // TODO: add functionality to check the type and open a feature or genome list view respectively
  // will then enable all the other functionality from the list perspective
  function viewList() {
    if (regionGroupName && ids.length > 0) {
      if (myType == 'experiment_group') {
        return;
      }
      var idType = 'genome_id';
      var query = '';
      if (myType == 'genome_group') {
        query = `/view/GenomeList/?in(genome_id,(${ids}))`;
      }
      else if (myType == 'feature_group') {
        query = `/view/FeatureList/?in(feature_id,(${ids}))`;
      }
      else {
        console.log('error: shouldnt reach here');
        return;
      }
      Topic.publish('/navigate', { href: query, target: 'blank' })
    }
  }

  function populateGroupTable() {
    groups = groupCompare.getGroups();

    var groupArea = d3.select('#gse-groups');
    var groupTable = groupArea.append('table');
    var thead = groupTable.append('thead');
    thead.append('th').attr('width', '130px').text('Group Name');
    thead.append('th').text('Members');
    var tbody = groupTable.append('tbody');
    for (var i = 0, ilen = groups.length; i < ilen; ++i) {
      var tr = tbody.append('tr');
      tr.append('td').text(groups[i].name);
      tr.append('td').text(groups[i].members.length);
    }
  }

  function colorChoice(default_color) {
    // var groups = groupCompare.getGroups();
    var g0 = d3.select('#g0_circle');
    var g1 = d3.select('#g1_circle');
    var g2 = d3.select('#g2_circle');
    var g0_s = d3.select('#g0_stroke');
    var g1_s = d3.select('#g1_stroke');
    var g2_s = d3.select('#g2_stroke');

    console.log('default_color', default_color);
    if (default_color === 'Y') {
      g0.classed('venn_circle', false);
      g0.classed('venn_circle_color1', true);
      g0_s.classed('venn_circle_stroke', false);
      g0_s.classed('venn_circle_stroke_color', true);

      g1.classed('venn_circle', false);
      g1.classed('venn_circle_color2', true);
      g1_s.classed('venn_circle_stroke', false);
      g1_s.classed('venn_circle_stroke_color', true);

      if (groups.length > 2) {
        g2.classed('venn_circle', false);
        g2.classed('venn_circle_color3', true);
        g2_s.classed('venn_circle_stroke', false);
        g2_s.classed('venn_circle_stroke_color', true);
      }
    } else {
      g0.classed('venn_circle_color1', false);
      g0.classed('venn_circle', true);
      g0_s.classed('venn_circle_stroke_color', false);
      g0_s.classed('venn_circle_stroke', true);

      g1.classed('venn_circle_color2', false);
      g1.classed('venn_circle', true);
      g1_s.classed('venn_circle_stroke_color', false);
      g1_s.classed('venn_circle_stroke', true);

      if (groups.length > 2) {
        g2.classed('venn_circle_color3', false);
        g2.classed('venn_circle', true);
        g2_s.classed('venn_circle_stroke_color', false);
        g2_s.classed('venn_circle_stroke', true);
      }
    }
  }

  function replaceSVGClass(svghtml) {
    var venn_circle = 'class="venn_circle"';
    var venn_circle_color1 = 'class="venn_circle_color1"';
    var venn_circle_color2 = 'class="venn_circle_color2"';
    var venn_circle_color3 = 'class="venn_circle_color3"';
    var venn_region = 'class="venn_region"';
    var venn_region_active = 'class="venn_region active"';
    var venn_circle_stroke = 'class="venn_circle_stroke"';
    var venn_circle_stroke_color = 'class="venn_circle_stroke_color"';
    var region_label = 'class="region_label"';
    var circle_label = 'class="circle_label"';
    var venn_circle_replace = 'style="fill: #D2D2D2; fill-opacity: 1;"';
    var venn_circle_color1_replace = 'style="fill: blue; fill-opacity: 0.6;"';
    var venn_circle_color2_replace = 'style="fill: yellow; fill-opacity: 0.6;"';
    var venn_circle_color3_replace = 'style="fill: green; fill-opacity: 0.6;"';
    var venn_region_replace = 'style="fill-opacity: 0;"';
    var venn_region_active_replace = 'style="fill: #DBE8EE; fill-opacity: 1;"';
    var venn_circle_stroke_replace = 'style="stroke: #34698E; stroke-width:2px; fill-opacity: 0;"';
    var venn_circle_stroke_color_replace = 'style="stroke: black; stroke-width:1px; fill-opacity: 0;"';
    var region_label_replace = 'style="fill: black; font-size: 10px;"';
    var circle_label_replace = 'style="fill: black; font-size: 10px;"';
    var replace_circle = svghtml
      .replace(new RegExp(venn_circle, 'g'), venn_circle_replace)
      .replace(new RegExp(venn_circle_color1, 'g'), venn_circle_color1_replace)
      .replace(new RegExp(venn_circle_color2, 'g'), venn_circle_color2_replace)
      .replace(new RegExp(venn_circle_color3, 'g'), venn_circle_color3_replace);

    var replace_region = replace_circle
      .replace(new RegExp(venn_region, 'g'), venn_region_replace)
      .replace(new RegExp(venn_region_active, 'g'), venn_region_active_replace)
      .replace(new RegExp(venn_circle_stroke, 'g'), venn_circle_stroke_replace)
      .replace(new RegExp(venn_circle_stroke_color, 'g'), venn_circle_stroke_color_replace);

    var replace_svghtml = replace_region
      .replace(new RegExp(region_label, 'g'), region_label_replace)
      .replace(new RegExp(circle_label, 'g'), circle_label_replace);

    // console.log(replace_svghtml);
    return replace_svghtml;
  }

  function groupsLoaded(length) {
    if (length == 1 || length > 3) {
      alert('Please select two or three groups to compare');
    } else if (length == 2) {
      groupCompare.createDisplayTwo();
      populateGroupTable();
    } else {
      groupCompare.createDisplay();
      populateGroupTable();
    }
  }

  function init_g(group_data, groupType) {
    groupCompare = null;
    myURL = null;
    myType = null;
    ids = '';
    regionName = null;
    regionGroupName = null;
    groups = [];
    id_array = [];

    myType = groupType;

    var gcConfig = {
      vennPanel: 'gse-venndiagram',
      groups: []
    };
    groupCompare = new window.GroupCompare.GroupCompare(gcConfig);
    groupCompare.addSelectionListener(selectionListener);
    console.log(' groupCompare ', groupCompare);
    console.log(' group_data ', group_data);
    console.log(' group type ', groupType);
    for (var i = 0; i < group_data.length; i++) {
      var group = {};
      console.log('current group data', group_data[i].data);
      group_data[i].data = JSON.parse(group_data[i].data);
      group.name = group_data[i].data.name;
      if (groupType == 'genome_group') {
        group.members = group_data[i].data.id_list.genome_id;
      }
      else if (groupType == 'feature_group') {
        group.members = group_data[i].data.id_list.feature_id;
      }
      else {
        if (group_data[i].data.id_list.eid) {
          group.members = group_data[i].data.id_list.eid;
        }
        else if (group_data[i].data.id_list.ws_item_path) {
          group.members = group_data[i].data.id_list.ws_item_path;
        }
      }
      console.log('current group ', group);
      groups.push(group);
      groupCompare.addGroup(group);
      console.log('current group after add ', group);
    }
    console.log(' groups ', groups);
    groupsLoaded(groups.length);
  }

  function saveSVG() {
    var html = d3.select('svg').attr('version', 1.1).attr('xmlns', 'http://www.w3.org/2000/svg').node();
    // need to declare namespace, set xmlns:xlink using setAttribute;
    // .attr("xmlns:xlink", "http://www.w3.org/1999/xlink") does not work
    html.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    var innerhtml = replaceSVGClass(html.parentNode.innerHTML);

    var imgsrc = 'data:image/svg+xml;base64,' + btoa(innerhtml);
    var a = document.createElement('a'); // required for Firefox, optional for Chrome
    document.body.appendChild(a); // TODO: why add this before setting attributes of a tag?
    a.download = 'venndiagram.svg';
    a.href = imgsrc;
    a.target = '_self'; // required for Firefox, optional for Chrome
    a.click();
  }

  return declare([WidgetBase], {
    baseClass: 'GroupExplore',
    disabled: false,
    query: null,
    loading: false,
    data: null,
    dataMap: {},
    apiServiceUrl: window.App.dataAPI,
    selection: null,
    path: null,
    type: 'folder',
    groupType: 'genome_group',
    containerWidget: null,
    containerNode: null,

    _setTypeAttr: function (t) {
      this.type = t;
      if (this.workspaceObjectSelector) {
        this.workspaceObjectSelector.set('type', [t]);
      }
      console.log('type(): ', t);

    },

    _setPathAttr: function (path) {
      this.path = path;
      myPath = path;
      if (this.groupNameBox) {
        this.groupNameBox.set('path', this.path);
      }

      if (this.workspaceObjectSelector) {
        this.workspaceObjectSelector.set('path', this.path);
      }
      console.log('path(): ', path);
    },

    _setSelectionAttr: function (selection) {
      this.selection = selection;
      this.groupType = selection[0].type;
      console.log('selection(): ', selection);
    },

    _setContainerNodeAttr: function (containerNode) {
      this.containerNode = containerNode;
      console.log('containerNode(): ', containerNode);
    },

    _setContainerWidgetAttr: function (val) {
      console.log('Set Container Widget: ', val);
      this.containerWidget = val;
    },

    onSetLoading: function (attr, oldVal, loading) {
      if (loading) {
        this.contentPane.set('content', '<div>This is group explore</div>');
      }
    },

    postCreate: function () {
      console.log('in postCreate selection: ', this.selection);
      console.log('in postCreate Container Widget: ', this.containerWidget);
      var i = 0;
      var paths = [];
      for (i = 0; i < this.selection.length; i++) {
        paths.push(this.selection[i].path);
      }
      console.log('paths: ', paths);
      WorkspaceManager.getObjects(paths, false).then(lang.hitch(this, function (objs) {
        this._resultObjects = objs;
        console.log('got objects: ', objs);
        init_g(objs, this.groupType);

      }));

      domConstruct.empty(this.containerNode);
      domConstruct.create('link', {
        rel: 'stylesheet',
        type: 'text/css',
        href: '/js/p3/resources/gse.css'
      }, this.containerNode, 'last');

      var div = domConstruct.create('div', { id: 'gse' }, this.containerNode);

      var color_type1 = domConstruct.create('input', {
        type: 'radio',
        name: 'color_type',
        id: 'default',
        value: 'true',
        checked: 'Y',
        style: 'margin: 5px'
      }, div);
      domConstruct.create('label', { 'for': 'default', innerHTML: 'default' }, div);
      var color_type2 = domConstruct.create('input', {
        type: 'radio',
        name: 'color_type',
        id: 'alter_color',
        value: 'false',
        style: 'margin: 5px'
      }, div);
      domConstruct.create('label', { 'for': 'default', innerHTML: 'alternative color' }, div);

      color_type1.addEventListener('click', function () {
        colorChoice('Y');
      });

      color_type2.addEventListener('click', function () {
        colorChoice('N');
      });

      var save_btn = domConstruct.create('input', {
        type: 'button',
        value: 'Save SVG',
        style: 'margin: 10px'
      }, div);
      save_btn.addEventListener('click', function () {
        console.log('save SVG');
        saveSVG();
      });

      var create_btn = domConstruct.create('input', {
        type: 'button',
        value: 'Create group from selected region(s)',
        style: 'margin: 10px'
      }, div);
      create_btn.addEventListener('click', function () {
        createGroup();
      });

      var list_btn = domConstruct.create('input', {
        type: 'button',
        value: 'View selected as a list',
        style: 'margin: 10px'
      }, div);
      list_btn.addEventListener('click', function () {
        viewList();
      });

      domConstruct.create('div', { id: 'gse-members' }, div);
      domConstruct.create('div', {
        id: 'create_msg',
        innerHTML: '<b>Please select one or more regions to view members.</b>'
      }, div);
      domConstruct.create('div', { id: 'gse-venndiagram' }, div);
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
    }

  });
});
