define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-construct', 'dojo/dom-attr',
  'dojo/_base/lang', 'dojo/mouse', 'dijit/_WidgetBase', 'dijit/_WidgetsInTemplateMixin',
  'dojo/topic', 'dijit/_TemplatedMixin', 'dojo/text!./templates/AdvancedDownload.html',
  'dijit/Dialog', 'dojo/query'

], function (
  declare, on, domConstruct, domAttr,
  lang, Mouse, WidgetBase, WidgetsInTemplate,
  Topic, TemplatedMixin, Template,
  Dialog, query
) {
  return declare([WidgetBase, TemplatedMixin, WidgetsInTemplate], {
    templateString: Template,
    downloadableConfig: {
      genome_data: {
        label: 'Genomes',
        dataType: 'genome',
        tableData: true,
        downloadTypes: [
          { label: 'Genomic Sequences in FASTA (*.fna)', type: 'fna', skipAnnotation: true },
          { label: 'Protein Sequences in FASTA (*.faa)', type: 'faa' },
          { label: 'Genomic features in Generic Feature Format format (*.gff)', type: 'gff' },
          { label: 'Genomic features in tab-delimited format (*.features.tab)', type: 'features.tab' },
          { label: 'DNA Sequences of Protein Coding Genes (*.ffn)', type: 'ffn' },
          { label: 'DNA Sequences of RNA Coding Genes (*.frn)', type: 'frn' },
          { label: 'Pathway assignments in tab-delimited format (*.pathway.tab)', type: 'pathway.tab' }
        ]
      },
      sequence_data: {
        label: 'Sequences',
        tableData: true
      },
      feature_data: {
        label: 'Features',
        tableData: true
      },
      spgene_data: {
        label: 'Specialty Genes',
        tableData: true
      },
      pathway_data: {
        label: 'Pathways',
        tableData: true
      },
      'default': {
        label: 'Items',
        tableData: true
      }
    },
    download: function () {
      var ids = this.selection.map(function (x) {
        return x.genome_id;
      });
      console.log('Downloading genomes: ', ids);
      var types = [];
      query('input', this.fileTypesTable).forEach(function (node) {
        console.log('node: ', node, node.checked, node.value);
        if (node.checked) {

          types.push(node.value);
        }
      });
      if (types.length == 0) {
        var msg = 'YOU NEED TO SELECT AT LEAST 1 FILE TYPE.';
        new Dialog({ title: 'Notice', content: msg }).show();
        return;
      }
      // new Dialog({content: "Download: " + ids + "\nTypes: " + types}).show();
      var baseUrl = (window.App.dataServiceURL ? (window.App.dataServiceURL) : '');
      var conf = this.downloadableConfig[this.containerType];

      var map = {};

      conf.downloadTypes.forEach(function (type) {
        map[type.type] = type;
      });

      var annotation = this.annotationType.get('value');

      types = types.map(function (type) {
        if (map[type] && (map[type].skipAnnotation || annotation == 'all' || !annotation)) {
          return '*.' + type;
        }
        return '*' + annotation + '.' + type;

      });

      if (baseUrl.charAt(-1) !== '/') {
        baseUrl += '/';
      }

      var form = domConstruct.create('form', {
        style: 'display: none;',
        id: 'downloadForm',
        enctype: 'application/x-www-form-urlencoded',
        name: 'downloadForm',
        method: 'post',
        action: baseUrl + 'bundle/' + conf.dataType + '/'
      }, this.domNode);
      domConstruct.create('input', {
        type: 'hidden',
        name: 'archiveType',
        value: this.archiveType.get('value')
      }, form);
      var typesNode = document.createElement('input');
      typesNode.setAttribute('type', 'hidden');
      typesNode.setAttribute('name', 'types');
      typesNode.setAttribute('value', types.join(','));
      form.appendChild(typesNode);

      var qNode = document.createElement('input');
      qNode.setAttribute('type', 'hidden');
      qNode.setAttribute('name', 'q');
      qNode.setAttribute('value', 'in(genome_id,(' + ids.join(',') + '))');
      form.appendChild(qNode);

      console.log('FORM SUBMIT: ', form);
      form.submit();

    },
    selection: null,
    _setSelectionAttr: function (val) {
      // console.log("AdvancedDownload _setSelectionAttr: ", val);
      this.selection = val;

    },
    containerType: '',
    startup: function () {
      if (this.selection) {
        this.selectionNode.innerHTML = this.selection.length;
      }
      domConstruct.empty(this.fileTypesTable);
      if (this.containerType) {

        if (this.downloadableConfig[this.containerType]) {
          var conf = this.downloadableConfig[this.containerType];
          this.typeLabelNode.innerHTML = conf.label;
          // console.log("Advanced Download Conf: ", conf)
          for (var x = 0; x < conf.downloadTypes.length; x += 2) {
            var row = domConstruct.create('tr', {}, this.fileTypesTable);
            var left = conf.downloadTypes[x];
            domConstruct.create('td', {
              style: 'padding:4px;',
              innerHTML: '<input type="checkbox" name="fileType" value="' + left.type + '"></input>&nbsp;' + left.label
            }, row);

            var right = conf.downloadTypes[x + 1];
            if (right) {
              domConstruct.create('td', {
                style: 'padding:4px;',
                innerHTML: '<input type="checkbox" name="fileType" value="' + right.type + '"></input>&nbsp;' + right.label
              }, row);
            }
          }
        }

      }

    }
  });

});
