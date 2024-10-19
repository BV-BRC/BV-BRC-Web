define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/store/Memory', 'dojo/text!./templates/SFVTSearch.html', 'dojo/query',
  './TextInputEncoder', './SearchBase', './FacetStoreBuilder', './PathogenGroups', '../../util/PathJoin', 'dojo/request/xhr',
  'dijit/Dialog', 'dojo/on', 'dojo/when', 'dojo/dom-construct'
], function (
  declare, lang, Memory, template, query,
  TextInputEncoder, SearchBase, storeBuilder, pathogenGroupStore, PathJoin, xhr,
  Dialog, on, when, domConstruct
) {

  const influenzaSegmentMapping = {
    'PB2': '1',
    'PB1': '2',
    'PB1-F2': '2',
    'PA': '3',
    'HA': '4',
    'NP': '5',
    'NA': '6',
    'M1': '7',
    'M2': '7',
    'NS1': '8',
    'NS2': '8'
  };

  const otherPathogenGroups = {
    '10244': 'Monkeypox virus'
  };

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '');
  }

  function escapeSpecialCharacters(str) {
    return str.replace(/([[\]])/g, '\\$1');
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Sequence Feature Variant Type (SFVT) Search - BETA',
    pageTitle: 'Sequence Feature Variant Type Search | BV-BRC',
    dataKey: 'genome_feature',
    resultUrlBase: '/view/Taxonomy/{taxon_id}?',
    resultUrlHash: '#view_tab=sfvt',
    defaultTaxonId: '11320',
    proteinOptions: ['12637'],
    segmentOptions: ['11320'],
    sfvtSequenceErrorMessage: 'There are too many Sequence Feature hits. Please refine Sequence Feature Variant Type Sequence pattern to narrow down the results.',
    sfvtMaxLimit: 300,
    mpoxGeneProductMapping: {},

    startup: function () {
      let sfvtSeqSearchButton = query('#sfvt-seq-search')[0];
      sfvtSeqSearchButton.info_dialog = new Dialog({
        content: '<section id="sfvt-seq-section" style="overflow-y: auto; max-height: 400px;">\n' +
          '  <h2>SFVT Sequence</h2>\n' +
          '  <p>Use this advanced search function to find Sequence Features (SFs) that match specific Sequence Feature Variant Type (SFVT) patterns.</p>\n' +
          '  <br>\n' +
          '\n' +
          '  <p><strong>Examples:</strong></p>\n' +
          '  <ul style="list-style-type: none;">\n' +
          '    <li style="padding-left: 1em;"><strong>Exact Match:</strong> Use "RER" to find sequences that are exactly "RER".</li>\n' +
          '    <li style="padding-left: 1em;"><strong>Starts With:</strong> Use "RER*" to find sequences that start with "RER" and are followed by any characters (e.g., "REX", "REXY", "REXYZ").</li>\n' +
          '    <li style="padding-left: 1em;"><strong>Ends With:</strong> Use "*RE" to find sequences that end with "RE" and are preceded by any characters.</li>\n' +
          '    <li style="padding-left: 1em;"><strong>Includes:</strong> Use "*RERE*" to find sequences that contain "RERE" anywhere within them.</li>\n' +
          '    <li style="padding-left: 1em;"><strong>Insertion:</strong> Use "RER[*" or "RER[EGG]* to find sequences that start with "RER" followed by an insertion.</li>\n' +
          '    <li style="padding-left: 1em;"><strong>Deletion:</strong> Use "*K-----N*" to find sequences that include "K-----N" anywhere within them, indicating a deletion.</li>\n' +
          '  </ul>\n' +
          '</section>',
        'class': 'helpModal',
        draggable: true,
        style: 'max-width: 50%;'
      });
      sfvtSeqSearchButton.open = false;
      on(sfvtSeqSearchButton, 'click', function () {
        if (!sfvtSeqSearchButton.open) {
          sfvtSeqSearchButton.open = true;
          sfvtSeqSearchButton.info_dialog.show();
        } else {
          sfvtSeqSearchButton.open = false;
          sfvtSeqSearchButton.info_dialog.hide();
        }
      });
    },

    postCreate: function () {
      this.inherited(arguments);

      this.additionalMetadataNode.addOption([
        {
          value: 'Clade I',
          label: 'Clade I'
        }, {
          value: 'Clade II',
          label: 'Clade II'
        }
      ]);
      storeBuilder('sequence_feature', 'taxon_id').then(lang.hitch(this, (store) => {
        // Display correct names based on taxon id
        for (let item of store.data) {
          const taxon = pathogenGroupStore.data.find(pathogen => pathogen.id == item.id);
          if (taxon) {
            item.name = taxon.name;
          } else if (otherPathogenGroups[item.id]) {
            item.name = otherPathogenGroups[item.id];
          }
        }
        this.pathogenGroupNode.store = store;
        if (this.defaultTaxonId) {
          this.pathogenGroupNode.set('value', this.defaultTaxonId);
        }
      }));

      storeBuilder('sequence_feature', 'sf_category').then(lang.hitch(this, (store) => {
        for (let item of store.data) {
          this.sequenceFeatureTypeNode.addOption(
            {
              value: item.name,
              label: item.name.charAt(0).toUpperCase() + item.name.slice(1)
            });
        }
      }));

      // Retrieve product values for gene
      let self = this;
      when(xhr.post(PathJoin(window.App.dataAPI, '/sequence_feature/'), {
        handleAs: 'json',
        headers: {
          Accept: 'application/solr+json',
          'Content-Type': 'application/solrquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        data: 'q=taxon_id:10244&fl=gene,product&group=true&group.field=gene'
      }), function (response) {
        if (response && response.grouped && response.grouped.gene) {
          response.grouped.gene.groups.forEach(group => {
            const gene = group.groupValue;
            const product = group.doclist.docs[0].product;
            self.mpoxGeneProductMapping[gene] = product;
          });
        }
      });
    },

    onPathogenChange: function () {
      const taxonId = this.pathogenGroupNode.value;
      this.sfvtSequenceMessage.innerHTML = '';

      //Clear multi select values
      /*this.virusTypeNode.set('options', []);
      this.virusTypeNode.reset();*/
      this.subtypeHNode.set('options', []);
      this.subtypeHNode.reset();
      this.subtypeNNode.set('options', []);
      this.subtypeNNode.reset();
      this.geneNode.set('options', []);
      this.geneNode.reset();
      this.additionalMetadataNode.set('value', []);
      this.additionalMetadataNode._updateSelection();
      //this.additionalMetadataNode.set('options', []);
      //this.additionalMetadataNode.reset();

      //Update virus type multi select values with selected pathogen
      const condition = 'taxon_id:' + taxonId;
      storeBuilder('sequence_feature', 'subtype', condition).then(lang.hitch(this, (store) => {
        let hItems = [];
        let nItems = [];

        // Separate items based on their prefix
        for (let item of store.data) {
          if (item.name.startsWith('H')) {
            hItems.push({
              value: item.name,
              label: item.name.substring(1)
            });
          } else if (item.name.startsWith('N')) {
            nItems.push({
              value: item.name,
              label: item.name.substring(1)
            });
          }
        }

        // Sort 'H' and 'N' items numerically by their suffix
        hItems.sort((a, b) => parseInt(a.label) - parseInt(b.label));
        nItems.sort((a, b) => parseInt(a.label) - parseInt(b.label));

        // Add sorted 'H' and 'N' items to nodes
        this.subtypeHNode.addOption(hItems);
        this.subtypeNNode.addOption(nItems);
      }));

      storeBuilder('sequence_feature', 'gene', condition).then(lang.hitch(this, (store) => {
        let geneOptions = [];
        for (let item of store.data) {
          if (taxonId === this.defaultTaxonId) { // Influenza
            const segmentNo = influenzaSegmentMapping[item.name];
            geneOptions.push(
              {
                value: item.name,
                label: segmentNo ? `${segmentNo} / ${item.name}` : item.name
              });
          } else {
            const product = this.mpoxGeneProductMapping[item.name];
            geneOptions.push(
              {
                value: item.name,
                label: product ? `${item.name} - ${product}` : item.name
              });
          }
        }

        geneOptions.sort((a, b) => a.label.localeCompare(b.label));

        this.geneNode.addOption(geneOptions);
      }));

      const customFilters = query('.customFilter');
      if (this.segmentOptions.includes(taxonId)) {
        const options = query('#options1')[0];
        customFilters.forEach(function (container) {
          domConstruct.place(container, options, 'last');
        });

        query('.proteinOptions').style('display', 'none');
        query('.segmentOptions').style('display', 'block');
      } else {
        const options = query('#options2')[0];
        customFilters.forEach(function (container) {
          domConstruct.place(container, options, 'last');
        });

        query('.segmentOptions').style('display', 'none');
        query('.proteinOptions').style('display', 'block');
      }

      // Specific monkeypox option
      if (taxonId === '10244') {
        /*storeBuilder('sequence_feature', 'additional_metadata', condition).then(lang.hitch(this, (store) => {
          let metadataOptions = [];
          for (let item of store.data) {
            metadataOptions.push({
              value: item.name,
              label: item.name
            });
          }

          this.additionalMetadataNode.addOption(metadataOptions);
        }));*/

        query('.monkeypox').style('display', 'block');
      } else {
        query('.monkeypox').style('display', 'none');
      }

      query('.sfvtOptions').style('display', 'block');
      query('#pathogenInfoDiv').style('display', 'none');
    },

    buildDefaultColumns: function () {
      const taxonId = this.pathogenGroupNode.value;

      // Reorganize table columns for Monkeypox virus
      return taxonId === '10244' ? '-source_strain,additional_metadata' : '';
    },

    buildFilter: async function () {
      this.sfvtSequenceMessage.innerHTML = '';

      let filterArr = [];
      let sfQueryArr = [];

      // Update taxon id to redirect correct taxonomy page
      const pathogenGroupValue = this.pathogenGroupNode.get('value');
      if (pathogenGroupValue !== '') {
        this.resultUrlBase = this.resultUrlBase.replace('{taxon_id}', pathogenGroupValue);
      }

      const keywordValue = this.keywordNode.get('value');
      if (keywordValue !== '') {
        filterArr.push(`keyword(${TextInputEncoder(sanitizeInput(keywordValue))})`);
      }

      /*const virusTypeValue = this.virusTypeNode.get('value');*/

      const geneValue = this.geneNode.get('value');
      if (geneValue.length === 1) {
        filterArr.push(`eq(gene,"${sanitizeInput(geneValue[0])}")`);
        sfQueryArr.push(`eq(gene,${sanitizeInput(geneValue[0])})`);
      } else if (geneValue.length > 1) {
        filterArr.push(`or(${geneValue.map(v => `eq(gene,"${sanitizeInput(v)}")`)})`);
        sfQueryArr.push(`in(gene,(${geneValue.join(',')}))`);
      }

      const subtypeHValue = this.subtypeHNode.get('value');
      const subtypeNValue = this.subtypeNNode.get('value');
      let subtypeValue = subtypeHValue.concat(subtypeNValue);

      // Update subtype options if any gene selected
      if (geneValue.length > 0) {
        const containsHA = geneValue.includes('HA');
        const containsNA = geneValue.includes('NA');
        const containsOtherProteins = geneValue.some(v => v !== 'HA' && v !== 'NA');

        // Add "ALL" to subtypeValue if geneValue contains HA and/or NA and another protein
        if (((containsHA || containsNA) && subtypeValue.length > 0) && containsOtherProteins) {
          subtypeValue.push('ALL');
        }

        // Add all H types if HA, NA and only N type selected
        // Add all N types if HA, NA and only H type selected
        if (containsHA && containsNA) {
          if (subtypeNValue.length > 0 && subtypeHValue.length === 0) {
            const allHTypes = this.subtypeHNode.get('options').map(h => h.value);
            subtypeValue = subtypeValue.concat(allHTypes);
          } else if (subtypeHValue.length > 0 && subtypeNValue.length === 0) {
            const allNTypes = this.subtypeNNode.get('options').map(n => n.value);
            subtypeValue = subtypeValue.concat(allNTypes);
          }
        }
      }

      if (subtypeValue.length === 1) {
        filterArr.push(`eq(subtype,"${sanitizeInput(subtypeValue[0])}")`);
        sfQueryArr.push(`eq(subtype,${sanitizeInput(subtypeValue[0])})`);
      } else if (subtypeValue.length > 1) {
        filterArr.push(`or(${subtypeValue.map(v => `eq(subtype,"${sanitizeInput(v)}")`)})`);
        sfQueryArr.push(`in(subtype,(${subtypeValue.join(',')}))`);
      }

      const sequenceFeatureTypeValue = this.sequenceFeatureTypeNode.get('value');
      if (sequenceFeatureTypeValue.length === 1) {
        filterArr.push(`eq(sf_category,"${sanitizeInput(sequenceFeatureTypeValue[0])}")`);
        sfQueryArr.push(`eq(sf_category,${sanitizeInput(sequenceFeatureTypeValue[0])})`);
      } else if (sequenceFeatureTypeValue.length > 1) {
        filterArr.push(`or(${sequenceFeatureTypeValue.map(v => `eq(sf_category,"${sanitizeInput(v)}")`)})`);
        sfQueryArr.push(`in(sf_category,(${sequenceFeatureTypeValue.join(',')}))`);
      }

      const additionalMetadataValue = this.additionalMetadataNode.get('value');
      if (additionalMetadataValue.length === 1) {
        filterArr.push(`eq(additional_metadata,"${TextInputEncoder(sanitizeInput(additionalMetadataValue[0]))}")`);
        sfQueryArr.push(`eq(additional_metadata,${TextInputEncoder(sanitizeInput(additionalMetadataValue[0]))})`);
      } else if (additionalMetadataValue.length > 1) {
        filterArr.push(`or(${additionalMetadataValue.map(v => `eq(additional_metadata,"${TextInputEncoder(sanitizeInput(v))}")`)})`);
        sfQueryArr.push(`in(additional_metadata,(${additionalMetadataValue.join(',')}))`);
      }

      /*const startValue = parseInt(this.aaCoordinatesStartNode.get('value'));
      if (!isNaN(startValue)) {
        // gt
        filterArr.push(`gt(start,${startValue})`);
      }

      const endValue = parseInt(this.aaCoordinatesEndNode.get('value'));
      if (!isNaN(endValue)) {
        // lt
        filterArr.push(`lt(end,${endValue})`);
      }*/

      /*const aaCoordinatesStartValue = parseInt(this.aaCoordinatesStartNode.get('value'));
      const aaCoordinatesEndValue = parseInt(this.aaCoordinatesEndNode.get('value'));
      if (!isNaN(aaCoordinatesStartValue) && !isNaN(aaCoordinatesEndValue)) {
        // between
        filterArr.push(`between(aa_coordinates,${aaCoordinatesStartValue},${aaCoordinatesEndValue})`);
      } else if (!isNaN(aaCoordinatesStartValue)) {
        // gt
        filterArr.push(`gt(aa_coordinates,${aaCoordinatesStartValue})`);
      } else if (!isNaN(aaCoordinatesEndValue)) {
        // lt
        filterArr.push(`lt(aa_coordinates,${aaCoordinatesEndValue})`);
      }*/

      // Fetch sf_id's if sfvt sequence is provided
      const sfvtSequenceValue = this.sfvtSequenceNode.get('value');
      if (sfvtSequenceValue !== '') {
        const sfvtQuery = '?in(sfvt_sequence,(' + encodeURIComponent(escapeSpecialCharacters(sfvtSequenceValue)) + '))&select(sf_id)&limit(2500000)';
        const sfvtResponse = await xhr.post(PathJoin(window.App.dataAPI, 'sequence_feature_vt', sfvtQuery), {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/solrquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          },
          handleAs: 'json',
          data: {
            q: 'sfvt_sequence:' + escapeSpecialCharacters(sfvtSequenceValue),
            fl: 'sf_id',
            group: 'true',
            'group.field': 'sf_id',
            rows: '1000000'
          }
        });
        const groups = sfvtResponse.sf_id.groups;
        let sfIds = groups.map(g => g.groupValue);

        if (sfIds.length > 400) {
          this.sfvtSequenceMessage.innerHTML = this.sfvtSequenceErrorMessage;
          throw Error('There are more than 100 sequence feature hits');
        }

        // Filter SF IDs if there are other selections
        if (sfIds.length > 0 && filterArr.length !== 0) {
          const sfQuery = 'in(sf_id,(' + sfIds.map(id => encodeURIComponent(`"${id}"`)) + '))&select(sf_id)&limit(' + sfIds.length + ')&' + sfQueryArr.join('&');
          const sfList = await xhr.post(PathJoin(window.App.dataAPI, 'sequence_feature'), {
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            handleAs: 'json',
            'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
            data: sfQuery
          });
          sfIds = sfList.map(sf => sf.sf_id);
        }

        if (sfIds.length > 300) {
          this.sfvtSequenceMessage.innerHTML = this.sfvtSequenceErrorMessage;
          throw Error('There are more than 100 sequence feature hits');
        }
        filterArr.push(`or(${sfIds.map(id => `eq(sf_id,"${sanitizeInput(id)}")`)})`);
      }

      if (filterArr.length === 1) {
        return filterArr;
      } else if (filterArr.length > 1) {
        return `and(${filterArr.join(',')})`;
      }
      return '';
    },

    onSegmentChange: function (evt) {
      const hasHA = evt.includes('HA');
      const hasNA = evt.includes('NA');

      // Show or hide the subtype options
      query('.subtypeOptions').style('display', (hasHA || hasNA) ? 'block' : 'none');

      // Show or hide the H and N type selections based on the selected values
      query('#hTypeSelection').style('display', hasHA ? 'block' : 'none');
      query('#nTypeSelection').style('display', hasNA ? 'block' : 'none');
    },

    // Implement custom reset function for CheckedMultiSelect
    onReset: function (evt) {
      this.keywordNode.reset();
      this.sfvtSequenceNode.reset();

      for (let el of [this.sequenceFeatureTypeNode, this.subtypeHNode, this.subtypeNNode, this.geneNode]) {
        el.set('value', []);
        el._updateSelection();
      }
    }
  });
});
