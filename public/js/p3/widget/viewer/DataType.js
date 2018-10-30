define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/when', 'dojo/request', 'dojo/string', 'dojo/topic',
  'dojo/dom-construct', 'dojo/query', 'dojo/dom-class', 'dojo/dom-style',
  'dijit/layout/ContentPane', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin',
  'd3/d3',
  './Base', '../../util/PathJoin', '../D3StackedBarChart', '../D3HistogramChart', '../D3HorizontalBarChart'
], function (
  declare, lang, when, request, String, Topic,
  domConstruct, domQuery, domClass, domStyle,
  ContentPane, WidgetBase, Templated,
  d3,
  ViewerBase, PathJoin, StackedBarChart, HistogramChart, HorizontalBarChart
) {

  var pathwayNavBarHtml = [
    "<span class='label'>Scale</span>",
    "<ul class='scale'>",
    "<li class='real active'>Real Values</li>",
    "<li class='normalize'>Normalize</li>",
    '</ul>',
    "<span class='label'>Order by</span>",
    "<ul class='sort'>",
    "<li class='label active'>Genus</li>",
    "<li class='value'>Conserved</li>",
    '</ul>'
  ].join('\n');

  var proteinfamilyNavBarHtml = [
    "<span class='label'>Scale</span>",
    "<ul class='scale'>",
    "<li class='real active'>Real Values</li>",
    "<li class='normalize'>Normalize</li>",
    '</ul>',
    "<span class='label'>Data Set</span>",
    "<ul class='dataset'>",
    "<li class='fvh active'>Functional vs. Hypothetical</li>",
    "<li class='cva'>Core vs. Accessory</li>",
    '</ul>',
    "<span class='label'>Order by</span>",
    "<ul class='sort'>",
    "<li class='label active'>Genus</li>",
    "<li class='functional'>Functional</li>",
    "<li class='hypothetical'>Hypothetical</li>",
    "<li class='core' style='display: none;'>Core</li>",
    "<li class='accessory' style='display: none'>Accessory</li>",
    '</ul>'
  ].join('\n');

  var proteinfamilyLegend = { fvh: ['Functional', 'Hypothetical'], cva: ['Core', 'Accessory'] };

  var proteinFamiliesChart = declare([StackedBarChart], {
    sort: function () {
      var self = this;
      var sortCriteria = domQuery('.chart-wrapper .sort .active')[0].className.split(' ')[0];

      if (sortCriteria === this.currentSort) {
        this.ascendSort = !this.ascendSort;
      } else {
        this.currentSort = sortCriteria;
      }

      switch (this.currentSort) {
        case 'label':
          this.bars.sort(function (a, b) {
            var orderCode = 0;
            if (a.label < b.label) {
              orderCode = -1;
            } else if (a.label > b.label) {
              orderCode = 1;
            }

            if (!self.ascendSort) {
              orderCode *= -1;
            }
            return orderCode;
          });
          break;
        case 'functional':
        case 'core':
          this.bars.sort(function (a, b) {
            var aValue = self.barHeight(a[self.dataSet][0], a.total);
            var bValue = self.barHeight(b[self.dataSet][0], b.total);

            var orderCode = aValue - bValue;
            if (!self.ascendSort) {
              orderCode *= -1;
            }
            return orderCode;
          });
          break;
        case 'hypothetical':
        case 'accessory':
          this.bars.sort(function (a, b) {
            var aValue = self.barHeight(a[self.dataSet][1], a.total);
            var bValue = self.barHeight(b[self.dataSet][1], b.total);

            var orderCode = aValue - bValue;
            if (!self.ascendSort) {
              orderCode *= -1;
            }
            return orderCode;
          });
          break;
        default:
          break;
      }
      for (var index = 0; index < this.seriesSize; index++) {
        this.bars.select(lang.replace('rect.block-{0}', [index]))
          .transition().duration(600)
          .delay(function (d, i) {
            return 10 * i;
          })
          .attr('x', function (d, i) {
            return self.barPosition(i);
          });
      }

      this.bars.select('text').transition().duration(600)
        .delay(function (d, i) {
          return 10 * i;
        })
        .attr('x', function (d, i) {
          return self.textPosition(i);
        })
        .attr('transform', function (d, i) {
          var y = Math.round(self.canvasHeight - 11);
          var x = self.pf_x_scale(i) + self.pf_x_scale(1) / 2;
          return lang.replace('rotate(270, {0}, {1})', [x, y]);
        });
    },
    renderNav: function (html) {
      this.inherited(arguments);
      var self = this;
      var dataToggle = domQuery('.chart-wrapper nav .dataset li');

      if (dataToggle !== null) {
        dataToggle.on('click', function (evt) {
          dataToggle.removeClass('active');
          var target = evt.srcElement || evt.target;

          self.changeDataSet(target.className);
          domClass.add(target, 'active');

          self.scale(function () {
            return self.sort();
          });
        });
      }
    },
    dataSet: 'fvh',
    changeDataSet: function (d) {
      this.dataSet = d;
      if (d === 'fvh') {
        this.renderLegend('Legend: ', proteinfamilyLegend[d]);
        domStyle.set(domQuery('.chart-wrapper nav .sort li.functional')[0], 'display', 'inline');
        domStyle.set(domQuery('.chart-wrapper nav .sort li.hypothetical')[0], 'display', 'inline');
        domStyle.set(domQuery('.chart-wrapper nav .sort li.core')[0], 'display', 'none');
        domStyle.set(domQuery('.chart-wrapper nav .sort li.accessory')[0], 'display', 'none');

      } else if (d === 'cva') {
        this.renderLegend('Legend: ', proteinfamilyLegend[d]);
        domStyle.set(domQuery('.chart-wrapper nav .sort li.functional')[0], 'display', 'none');
        domStyle.set(domQuery('.chart-wrapper nav .sort li.hypothetical')[0], 'display', 'none');
        domStyle.set(domQuery('.chart-wrapper nav .sort li.core')[0], 'display', 'inline');
        domStyle.set(domQuery('.chart-wrapper nav .sort li.accessory')[0], 'display', 'inline');
      }
    }
  });

  var attributeTemplate = [
    "<a class='left right-align-text attribute-line' href='{attr.link}'>",
    "<span class='highlight-e'>{attr.data}</span>",
    '</a>',
    "<span class='left small'>{attr.description}</span>",
    "<div class='clear'></div>"
  ].join('\n');

  var tooltipLayer = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);

  var convertCountryNameToAlpha2Code = function (name) {
    // have top 10 countries for now.
    // use i18n-iso-countries module later
    var code;

    switch (name) {
      case 'United States':
      case 'USA':
        code = 'us';
        break;
      case 'United Kingdom':
        code = 'gb';
        break;
      case 'Thailand':
        code = 'th';
        break;
      case 'Netherlands':
        code = 'nl';
        break;
      case 'China':
        code = 'cn';
        break;
      case 'Canada':
        code = 'ca';
        break;
      case 'Russia':
      case 'Russian Federation':
        code = 'ru';
        break;
      case 'India':
        code = 'in';
        break;
      case 'Germany':
        code = 'de';
        break;
      case 'Australia':
        code = 'au';
        break;
      default:
        code = 'us';
        break;
    }

    return code;
  };

  return declare([ViewerBase], {

    onSetState: function (attr, oldVal, state) {
      // console.log("DataType view onSetState", state);

      if (!state) {
        return;
      }

      var parts = state.pathname.split('/');
      var dataType = parts[parts.length - 1];

      if (!dataType) return;

      this.dataType = dataType;

      window.document.title = dataType;

      // when(request.get(PathJoin(this.apiServiceUrl, "content/dlp/", dataType), {
      when(request.get(PathJoin(window.App.docsServiceURL, 'website/data_landing_pages/', dataType + '.html'), {
        handleAs: 'text'
      }), lang.hitch(this, function (data) {

        data = data.replace('<img src="../../_static/patric_logo.png" class="logo" />', '');
        var doc = domConstruct.toDom(data);
        // console.log(doc.childNodes.length, doc.childNodes)

        var len = doc.childNodes.length;
        var content;
        for (var i = 0; i < len; i++) {
          // console.log(i, doc.childNodes[i].tagName)
          if (doc.childNodes[i].tagName === 'DIV') {
            // console.log(i, doc.childNodes[i])
            var rootDivNode = doc.childNodes[i];
            var sectionDivNode = rootDivNode.children[1];
            var contentDivNode = sectionDivNode.children[1];
            var articleNode = contentDivNode.children[0].children[1];
            var articleBody = articleNode.children[0];
            content = articleBody.children[0].children[1];
          }
        }

        this.template = content;
        this.viewer.set('content', content);
        var self = this;

        when(request.get(PathJoin(self.apiServiceUrl, 'content/dlp/', dataType + '.json'), {
          handleAs: 'json'

        }), lang.hitch(this, function (data) {

          this.set(dataType, data);
        }));
      }));
    },

    _buildPopularGenomeList: function (popularList) {

      var popularListUl = ["<ul class='no-decoration genome-list tab-headers third'>"];

      popularList.forEach(function (genome, idx) {
        popularListUl.push(lang.replace("<li><a data-genome-href='{0}' class='genome-link' href='#genome-tab{1}'>{2}</a><div class=''></div></li>", [genome.link, (idx + 1), genome.popularName]));
      });
      popularListUl.push('</ul>');

      return popularListUl;
    },

    _initialSelection: function (el) {

      var event;
      if (document.createEvent) {
        event = document.createEvent('HTMLEvents');
        event.initEvent('mouseover', true, true);
      } else {
        event = document.createEventObject();
        event.eventType = 'mouseover';
      }
      event.eventName = 'initialMouseOver';

      if (document.createEvent) {
        el.dispatchEvent(event);
      } else {
        el.fireEvent('on' + event.eventType, event);
      }
    },

    _activatePopularGenomeListTab: function () {
      var links = domQuery('.data-box.popular-box .genome-link');
      links.forEach(function (link) {

        link.addEventListener('click', function (evt) {
          var target = evt.target || evt.srcElement;
          var link = target.dataset.genomeHref;

          if (event.preventDefault) event.preventDefault();
          else event.returnValue = false;

          Topic.publish('/navigate', { href: link });
        });
        link.addEventListener('mouseover', function (evt) {
          var target = evt.target || evt.srcElement;
          var targetTab = target.hash;

          domQuery('.data-box.popular-box .genome-list li').forEach(function (l) {
            domClass.remove(l, 'ui-state-active');
          });
          domClass.add(target.parentElement, 'ui-state-active');

          domQuery('.genome-data').forEach(function (panel) {
            if ('#' + panel.id == targetTab) {
              domClass.remove(panel, 'hidden');
            } else {
              domClass.add(panel, 'hidden');
            }
          });
        });
      });

      this._initialSelection(links[0]);
    },

    _setAntibioticResistanceAttr: function (data) {

      var popularList = data.popularGenomes.popularList;

      var popularTabList = this._buildAntibioticResistancePopularPanel(popularList);
      var popularListUl = this._buildPopularGenomeList(popularList);

      var tabDiv = domQuery('.data-box.popular-box div.group')[0];

      var popularTabNode = domConstruct.toDom(popularTabList.join(''));
      var popularListNode = domConstruct.toDom(popularListUl.join(''));

      domConstruct.place(popularTabNode, tabDiv);
      domConstruct.place(popularListNode, tabDiv);

      this._activatePopularGenomeListTab();
    },
    _buildAntibioticResistancePopularPanel: function (popularList) {

      var template = [
        "<div class='genome-data right half group no-decoration hidden' id='genome-tab{0}'>",
        "<div class='far2x'>",
        "<div class='left left-align-text'>",
        '<h3>Antibiotic Resistance Genes:</h3>',
        '{1}',
        '</div>',
        "<div class='clear'></div>",
        '</div>',
        '<h3>Explore Genomic Features in </h3>',
        "<div class='three-quarter'>{2}</div>",
        '</div>'
      ].join('\n');

      return popularList.map(function (genome, idx) {

        var specialtyGenes = genome.specialtyGenes.map(function (spg) {
          return lang.replace(attributeTemplate, { attr: spg });
        }).join('\n');

        var links = genome.links.map(function (link, i) {

          if (i % 2) { // odd
            return lang.replace("<a class='right' href='{0}'>{1}</a><br/>", [link.link, link.name]);
          }
          return lang.replace("<a class='left' href='{0}'>{1}</a>", [link.link, link.name]);

        }).join('\n');

        return lang.replace(template, [(idx + 1), specialtyGenes, links]);
      });
    },

    _setGenomicFeaturesAttr: function (data) {

      var popularList = data.popularGenomes.popularList;

      var popularTabList = this._buildFeaturesPopularPanel(popularList);
      var popularListUl = this._buildPopularGenomeList(popularList);

      var tabDiv = domQuery('.data-box.popular-box div.group')[0];

      var popularTabNode = domConstruct.toDom(popularTabList.join(''));
      var popularListNode = domConstruct.toDom(popularListUl.join(''));

      domConstruct.place(popularTabNode, tabDiv);
      domConstruct.place(popularListNode, tabDiv);

      this._activatePopularGenomeListTab();
    },
    _buildFeaturesPopularPanel: function (popularList) {

      var template = [
        "<div class='genome-data right two-third group no-decoration hidden' id='genome-tab{0}' style='width:563px;'>",
        "<div class='far2x'>",
        "<div class='left'>",
        '<h3>Features:</h3>',
        '{1}',
        '</div>',
        "<div class='left left-align-text'>",
        '<h3>Proteins by Attributes:</h3>',
        '{2}',
        '</div>',
        "<div class='left left-align-text'>",
        '<h3>Specialty Genes:</h3>',
        '{3}',
        '</div>',
        "<div class='clear'></div>",
        '</div>',
        '<h3>Explore Genomic Features in </h3>',
        "<div class='three-quarter'>{4}</div>",
        '</div>'].join('\n');

      return popularList.map(function (genome, idx) {

        var featureTypes = genome.featureTypes.map(function (type) {
          return lang.replace(attributeTemplate, { attr: type });
        }).join('\n');
        var proteinSummary = genome.proteinSummary.map(function (protein) {
          return lang.replace(attributeTemplate, { attr: protein });
        }).join('\n');
        var specialtyGenes = genome.specialtyGenes.map(function (gene) {
          return lang.replace(attributeTemplate, { attr: gene });
        }).join('\n');

        var links = genome.links.map(function (link, i) {
          if (i % 2) { // odd
            return lang.replace("<a class='right' href='{0}'>{1}</a><br/>", [link.link, link.name]);
          }
          return lang.replace("<a class='left' href='{0}'>{1}</a>", [link.link, link.name]);

        }).join('\n');

        return lang.replace(template, [(idx + 1), featureTypes, proteinSummary, specialtyGenes, links]);
      });
    },

    _setGenomesAttr: function (data) {

      var popularList = data.popularGenomes.popularList;

      var popularTabList = this._buildGenomesPopularPanel(popularList);
      var popularListUl = this._buildPopularGenomeList(popularList);

      var tabDiv = domQuery('.data-box.popular-box div.group')[0];

      var popularTabNode = domConstruct.toDom(popularTabList.join(''));
      var popularListNode = domConstruct.toDom(popularListUl.join(''));

      domConstruct.place(popularTabNode, tabDiv);
      domConstruct.place(popularListNode, tabDiv);

      this._activatePopularGenomeListTab();
      // render genome_status chart
      this._renderGenomeStatusChart(data.genomeStatus);
      // render genome_count chart
      this._renderGenomeNumbersChart(data.numberGenomes);
      // render top5 charts
      this._renderGenomeTopChart('dlp-genomes-chart-tab1', data.top5_1.data);
      this._renderGenomeTopChart('dlp-genomes-chart-tab2', data.top5_2.data);
      // handle tabs
      var tabs = domQuery('.tabbed .tab-headers.inline li span');
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function (evt) {

          // console.log(evt);
          var targetTab = evt.srcElement.dataset.href;

          domQuery('.tabbed .tab-headers.inline li').forEach(function (l) {
            domClass.remove(l, 'ui-state-active');
          });
          domClass.add(evt.srcElement.parentElement, 'ui-state-active');

          ['#dlp-genomes-chart-tab1', '#dlp-genomes-chart-tab2'].forEach(function (div) {
            if (div == targetTab) {
              domClass.remove(domQuery(div)[0], 'hidden');
            } else {
              domClass.add(domQuery(div)[0], 'hidden');
            }
          });
        });
      });
    },

    _buildGenomesPopularPanel: function (popularList) {

      var template = ["<div class='genome-data right half group no-decoration hidden' id='genome-tab{0}'>",
        '{1}',
        '{2}',
        "<div class='clear'></div>",
        "<p><a class='double-arrow-link' href='{3}'>View This Genome in Genome Browser</a></p>",
        '</div>'].join('\n');

      var metadataTemplate = ["<table class='no-decoration basic far2x'>",
        '<tr>',
        "<th class='italic' width='25%' scope='row'>Genome Status: </th>",
        "<td width='25%'>&nbsp;{metadata.genome_status}</td>",
        "<th class='italic' width='25%' scope='row'>Isolation Country: </th>",
        "<td width='25%'>&nbsp;{metadata.isolation_country}</td>",
        '</tr>',
        '<tr>',
        "<th class='italic' scope='row'>Genomic Sequences: </th>",
        '<td>1 Chromosome</td>',
        "<th class='italic' scope='row'>Host Name: </th>",
        '<td>&nbsp;{metadata.host_name}</td>',
        '</tr>',
        '<tr>',
        "<th class='italic' scope='row'>Genome Length: </th>",
        '<td>&nbsp;{metadata.genome_length} bp</td>',
        "<th class='italic' scope='row'>Disease: </th>",
        '<td>&nbsp;{metadata.disease}</td>',
        '</tr>',
        '<tr>',
        "<th class='italic' scope='row'>Completion Date: </th>",
        '<td>&nbsp;{metadata.completion_date}</td>',
        "<th class='italic' scope='row'>Collection Year: </th>",
        '<td>&nbsp;{metadata.collection_year}</td>',
        "<th class='italic' scope='row'>Collection Date: </th>",
        '<td>&nbsp;{metadata.collection_date}</td>',
        '</tr>',
        '</table>'].join('\n');

      var dataTypeTemplate = ["<div class='column'>",
        "<a class='genome-data-item clear' href='{dataType.features.link}'>",
        "<div class='genome-data-icon feature left'></div>",
        "<h3 class='down2x close highlight-e'>{dataType.features.data}</h3>",
        "<p class='small'>Features</p>",
        '</a>',
        "<a class='genome-data-item clear' href='{dataType.experiments.link}'>",
        "<div class='genome-data-icon experiment left'></div>",
        "<h3 class='down2x close highlight-e'>{dataType.experiments.data}</h3>",
        "<p class='small'>Transcriptomic Experiments</p>",
        '</a>',
        '</div>',
        "<div class='column'>",
        "<a class='genome-data-item clear' href='{dataType.pathways.link}'>",
        "<div class='genome-data-icon pathway left'></div>",
        "<h3 class='down2x close highlight-e'>{dataType.pathways.data}</h3>",
        "<p class='small'>Pathways</p>",
        '</a>',
        "<a class='genome-data-item clear' href='{dataType.proteinfamily.link}'>",
        "<div class='genome-data-icon proteinfamily left'></div>",
        "<h3 class='down2x close highlight-e'>{dataType.proteinfamily.data}</h3>",
        "<p class='small'>Protein Families</p>",
        '</a>',
        '</div>'].join('\n');

      return popularList.map(function (genome, idx) {

        var meta = lang.replace(metadataTemplate, genome);
        var dataType = lang.replace(dataTypeTemplate, genome);

        return lang.replace(template, [(idx + 1), meta, dataType, genome.gb_link]);
      });
    },

    _renderGenomeStatusChart: function (data) {

      var chartCanvas = d3.select('#dlp-genomes-genomeStatus .chart')
        .append('div').attr('class', 'chartContainer')
        .style('height', '272px')
        .append('div')
        .attr('class', 'chartCanvas group')
        .style('width', '100%');

      var dataset = data.data;

      var x_scale = d3.scale.linear().range([0, 272]).domain([
        0, d3.sum(dataset, function (d) {
          return d.value;
        })
      ]);

      var chart = chartCanvas.selectAll('div').data(dataset).enter();

      chart.append('div').attr('class', function (d) {
        return 'gsc_bar ' + d.m_label;
      }).style('height', function (d) {
        return x_scale(d.value) + 'px';
      }).on('click', function (d) {
        var url;
        switch (d.label) {
          case 'Whole Genome Shotgun':
            url = '/view/Taxonomy/2#view_tab=genomes&filter=eq(genome_status,WGS)';
            break;
          case 'Complete':
            url = '/view/Taxonomy/2#view_tab=genomes&filter=eq(genome_status,Complete)';
            break;
          default:
            url = '/view/Taxonomy/2#view_tab=genomes&filter=eq(genome_status,Plasmid)';
            break;
        }
        Topic.publish('/navigate', { href: url });
      })
        .on('mouseover', function (d) {
          tooltipLayer.transition()
            .duration(200)
            .style('opacity', 0.95);

          tooltipLayer.html(d.label)
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY + 'px');
        })
        .on('mouseout', function () {
          tooltipLayer.transition()
            .duration(500)
            .style('opacity', 0);
        });

      var bars = chartCanvas.selectAll('.gsc_bar').data(dataset);

      bars.append('span').attr('class', 'value').text(function (d) {
        return d.reported;
      });

      bars.append('span').attr('class', 'reportedLabel').text(function (d) {
        return d.label;
      });
    },

    _renderGenomeNumbersChart: function (data) {

      var dataset = data.data;

      var yearLables = [];
      dataset.forEach(function (d) {
        yearLables.push(d.year);
      });

      var chart = d3.select('#dlp-genomes-numberGenomes .chart')
        .insert('svg', ':first-child')
        .attr('class', 'svgChartContainer')
        .attr('width', 288)
        .attr('height', 272);

      var canvas = chart.append('g')
        .attr('class', 'svgChartCanvas')
        .attr('width', 232)
        .attr('height', 241)
        .attr('transform', 'translate(50,6)');

      var drawTarget = {
        chart: chart,
        canvas: canvas,
        canvas_size: {
          height: 241,
          width: 232
        },
        margins: [6, 6, 25, 50]
      };

      var chartheight = drawTarget.canvas_size.height;
      var chartwidth = drawTarget.canvas_size.width;

      var maxGenomes = d3.max(dataset, function (d) {
        return d3.max([d.complete, d.wgs]);
      });

      var genome_scale = d3.scale.linear().domain([0, (maxGenomes + 500)]).range([chartheight, 0]);
      var year_scale = d3.scale.ordinal().domain(yearLables).rangeBands([0, chartwidth]);

      var genome_axis = d3.svg.axis().scale(genome_scale).orient('left').tickSubdivide(1)
        .tickSize(-chartwidth)
        .tickPadding(10);
      var year_axis = d3.svg.axis().scale(year_scale).orient('bottom').tickSize(0)
        .tickPadding(10)
        .tickFormat(d3.format('d'));

      // add Background
      canvas.append('rect').attr('class', 'chart-background')
        .attr('width', chartwidth + 4).attr('height', chartheight + 4)
        .attr('transform', 'translate(-2,-2)');

      canvas.append('g').attr('class', 'y axis').call(genome_axis);
      canvas.append('g').attr('class', 'x axis').call(year_axis);
      canvas.select('.x.axis').attr('transform', 'translate(0,' + chartheight + ')');

      var datagroups = canvas.selectAll('datapoints').data(dataset);

      var offset = (year_scale.rangeBand()) / 2;
      var lineSeries1 = d3.svg.line().x(function (d, i) {
        // return year_scale(d.year);
        return year_scale.rangeBand() * i + offset;
      }).y(function (d) {
        return genome_scale(d.wgs);
      });

      var lineSeries2 = d3.svg.line().x(function (d, i) {
        // return year_scale(d.year);
        return year_scale.rangeBand() * i + offset;
      }).y(function (d) {
        return genome_scale(d.complete);
      });
      canvas.append('path').attr('d', lineSeries1(dataset)).attr('class', 'total line');
      canvas.append('path').attr('d', lineSeries2(dataset)).attr('class', 'sequenced line');

      // Now add the rectangles for each data point for both lines.
      datagroups.enter().append('g').attr('class', 'datapoints');

      // WGS
      canvas.selectAll('.datapoints').data(dataset)
        .append('rect')
        .attr('class', 'point-total')
        .attr('x', function (d, i) {
          return year_scale.rangeBand() * i + offset - 3;
        })
        .attr('y', function (d) {
          return genome_scale(d.wgs) - 3;
        })
        .attr('width', '6')
        .attr('height', '6')
        .on('click', function (d) {
          var url = '/view/Taxonomy/2#view_tab=genomes&filter=and(eq(genome_status,WGS),lt(completion_date,' + (d.year + 1) + '-01-01T00%3A00%3A00Z))';

          Topic.publish('/navigate', { href: url });
        })
        .on('mouseover', function (d) {
          tooltipLayer.transition()
            .duration(200)
            .style('opacity', 0.95);

          tooltipLayer.html('WGS: ' + d.wgs)
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY + 'px');
        })
        .on('mouseout', function () {
          tooltipLayer.transition()
            .duration(500)
            .style('opacity', 0);
        });

      // complete
      canvas.selectAll('.datapoints').data(dataset)
        .append('rect')
        .attr('class', 'point-sequenced')
        .attr('x', function (d, i) {
          return year_scale.rangeBand() * i + offset - 3;
        })
        .attr('y', function (d) {
          return genome_scale(d.complete) - 3;
        })
        .attr('width', '6')
        .attr('height', '6')
        .on('click', function (d) {
          var url = '/view/Taxonomy/2#view_tab=genomes&filter=and(eq(genome_status,Complete),lt(completion_date,' + (d.year + 1) + '-01-01T00%3A00%3A00Z))';

          Topic.publish('/navigate', { href: url });
        })
        .on('mouseover', function (d) {
          tooltipLayer.transition()
            .duration(200)
            .style('opacity', 0.95);

          tooltipLayer.html('Complete: ' + d.complete)
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY + 'px');
        })
        .on('mouseout', function () {
          tooltipLayer.transition()
            .duration(500)
            .style('opacity', 0);
        });
    },

    _renderGenomeTopChart: function (target, data) {

      var breakstr = 'M 0 6 L 6 0 L 12 6 L 18 0 L 24 6 L 30 0 L 36 6 L 42 0 L 48 6 L 54 0';
      breakstr += 'L 54 28 L 48 22 L 42 28 L 36 22 L 30 28 L 24 22 L 18 28 L 12 22 L 6 28 L 0 22 Z';
      var chart = d3.select('#' + target + ' .chart')
        .insert('svg', ':first-child')
        .attr('class', 'svgChartContainer')
        .attr('width', 288)
        .attr('height', 232);

      var canvas = chart.append('g')
        .attr('class', 'svgChartCanvas')
        .attr('width', 288)
        .attr('height', 266)
        .attr('transform', 'translate(0,22)');

      var chartHeight = 266; // this.drawtarget.canvas_size.height;
      var chartWidth = 288; // this.drawtarget.canvas_size.width;
      var upperBound = d3.max(data, function (d) {
        return d.reported || d.value;
      });
      var yScale = d3.scale.linear().range([30, chartHeight]).domain([0, upperBound]);
      var xScale = d3.scale.linear().range([0, chartWidth]).domain([0, data.length]);
      var bars = canvas.selectAll('g.bar').data(data);
      bars.enter().append('g');

      // add rect bar
      bars.append('rect').attr('class', function (d, i) {
        return 'bar bar-' + i;
      }).attr('height', function (d) {
        var val;
        val = d.reported || d.value;
        return yScale(val);
      }).attr('width', Math.floor(xScale(0.8)))
        .attr('x', function (d, i) {
          return (i * xScale(1)) + xScale(0.1);
        })
        .attr('y', function (d) {
          var val = d.reported || d.value;
          return chartHeight - yScale(val);
        })
        .on('click', function (d) {
          var url = '/view/Taxonomy/2#view_tab=genomes&filter=';

          if (target === 'dlp-genomes-chart-tab1') {
            url += 'eq(host_name,' + encodeURIComponent(d.label) + ')';
          } else {
            url += 'eq(isolation_country,' + encodeURIComponent(d.label) + ')';
          }
          Topic.publish('/navigate', { href: url });

        })
        .on('mouseover', function (d) {
          tooltipLayer.transition()
            .duration(200)
            .style('opacity', 0.95);

          tooltipLayer.html(d.label + ' (' + d.value + ')')
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY + 'px');
        })
        .on('mouseout', function () {
          tooltipLayer.transition()
            .duration(500)
            .style('opacity', 0);
        });
      // add text
      bars.append('text')
        .attr('class', 'label')
        .attr('x', function (d, i) {
          return (i * xScale(1)) + xScale(0.5);
        }).attr('y', function (d) {
          var val = d.reported || d.value;
          return chartHeight - yScale(val) - 6;
        })
        .attr('text-anchor', 'middle')
        .text(function (d) {
          if (target === 'dlp-genomes-chart-tab1') {
            return d.label.split(',')[0];
          }
          return d.value;

        })
        .on('click', function (d) {
          var url = '/view/Taxonomy/2#view_tab=genomes&filter=';

          if (target === 'dlp-genomes-chart-tab1') {
            url += 'eq(host_name,' + encodeURIComponent(d.label) + ')';
          } else {
            url += 'eq(isolation_country,' + encodeURIComponent(d.label) + ')';
          }
          Topic.publish('/navigate', { href: url });
        })
        .on('mouseover', function (d) {
          tooltipLayer.transition()
            .duration(200)
            .style('opacity', 0.95);

          tooltipLayer.html(d.label + ' (' + d.value + ')')
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY + 'px');
        })
        .on('mouseout', function () {
          tooltipLayer.transition()
            .duration(500)
            .style('opacity', 0);
        });

      // add flag for isolation country tab
      if (target === 'dlp-genomes-chart-tab2') {
        bars.append('image')
          .attr('xlink:href', function (d) {
            return '/public/js/flag-icon-css/flags/1x1/' + convertCountryNameToAlpha2Code(d.label) + '.svg';
          })
          .attr('height', 32)
          .attr('width', 32)
          .attr('x', function (d, i) {
            return (i * xScale(1)) + xScale(0.1) + 7;
          })
          .attr('y', 178)
          .on('click', function (d) {
            var url = '/view/Taxonomy/2#view_tab=genomes&filter=eq(isolation_country,' + encodeURIComponent(d.label) + ')';
            Topic.publish('/navigate', { href: url });
          })
          .on('mouseover', function (d) {
            tooltipLayer.transition()
              .duration(200)
              .style('opacity', 0.95);

            tooltipLayer.html(d.label + ' (' + d.value + ')')
              .style('left', d3.event.pageX + 'px')
              .style('top', d3.event.pageY + 'px');
          })
          .on('mouseout', function () {
            tooltipLayer.transition()
              .duration(500)
              .style('opacity', 0);
          });
      }

      // add sawtooth
      bars.select(function (d) {
        if ((d.reported != null) && d.reported !== d.value) {
          return this;
        }
        return null;

      }).append('path').attr('d', breakstr).attr('class', 'sawtooth')
        .attr('transform', function (d, i) {
          var scaleFactor,
            xpos,
            ypos;
          xpos = (i * xScale(1)) + xScale(0.1);
          ypos = chartHeight - yScale(d.reported / 2) - 14;
          scaleFactor = xScale(0.8) / 54;
          return 'translate(' + xpos + ',' + ypos + ') scale(' + scaleFactor + ')';
        });
    },

    _setPathwaysAttr: function (data) {

      var popularList = data.popularGenomes.popularList;

      var popularTabList = this._buildPathwaysPopularPanel(popularList);
      var popularListUl = this._buildPopularGenomeList(popularList);

      var tabDiv = domQuery('.data-box.popular-box div.group')[0];

      var popularTabNode = domConstruct.toDom(popularTabList.join(''));
      var popularListNode = domConstruct.toDom(popularListUl.join(''));

      domConstruct.place(popularTabNode, tabDiv);
      domConstruct.place(popularListNode, tabDiv);

      this._activatePopularGenomeListTab();

      // render pathway conservation chart
      this._renderPathwayConservation(data.conservation.data);
    },

    _renderPathwayConservation: function (data) {

      var legend = ['80 ~ 100 %', '60 ~ 80 %', '40 ~ 60 %', '20 ~ 40 %', '< 20 %'];
      var processed = data.map(function (d, idx) {
        return {
          index: idx,
          label: d.pathogen,
          total: d.total,
          tooltip: function (d, idx) {
            return lang.replace('Genus: {0}<br/>Conservation: {1}<br/>Count: {2}', [d.label, legend[idx], d.dist[idx]]);
          },
          dist: d.dist
        };
      });

      var targetNode = domQuery('#dlp-pathways-conservation')[0];
      var pathwayChart = new StackedBarChart();
      pathwayChart.init(targetNode);
      pathwayChart.renderNav(pathwayNavBarHtml);
      pathwayChart.renderLegend('Pathway Conservation Across %Genomes: ', legend);
      pathwayChart.render(processed);
    },

    _buildPathwaysPopularPanel: function (popularList) {

      var template = [
        "<div class='genome-data right half group no-decoration hidden' id='genome-tab{0}'>",
        "<div class='far'>",
        '<h3>Summary of Top 10 Pathways:</h3>',
        "<table class='basic no-decoration far2x'>",
        '<tr>',
        "<th scope='column'>EC numbers</th>",
        "<th scope='column'>Genes</th>",
        "<th scope='column'>Pathway Name</th>",
        '</tr>',
        '{1}',
        '</table>',
        "<a class='double-arrow-link' href='{2}'>View All Pathways in This Genome</a>",
        '</div>',
        '</div>'
      ].join('\n');

      var pathwayTableTemplate = [
        '<tr>',
        "<td class='center-text'><a href='{p.ec_link}'>{p.ec_count}</a></td>",
        "<td class='center-text'><a href='{p.gene_link}'>{p.gene_count}</a></td>",
        "<td><a href='{p.name_link}'>{p.name}</a></td>",
        '</tr>'
      ].join('\n');

      return popularList.map(function (genome, idx) {

        var pathwayTable = genome.popularData.map(function (p) {
          return lang.replace(pathwayTableTemplate, { p: p });
        }).join('\n');

        return lang.replace(template, [(idx + 1), pathwayTable, genome.link]);
      });
    },

    _setProteinFamiliesAttr: function (data) {

      var popularList = data.popularGenomes.popularList;

      var popularTabList = this._buildProteinFamiliesPopularPanel();
      var popularListUl = this._buildProteinFamiliesPopularGenomeList(popularList);

      var tabDiv = domQuery('.data-box.popular-box div.group')[0];

      var popularTabNode = domConstruct.toDom(popularTabList.join(''));
      var popularListNode = domConstruct.toDom(popularListUl.join(''));

      domConstruct.place(popularTabNode, tabDiv);
      domConstruct.place(popularListNode, tabDiv);

      // render protein family distribution chart
      this._renderProteinFamiliesDistribution(data.FIGfams.data);
      // render popular genome chart
      this._renderProteinFamiliesByGenus();

      // this._activatePopularGenomeListTab();
      this._activateProteinFamiliesPopularGenomeListTab();
    },

    _buildProteinFamiliesPopularGenomeList: function (popularList) {

      var template = [
        "<li class='left'>",
        "<a onmouseover=ProteinFamilyDistChart.update('{0}') data-genome-href='{1}' class='genome-link ui-tabs-anchor' href='#genome-tab{2}'>{3}</a>",
        "<div class='arrow_far'></div>",
        '</li>',
        "<li class='right'>",
        "<a onmouseover=ProteinFamilyDistChart.update('{4}') data-genome-href='{5}' class='genome-link ui-tabs-anchor' href='#genome-tab{6}'>{7}</a>",
        "<div class='arrow'></div>",
        '</li>'
      ].join('\n');

      var rtn = ["<ul class='no-decoration genome-list tab-headers third'>"];
      for (var i = 0, len = popularList.length / 2; i < len; i++) {
        var idxLeft = i;
        var idxRight = i + 11;

        rtn.push(lang.replace(template, [JSON.stringify(popularList[idxLeft].popularData), popularList[idxLeft].link, idxLeft, popularList[idxLeft].popularName, JSON.stringify(popularList[idxRight].popularData), popularList[idxRight].link, idxRight, popularList[idxRight].popularName]));
      }
      rtn.push('</ul>');

      return rtn;
    },
    _activateProteinFamiliesPopularGenomeListTab: function () {
      var links = domQuery('.data-box.popular-box .genome-link');
      links.forEach(function (link) {

        link.addEventListener('click', function (evt) {
          var target = evt.target || evt.srcElement;
          var link = target.dataset.genomeHref;
          Topic.publish('/navigate', { href: link, target: 'blank' });
        });
        link.addEventListener('mouseover', function (evt) {
          var target = evt.target || evt.srcElement;
          // var targetTab = target.hash;

          domQuery('.data-box.popular-box .genome-list li').forEach(function (l) {
            domClass.remove(l, 'ui-state-active');
          });
          domClass.add(target.parentElement, 'ui-state-active');
        });
      });

      this._initialSelection(links[0]);
    },

    _buildProteinFamiliesPopularPanel: function () {

      return [
        "<div class='genome-data right half'>",
        "<div id='dlp-proteinfamilies-dist-genus'>",
        '</div>',
        '</div>'];
    },

    _renderProteinFamiliesByGenus: function () {

      window.ProteinFamilyDistChart = new HistogramChart();
      window.ProteinFamilyDistChart.init('#dlp-proteinfamilies-dist-genus', 'dlp');
      window.ProteinFamilyDistChart.renderTitle('Conservation Across %Genomes', '# of Protein Families');
    },

    _renderProteinFamiliesDistribution: function (data) {
      var legend = { 'f': 'Functional', 'v': 'Hypothetical' };
      var processed = data.map(function (datum, i) {
        return {
          index: i,
          label: datum.pathogen,
          genomes: datum.genomes,
          total: parseInt(datum.total),
          tooltip: function (d, idx, dataSet) {
            return lang.replace('Genus: {0}<br/>Data: {1}<br/>Count: {2}', [d.label, legend[dataSet[idx]], d[dataSet][idx]]);
          },
          cva: [parseInt(datum.core), parseInt(datum.accessory)],
          fvh: [parseInt(datum.functional), parseInt(datum.hypothetical)]
        };
      });

      var targetNode = domQuery('#dlp-proteinfamilies-dist-genera')[0];
      var pfChart = new proteinFamiliesChart();
      pfChart.init(targetNode);
      pfChart.renderNav(proteinfamilyNavBarHtml);
      pfChart.renderLegend('Legend: ', proteinfamilyLegend.fvh);
      pfChart.render(processed);
    },

    _setSpecialtyGenesAttr: function (data) {

      var popularList = data.popularGenomes.popularList;

      var popularTabList = this._buildSpecialtyGenesPopularPanel(popularList);
      var popularListUl = this._buildPopularGenomeList(popularList);

      var tabDiv = domQuery('.data-box.popular-box div.group')[0];

      var popularTabNode = domConstruct.toDom(popularTabList.join(''));
      var popularListNode = domConstruct.toDom(popularListUl.join(''));

      domConstruct.place(popularTabNode, tabDiv);
      domConstruct.place(popularListNode, tabDiv);

      this._activatePopularGenomeListTab();
    },

    _buildSpecialtyGenesPopularPanel: function (popularList) {

      var template = [
        "<div class='genome-data right half group no-decoration hidden' id='genome-tab{0}'>",
        "<div class='far2x'>",
        "<div class='left left-align-text'>",
        '<h3>Specialty Genes:</h3>',
        '{1}',
        "<div class='clear'></div>",
        '</div>',
        "<div class='clear'></div>",
        '</div>',
        '<h3>Explore Genomic Features in </h3>',
        "<div class='three-quarter'>{2}</div>",
        '</div>'
      ].join('\n');

      return popularList.map(function (genome, idx) {

        var specialtyGenes = genome.specialtyGenes.map(function (spg) {
          return lang.replace(attributeTemplate, { attr: spg });
        }).join('\n');

        var links = genome.links.map(function (link, i) {
          if (i % 2) { // odd
            return lang.replace("<a class='right' href='{0}'>{1}</a><br/>", [link.link, link.name]);
          }
          return lang.replace("<a class='left' href='{0}'>{1}</a>", [link.link, link.name]);

        }).join('\n');

        return lang.replace(template, [(idx + 1), specialtyGenes, links]);
      });
    },

    _setTranscriptomicsAttr: function (data) {

      // select genomes
      var popularList = data.popularGenomes.popularList;

      var popularTabList = this._buildTranscriptomicsPopularPanel();
      var popularListUl = this._buildTranscriptomicsPopularGenomeList(popularList);

      var tabDiv = domQuery('.data-box.popular-box div.group')[0];

      var popularTabNode = domConstruct.toDom(popularTabList.join(''));
      var popularListNode = domConstruct.toDom(popularListUl.join(''));

      domConstruct.place(popularTabNode, tabDiv);
      domConstruct.place(popularListNode, tabDiv);

      // render top 5 species
      this._renderTranscriptomicsTopSpecies(data.topSpecies.data);

      // render featured experiments
      this._renderTranscriptomicsFeaturedExperiments(data.featuredExperiment.data);

      // render select genomes
      this._renderTranscriptomicsPopularPanelChart();

      // this._activatePopularGenomeListTab();
      this._activateTranscriptomicsPopularGenomeListTab();
    },

    _buildTranscriptomicsPopularGenomeList: function (popularList) {

      var popularListUl = ["<ul class='no-decoration genome-list tab-headers third'>"];

      var template = [
        '<li>',
        "<a onmouseover=TranscriptomicsSelectGenome.update('{0}') class='genome-link' href='#genome-tab{1}' data-genome-href='{2}'>{3}</a>",
        "<div class='arrow'></div>",
        '</li>'
      ].join('\n');

      popularList.forEach(function (genome, idx) {
        popularListUl.push(lang.replace(template, [encodeURIComponent(JSON.stringify(genome)), (idx + 1), genome.link, genome.popularName]));
      });
      popularListUl.push('</ul>');

      return popularListUl;
    },

    _activateTranscriptomicsPopularGenomeListTab: function () {
      var links = domQuery('.data-box.popular-box .genome-link');
      links.forEach(function (link) {

        link.addEventListener('click', function (evt) {
          var target = evt.target || evt.srcElement;
          var link = target.dataset.genomeHref;

          if (event.preventDefault) event.preventDefault();
          else event.returnValue = false;

          Topic.publish('/navigate', { href: link });
        });
        link.addEventListener('mouseover', function (evt) {
          var target = evt.target || evt.srcElement;
          // var targetTab = target.hash;

          domQuery('.data-box.popular-box .genome-list li').forEach(function (l) {
            domClass.remove(l, 'ui-state-active');
          });
          domClass.add(target.parentElement, 'ui-state-active');
        });
      });

      this._initialSelection(links[0]);
    },

    _renderTranscriptomicsPopularPanelChart: function () {

      var self = this;

      self.topGeneModificationChart = new HorizontalBarChart();
      self.topGeneModificationChart.init('#dlp-transcriptomics-top-mutants', 'dlp-tr-gm', {
        top: 0,
        bottom: 38,
        left: 145
      });
      self.topGeneModificationChart.renderTitle('Experiments');
      self.topExperimentConditionChart = new HorizontalBarChart();
      self.topExperimentConditionChart.init('#dlp-transcriptomics-top-conditions', 'dlp-tr-ec', {
        top: 0,
        bottom: 38,
        left: 145
      });
      self.topExperimentConditionChart.renderTitle('Experiments');

      window.TranscriptomicsSelectGenome = (function () {
        return {
          update: function (data) {

            var processed = JSON.parse(decodeURIComponent(data));

            self.topGeneModificationChart.update(processed.GeneModifications.data);
            self.topExperimentConditionChart.update(processed.ExperimentConditions.data);
            domQuery('#dlp-transcriptomics-linkout')[0].href = processed.link;
          }
        };
      }());
    },

    _buildTranscriptomicsPopularPanel: function () {

      return [
        "<div class='genome-data right half'>",
        "<div id='dlp-transcriptomics-top-mutants'>",
        '<b>Top 5 Gene Modifications</b>',
        '</div>',
        "<div id='dlp-transcriptomics-top-conditions'>",
        '<b>Top 5 Experiment Conditions</b>',
        '</div>',
        "<p><a class='double-arrow-link' id='dlp-transcriptomics-linkout' href=''>View All Experiment for This Genome</a></p>",
        '</div>'
      ];
    },

    _renderTranscriptomicsTopSpecies: function (data) {

      // var chart = new HorizontalBarChart();
      // chart.init("#dlp-transcriptomics-top-species", "dlp-tr-top-sp", {top: 0, bottom: 0, left: 10});
      // chart.render(data);

      var container = d3.select('#dlp-transcriptomics-top-species .chart');
      var containerWidth = domStyle.get(container, 'width') || 408;
      var containerHeight = domStyle.get(container, 'height') || 272;

      var chart = d3.select('.chart')
        .insert('svg', ':first-child')
        .attr('class', 'svgChartContainer')
        .attr('width', containerWidth)
        .attr('height', containerHeight);

      var chartWidth = domStyle.get(chart, 'width') || 408;
      var chartHeight = domStyle.get(chart, 'height') || 272;

      var canvas = chart.append('g')
        .attr('class', 'svgChartCanvas')
        .attr('width', chartWidth)
        .attr('height', chartHeight);

      var upperBound = d3.max(data, function (d) {
        return d.count;
      });
      var xScale = d3.scale.linear().domain([0, upperBound]).range([0, chartWidth]);
      var yScale = d3.scale.linear().domain([0, data.length]).range([0, chartHeight]);

      var bars = canvas.selectAll('g.bar').data(data).enter().append('g');

      // add rect bar
      bars.append('rect').attr('class', function (d, i) {
        return 'bar-' + i;
      }).attr('height', 45)
        .attr('width', function (d) {
          return xScale(d.count);
        })
        .attr('y', function (d, i) {
          return yScale(i);
        })
        .attr('rx', 3)
        .attr('ry', 3)
        .on('click', function (d) {

          var url = '/view/Taxonomy/2#view_tab=transcriptomics&filter=eq(organism,' + encodeURIComponent(d.label) + ')';
          Topic.publish('/navigate', { href: url });
        });

      // add text
      bars.append('text').attr('class', 'label1')
        .attr('x', '10')
        .attr('y', function (d, i) {
          return yScale(i) + 20;
        })
        .text(function (d) {
          return d.label;
        })
        .on('click', function (d) {
          var url = '/view/Taxonomy/2#view_tab=transcriptomics&filter=eq(organism,' + encodeURIComponent(d.label) + ')';
          Topic.publish('/navigate', { href: url });
        });
      bars.append('text').attr('class', 'label2')
        .attr('x', '10')
        .attr('y', function (d, i) {
          return yScale(i) + 38;
        })
        .text(function (d) {
          return d.count + ' Experiments';
        })
        .on('click', function (d) {
          var url = '/view/Taxonomy/2#view_tab=transcriptomics&filter=eq(organism,' + encodeURIComponent(d.label) + ')';
          Topic.publish('/navigate', { href: url });
        });
    },

    _renderTranscriptomicsFeaturedExperiments: function (list) {

      var targetNode = domQuery('#dlp-transcriptomics-featured-experiments h3')[0];

      var template = [
        "<div class='far'>",
        "<img src='/patric/images/global_experiment.png' alt='Experiment'>",
        "<div class='exp-name'>",
        "<a href='{exp.link}'>{exp.title}</a>",
        "<div class='organism'>{exp.organism}</div>",
        '<div>',
        '<span>Accession: {exp.accession}</span>,',
        "<span>PubMed: <a class='arrow-slate-e' href='http://www.ncbi.nlm.nih.gov/pubmed/{exp.pmid}' target='_blank'>{exp.pmid}</a></span>",
        '</div>',
        '</div>',
        '</div>'
      ].join('\n');

      var renderedList = list.map(function (exp) {
        return lang.replace(template, { exp: exp });
      }).join('\n');

      domConstruct.place(domConstruct.toDom(renderedList), targetNode, 'after');
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments);

      this.viewer = new ContentPane({
        region: 'center',
        style: 'padding:0',
        content: ''
      });

      this.addChild(this.viewer);
    }
  });
});
