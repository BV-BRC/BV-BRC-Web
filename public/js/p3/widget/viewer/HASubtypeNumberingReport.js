define([
  'dojo/_base/declare', 'dojo/on', 'dojo/_base/lang', 'dojo/query', './Base', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  '../../WorkspaceManager', '../ActionBar', '../ItemDetailPanel', 'dijit/form/CheckBox', 'dijit/TooltipDialog', 'dijit/popup',
  'dijit/Dialog', 'FileSaver'
], function (
  declare, on, lang, query, Base, ContentPane, domConstruct,
  WorkspaceManager, ActionBar, ItemDetailPanel, CheckBox, TooltipDialog, popup,
  Dialog, saveAs
) {

  const HaReferenceTypes = [
    {commonName: 'H1_PR34', fullName: 'A/Puerto/Rico/8/34'},
    {commonName: 'H1_1933', fullName: 'A/United/Kingdom/1/1933'},
    {commonName: 'H1post1995', fullName: 'A/NewCaledonia/20/1999'},
    {commonName: 'H1N1pdm', fullName: 'A/California/04/2009'},
    {commonName: 'H2', fullName: 'A/Singapore/1/1957'},
    {commonName: 'H3', fullName: 'A/AICHI/2/68'},
    {commonName: 'H4', fullName: 'A/swine/Ontario/01911-1/99'},
    {commonName: 'H5mEA-nonGsGD', fullName: 'A/mallard/Italy/3401/2005 (LPAI)'},
    {commonName: 'H5', fullName: 'A/Vietnam/1203/04 (HPAI)'},
    {commonName: 'H5c221', fullName: 'A/chicken/Egypt/0915-NLQP/2009 (HPAI)'},
    {commonName: 'H6', fullName: 'A/chicken/Taiwan/0705/99'},
    {commonName: 'H7N3', fullName: 'A/Turkey/Italy/220158/02/H7N3'},
    {commonName: 'H7N7', fullName: 'A/Netherlands/219/03/H7N7'},
    {commonName: 'H8', fullName: 'A/turkey/Ontario/6118/1968'},
    {commonName: 'H9', fullName: 'A/Swine/HK/9/98'},
    {commonName: 'H10', fullName: 'A/mallard/bavaria/3/2006'},
    {commonName: 'H11', fullName: 'A/duck/England/1/1956'},
    {commonName: 'H12', fullName: 'A/Duck/Alberta/60/1976'},
    {commonName: 'H13', fullName: 'A/gull/Maryland/704/1977'},
    {commonName: 'H14', fullName: 'A/mallard/Astrakhan/263/1982'},
    {commonName: 'H15', fullName: 'A/duck/Australia/341/1983'},
    {commonName: 'H16', fullName: 'A/black-headedgull/Turkmenistan/13/76'},
    {commonName: 'H17', fullName: 'A/little-yellow-shoulderedbat/Guatemala/060/2010'},
    {commonName: 'H18', fullName: 'A/flat-faced/bat/Peru/033/2010'},
    {commonName: 'B/HONG KONG/8/73', fullName: 'B/HONGKONG/8/73'},
    {commonName: 'B/FLORIDA/4/2006', fullName: 'B/FLORIDA/4/2006'},
    {commonName: 'B/HUMAN/BRISBANE/60/2008', fullName: 'B/HUMAN/BRISBANE/60/2008'}
  ];

  return declare([Base], {
    baseClass: 'HASubtype',
    id: 'haSubtypeNumberingReport.js',
    className: 'HASubtypeNumberingReport',
    loading: false,
    files: null,
    annotationFile: null,
    queryData: {},
    msaList: [],
    msaMapping: {},
    defaultMSAOptions: {
      bootstrapMenu: false,
      colorscheme: {scheme: 'taylor'},
      vis: {
        conserv: true,
        overviewbox: false,
        seqlogo: true,
        sequences: true,
        labelName: true,
        labelCommonName: true,
        labelId: false
      },
      conf: {
        dropImport: true,
        registerWheelCanvas: false,
        registerMouseHover: false,
        debug: true
      },
      zoomer: {
        menuFontsize: '12px',
        autoResize: true,
        labelNameLength: 100,
        alignmentHeight: 14.01 * this.numSequences,
        residueFont: '12',
        rowHeight: 14.01
      }
    },

    postCreate: async function () {
      // Create initial panel for the report
      this.contentPane = new ContentPane({
        region: 'center'
      });
      this.addChild(this.contentPane);

      this.selectionActionBar = new ActionBar({
        region: 'right',
        layoutPriority: 4,
        style: 'width:56px;text-align:center;',
        splitter: false,
        currentContainerWidget: this
      });
      this.itemDetailPanel = new ItemDetailPanel({
        region: 'right',
        style: 'width:300px',
        splitter: true,
        layoutPriority: 1,
        containerWidget: this
      });
      this.addChild(this.selectionActionBar);
      this.addChild(this.itemDetailPanel);
      this.itemDetailPanel.startup();
    },

    showError: function (msg) {
      this.contentPane.set('content', '<div style="background:red; color: #fff;">' + msg + '</div>');
    },

    generatePathLinks: function (path) {
      var localStorage = window.localStorage;

      // strip out /public/ of parts array
      var parts = decodeURIComponent(path).replace(/\/+/g, '/').split('/');

      if (parts[1] == 'public') {
        parts.splice(1, 1);
      }

      if (parts[0] == '') {
        parts.shift();
      }

      var out = ["<span class='wsBreadCrumb'>"];
      var bp = ['workspace'];

      var isPublic = path.replace(/\/+/g, '/').split('/')[1] == 'public';

      // if viewing all public workspaces, just create header
      if (path == '/public/') {
        out.push('<i class="icon-globe"></i> <b class="perspective">Public Workspaces</b>');

        // if viewing a specific public workspace, create bread crumbs with additional url params
      } else if (isPublic) {
        out.push('<i class="icon-globe"></i> ' +
          '<a class="navigationLink perspective" href="/' + bp.join('/') + '/public">Public Workspaces</a>' +
          ' <i class="icon-caret-right"></i> ');
        bp.push('public', parts[0]);
      }

      parts.forEach(function (part, idx) {

        if (idx == (parts.length - 1) && part.slice(0, 1) == '.') {
          part = part.replace('.', '');
        }

        // don't create links for top level path of public path
        if (isPublic && idx == 0) {
          out.push('<b class="perspective">' + ((idx == 0) ? part.replace('@' + localStorage.getItem('realm'), '') : part) + '</b> / ');
          return;
        }

        out.push("<a class='navigationLink' href='");
        bp.push(idx == 0 ? part : encodeURIComponent(part));  // leave username decoded
        out.push('/' + bp.join('/'));
        out.push("'>" + ((idx == 0) ? part.replace('@' + localStorage.getItem('realm'), '') : part) + '</a> / ');
      });
      // console.log('in generatePathLinks() out', out);
      return out.join('');
    },

    onSetState: function (attr, oldVal, state) {
      this.loading = true;

      const pathValue = this.state.pathname.match(/path=..+?(?=&|$)/);

      if (!pathValue || pathValue.length !== 1) {
        this.showError('Job path has to be provided.');
      } else {
        const jobFolder = pathValue[0].split('=')[1];

        // Create breadcrumbs
        this.pathContainer = domConstruct.create('div', { 'class': 'wsBreadCrumbContainer' }, this.contentPane.containerNode);
        this.pathContainer.innerHTML = this.generatePathLinks(jobFolder);

        WorkspaceManager.getObject(jobFolder, true).then((files) => {
          const resultFiles = files.autoMeta.output_files
            .filter(o => o[0].endsWith('_result.fasta'))
            .map(o => o[0]);

          if (!resultFiles || resultFiles.length === 0) {
            this.showError('There is no HA Subtype Numbering Conversion result in the job folder.');
          } else {
            const annotationFile = files.autoMeta.output_files.find(o => o[0].endsWith('sequence_annotation.tsv'));

            this.files = resultFiles;
            this.annotationFile = annotationFile[0];

            this.render();
          }
        }).catch(() => this.showError('Job path is invalid.'));
      }

      this.loading = false;
    },

    parseAnnotationFile: function (data) {
      let parsedData = {};

      const lines = data.split('\n');
      for (let i = 1; i < lines.length; ++i) {
        const row = lines[i].split('\t');
        parsedData[row[0]] = {
          virusType: row[1],
          segment: row[2],
          subtype: row[3],
          sequenceName: row[5]
        };
      }

      return parsedData;
    },

    parseFASTAFile: function* (fasta) {
      const fastaData = fasta.split('\n');

      let header;
      let data = [];
      for (let line of fastaData) {
        if (line[0] === '>') {
          yield {
            'header': header,
            'data': data.join('').replace(' ', '').replace('\r', '')
          };
          data = [];
          header = line.slice(1).trim();
          continue;
        }

        data.push(line.trim());
      }

      yield {
        'header': header,
        'data': data.join('').replace(' ', '').replace('\r', '')
      };
    },

    getPadding: function (total) {
      let pad = 0;
      while (parseInt((total / 10), 10) > 0) {
        pad = pad + 1;
        total = total / 10;
      }
      return pad;
    },

    getPadLineNumber: function(num, pad) {
      let compare = 10;
      let padLineNumber = '';

      for (let i = 0; i < pad; i++) {
        if (num < compare) {
          padLineNumber = padLineNumber + '0';
        }
        compare *= 10;
      }
      padLineNumber = padLineNumber + num;

      return padLineNumber;
    },

    formatSequence: function (sequence) {
      const width = 80;
      const groupSize = 10;
      const sequenceLength = sequence.length;
      const pad = this.getPadding(sequenceLength);

      let formattedSequence = [];
      for (let i = 0; i < sequence.length; i += width) {
        const end = i + width > sequence.length ? sequence.length : i + width;

        for (let j = i; j < end; j += groupSize) {
          const tempEnd = (j + groupSize < end ? j + groupSize : end);
          formattedSequence.push(sequence.substring(j, tempEnd));
          if (tempEnd != end) {
            formattedSequence.push(' ');
          }
        }

        if ((end - i) < width) {
          for (let j = 0; j < (width - (end - i)) + ((width - (end - i)) / groupSize); j++) {
            formattedSequence.push(' ');
          }
        }

        formattedSequence.push('  ' + this.getPadLineNumber(end, pad));
        formattedSequence.push('\n');
      }

      return formattedSequence.join('');
    },

    positionSequence: function (sequence) {
      let positionedSequence = [];

      let counter = 1;
      for (let c of sequence) {
        if (c !== '-') {
          positionedSequence.push(counter);
          counter = counter + 1;
        } else {
          positionedSequence.push('-');
        }
      }

      return positionedSequence;
    },

    getHeaderListForDisplay: function (headers) {
      let maxLen = 0;
      for (let header of headers) {
        if (maxLen < header.length) {
          maxLen = header.length;
        }
      }

      let headerListForDisplay = [];
      for (let header of headers) {
        let headerArr = [];
        for (let i = 0; i < maxLen + 2; ++i) {
          headerArr.push(' ');
        }

        for (let i = 0; i < header.length; ++i) {
          let c = header[i];
          headerArr[i] = c.toString();
        }

        headerListForDisplay.push(headerArr.join(''));
      }

      return headerListForDisplay;
    },

    render: async function () {
      // Title
      let title = domConstruct.create('h2', {}, this.contentPane.containerNode);
      title.innerHTML = 'HA Subtype Numbering Conversion Results';

      // Parse annotation file
      const annotationFile = await WorkspaceManager.getObject(this.annotationFile);
      const annotationData = this.parseAnnotationFile(annotationFile.data);

      // Render query result files
      for (let index = 0; index < this.files.length; ++index) {
        const resultFile = await WorkspaceManager.getObject(this.files[index]);
        const fasta = resultFile.data;

        if (!fasta || !fasta.trim()) {
          break;
        }

        // Parse fasta data as {header: '', data: '', formattedData: ''}
        let queryName = '';
        let parsedFastaArr = [];
        let headerList = [];
        const generator = this.parseFASTAFile(fasta);
        for (let result of generator) {
          if (result.header && result.data) {
            if (result.header.startsWith('query')) {
              queryName = result.header;
              headerList.push('Query');
            } else {
              headerList.push(result.header);
            }
            result.formattedData = this.formatSequence(result.data);
            result.positionedData = this.positionSequence(result.data);
            parsedFastaArr.push(result);
          }
        }

        let newLineIndexes = [];
        for (let i= 0; i < parsedFastaArr[0].formattedData.length; ++i) {
          if (parsedFastaArr[0].formattedData[i] === '\n') {
            newLineIndexes.push(i);
          }
        }

        const headerListForDisplay = this.getHeaderListForDisplay(headerList);
        let formattedAlignmentBlocks = [];
        let beginIndex = 0;
        for (let endIndex of newLineIndexes) {
          for (let i= 0; i < parsedFastaArr.length; ++i) {
            const parsedFasta = parsedFastaArr[i];
            formattedAlignmentBlocks.push(headerListForDisplay[i]);
            formattedAlignmentBlocks.push(' ');
            formattedAlignmentBlocks.push(parsedFasta.formattedData.substring(beginIndex, endIndex));

            if (i === parsedFastaArr.length - 1) {
              formattedAlignmentBlocks.push('\n');
              formattedAlignmentBlocks.push('\n');
            } else {
              formattedAlignmentBlocks.push('\n');
            }
          }
          beginIndex = endIndex + 1;
        }

        let sequenceName = annotationData[queryName].sequenceName;
        let bestHit = annotationData[queryName].subtype;
        const referenceType = HaReferenceTypes.find(t => t.commonName === bestHit);
        if (referenceType) {
          bestHit = `${bestHit} ( ${referenceType.fullName} )`;
        }

        const queryIndex = queryName.replace('query', '');
        // Create header div for the query
        let queryHeaderDiv = domConstruct.create('div', {'style': 'display: inline-block;width: 100%;'}, this.contentPane.containerNode);

        domConstruct.create('h3', {'style': 'float: left;'}, queryHeaderDiv).innerHTML = 'Query Sequence ' + queryIndex;
        let headerIconDiv = domConstruct.create('div', {'id': 'querySequenceIcon' + queryIndex, 'class': 'querySequenceIcon iconbox'}, queryHeaderDiv);
        domConstruct.create('i', {'id': 'queryIcon' + queryIndex, 'class': 'fa icon-caret-left fa-1'}, headerIconDiv);

        let queryCheckBox = new CheckBox({
          id: 'queryCheckBox' + queryIndex,
          style: 'float: left;margin-right: 1em;',
          'class': 'queryCheckBox'
        });
        this.msaMapping[queryIndex] = index;
        queryCheckBox.placeAt(queryHeaderDiv, 'first');
        // Main <div> for each query
        let queryDiv = domConstruct.create('div', {'id': 'querySequence' + queryIndex, 'style': 'margin-bottom: 2em;'}, this.contentPane.containerNode);

        // Create sequence info <div>
        domConstruct.create('div', {'style': 'margin-top: 1em;margin-bottom: 1em;'}, queryDiv)
          .innerHTML = `<b>Query: </b>${sequenceName}<br><b>Closest Reference sequence: </b>${bestHit}`;

        const formattedAlignment = formattedAlignmentBlocks.join('');
        let formattedFastaDiv = domConstruct.create('div', {'style': 'position: relative;padding: 0 5px;height: 300px;overflow-y: auto;margin-bottom: 1em;'}, queryDiv);
        domConstruct.create('pre', {'style': 'font-family: monospace;'}, formattedFastaDiv).innerHTML = formattedAlignment;

        // Create header for the MSA viewer
        domConstruct.create('h3', {'style': 'margin-top: 1em;margin-bottom: 1em;'}, queryDiv).innerHTML = 'Alignment Viewer';

        // Generate MSA viewer
        let msaDiv = domConstruct.create('div', {'style': 'margin-top: 1em;width: 100%;display: inline-block;overflow-y: visible;vertical-align: bottom;'}, queryDiv);

        let opts = this.defaultMSAOptions;
        opts.seqs = parsedFastaArr.reduce((r, f, i) => {
          r.push({id: i, seq: f.data, name: f.header});

          return r;
        }, []);
        opts.el = msaDiv;
        opts.zoomer.alignmentHeight = 14.01 * parsedFastaArr.length;

        let msaObj = new msa.msa(opts);
        msaObj.render();
        this.msaList.push(msaObj);

        // Create header for the numbering conversion
        domConstruct.create('h3', {'style': 'margin-top: 1em;margin-bottom: 1em;'}, queryDiv).innerHTML = 'Numbering Conversion Result';

        // Create numbering conversion div
        let numberingConversionDiv = domConstruct.create('div', {'style': 'width: 100%;height: 300px;overflow-y: auto;'}, queryDiv);

        // Create mapping table
        let mappingTable = domConstruct.create('table', {'class': 'p3basic striped'}, numberingConversionDiv);

        // Create mapping table header
        let conversionTableData = [];
        let mappingTableHead = domConstruct.create('thead', {}, mappingTable);
        let mappingTableHeadRow = domConstruct.create('tr', {}, mappingTableHead);
        headerList.forEach(header => {
          domConstruct.create('th', {}, mappingTableHeadRow).innerHTML = header;
          conversionTableData.push(header);
          conversionTableData.push('\t');
        });
        headerList.forEach(header => {
          domConstruct.create('th', {}, mappingTableHeadRow).innerHTML = header;
          conversionTableData.push(header);
          conversionTableData.push('\t');
        });
        conversionTableData.pop();
        conversionTableData.push('\n');

        // Create mapping table body
        let mappingTableBody = domConstruct.create('tbody', {}, mappingTable);
        for (let i = 0; i < parsedFastaArr[0].data.length; ++i) {
          let row = domConstruct.create('tr', {}, mappingTableBody);

          for (let j = 0; j < headerList.length; j++) {
            domConstruct.create('td', {}, row).innerHTML = parsedFastaArr[j].positionedData[i];
            conversionTableData.push(parsedFastaArr[j].positionedData[i]);
            conversionTableData.push('\t');
          }
          for (let j = 0; j < headerList.length; j++) {
            domConstruct.create('td', {}, row).innerHTML = parsedFastaArr[j].data[i];
            conversionTableData.push(parsedFastaArr[j].data[i]);
            conversionTableData.push('\t');
          }

          conversionTableData.pop();
          conversionTableData.push('\n');
        }

        this.queryData[queryName] = {};
        this.queryData[queryName].fasta = fasta.replace(queryName, sequenceName);
        this.queryData[queryName].alignment = formattedAlignment;
        this.queryData[queryName].conversion = conversionTableData.join('');
      }

      this.initializeListeners();
      this.setupActions();
    },

    initializeListeners: function () {
      // Toggle query section
      on(query('.querySequenceIcon'), 'click', function () {
        const index = this.id.replace('querySequenceIcon', '');
        let qs = query('#querySequence' + index)[0];
        qs.turnedOn = (qs.style.display != 'none');
        if (!qs.turnedOn) {
          qs.turnedOn = true;
          qs.style.display = 'block';
          query('#queryIcon' + index)[0].className = 'fa icon-caret-left fa-1';
        }
        else {
          qs.turnedOn = false;
          qs.style.display = 'none';
          query('#queryIcon' + index)[0].className = 'fa icon-caret-down fa-1';
        }
      });
    },

    setupActions: function () {
      var _self = this;

      // Setup ID Type action menu
      const idTypeOptions = [
        '<div class="wsActionTooltip" rel="SimplifiedNames">Simplified Names</div>',
        '<div class="wsActionTooltip" rel="StrainNames">Strain Names</div>'
      ];

      let idTypeMenu = new TooltipDialog({
        content: idTypeOptions,
        onMouseLeave: function () {
          popup.close(idTypeMenu);
        }
      });

      on(idTypeMenu.domNode, 'click', function (evt) {
        const rel = evt.target.attributes.rel.value;

        let index = 1;
        _self.msaList.forEach(m => {
          let labelNameLength = 100;
          for (let i = 0; i < m.seqs.length; ++i) {
            const name = m.seqs.at(i).get('name');
            const type = HaReferenceTypes.find(t => t.commonName === name || t.fullName === name)
            if (rel && type) {
              m.seqs.at(i).set('name', rel === 'SimplifiedNames' ? type.commonName : type.fullName);
            }
          }

          query(`#querySequence${index} .biojs_msa_labels > span`).forEach(l => {
            if (l.offsetWidth > labelNameLength) {
              labelNameLength = l.offsetWidth;
            }
          });

          m.g.zoomer.set('labelNameLength', labelNameLength);

          index = index + 1;
        });

        popup.close(idTypeMenu);
      });

      this.selectionActionBar.addAction(
        'IDSelection',
        'fa icon-pencil-square fa-2x',
        {
          label: 'ID TYPE',
          persistent: true,
          validTypes: ['*'],
          validContainerTypes: ['*'],
          tooltip: 'Set ID Type',
          tooltipDialog: idTypeMenu,
          ignoreDataType: true
        },
        function () {
          popup.open({
            popup: _self.selectionActionBar._actions.IDSelection.options.tooltipDialog,
            around: _self.selectionActionBar._actions.IDSelection.button,
            orient: ['below']
          });
        },
        true
      );

      // Setup Download action menu
      const downloadOptions = [
        '<div class="wsActionTooltip" rel="MSAImage">MSA Image</div>',
        '<div class="wsActionTooltip" rel="MSATXT">MSA Alignment TXT</div>',
        '<div class="wsActionTooltip" rel="MSAFASTA">MSA Aligned FASTA</div>',
        '<div class="wsActionTooltip" rel="NumberingTable">Numbering Table</div>'
      ];

      let downloadMenu = new TooltipDialog({
        content: downloadOptions,
        onMouseLeave: function () {
          popup.close(downloadMenu);
        }
      });

      on(downloadMenu.domNode, 'click', function (evt) {
        const checkedBoxes = query('.queryCheckBox > input[type=checkbox]:checked');

        if (checkedBoxes.length === 0) {
          let errorDialog = new Dialog({
            title: 'No Query Selected',
            style: 'min-width: 500px;',
            content: 'Please select one or more queries to download data.'
          });
          errorDialog.show();
        } else {
          const rel = evt.target.attributes.rel.value;

          for (let checkedBox of checkedBoxes) {
            const index = checkedBox.id.replace('queryCheckBox', '');
            if (rel === 'MSAImage') {
              const msaIndex = _self.msaMapping[index];
              msa.utils.export.saveAsImg(_self.msaList[msaIndex], `BVBRC_MSA_Query_${index}.png`);
            } else if (rel === 'MSATXT') {
              saveAs(new Blob([_self.queryData['query' + index].alignment]), `BVBRC_MSA_Query_${index}_Alignment.txt`);
            } else if (rel === 'MSAFASTA') {
              saveAs(new Blob([_self.queryData['query' + index].fasta]), `BVBRC_MSA_Query_${index}.fasta`);
            } else if (rel === 'NumberingTable') {
              saveAs(new Blob([_self.queryData['query' + index].conversion]), `BVBRC_MSA_Query_${index}_Conversion_Table.txt`);
            }
          }
        }

        popup.close(downloadMenu);
      });

      this.selectionActionBar.addAction(
        'Download',
        'fa icon-download fa-2x',
        {
          label: 'DWNLD',
          persistent: true,
          validTypes: ['*'],
          validContainerTypes: ['*'],
          tooltip: 'Download Data',
          tooltipDialog: downloadMenu,
          ignoreDataType: true
        },
        function () {
          popup.open({
            popup: _self.selectionActionBar._actions.Download.options.tooltipDialog,
            around: _self.selectionActionBar._actions.Download.button,
            orient: ['below']
          });
        },
        true
      );
    }
  });
});