define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dojo/topic',
  'dojo/dom-class',
  'dojo/text!./templates/ProteinFamily.html', './AppBase', 'dojo/dom-construct',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog', 'dojo/NodeList-traverse', '../../WorkspaceManager',
  '../WorkspaceObjectSelector'
], function (
  declare, WidgetBase, on, Topic,
  domClass,
  Template, AppBase, domConstruct,
  Deferred, aspect, lang, domReady, NumberTextBox,
  query, dom, popup, Tooltip, Dialog, TooltipDialog, children, WorkspaceManager,
  WorkspaceObjectSelector
) {
  return declare([AppBase], {
    baseClass: 'App Assembly',
    templateString: Template,
    applicationName: 'ProteinFamily',
    applicationHelp: 'quick_references/services/protein_family_service.html',
    tutorialLink: 'tutorial/protein_family_sorter/protein_family_sorter.html',
    videoLink: '',
    pageTitle: 'Protein Family Sorter',
    libraryData: null,
    defaultPath: '',
    startingRows: 8,

    constructor: function () {

      this.addedLibs = 0;
      this.addedList = [];
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      var _self = this;
      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
      for (var i = 0; i < this.startingRows; i++) {
        var tr = this.libsTable.insertRow(0);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }
      this.numlibs.startup();
      this._started = true;

      // activate genome group selector when user is logged in
      if (window.App.user) {
        var ggDom = query('div[name="genome_group"]')[0];

        this.genome_group = new WorkspaceObjectSelector();
        this.genome_group.set('type', ['genome_group']);
        this.genome_group.placeAt(ggDom, 'only');
      }
    },
    increaseLib: function (rec) {
      this.addedList.push(rec);
      this.addedLibs = this.addedList.length;
      this.numlibs.set('value', Number(this.addedLibs));
    },
    decreaseLib: function (rec) {
      var idx = this.addedList.indexOf(rec);
      if (idx > -1) {
        this.addedList.splice(idx, 1);
      }
      this.addedList = this.addedList.filter(function (d) {
        return d !== undefined;
      });
      this.addedLibs = this.addedList.length;
      this.numlibs.set('value', Number(this.addedLibs));
    },
    formatName: function (name) {
      var maxName = 29;
      if (name.length > maxName) {
        name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }
      return name;
    },
    onAddGenome: function () {
      var lrec = {};

      var label = this.genome.get('displayedValue');
      var genome_id = this.genome.get('value');
      lrec.label = label;
      lrec.genome_ids = [genome_id];
      lrec.type = 'genome';

      // console.log(lrec);

      var tr = this.libsTable.insertRow(0);
      var td = domConstruct.create('td', { 'class': 'textcol singledata', innerHTML: '' }, tr);

      td.libRecord = lrec;
      td.innerHTML = "<div class='libraryrow'>" + this.formatName(label) + '</div>';
      domConstruct.create('td', { innerHTML: '' }, tr);
      var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x'/>" }, tr);

      if (this.addedLibs < this.startingRows) {
        this.libsTable.deleteRow(-1);
      }
      var handle = on(td2, 'click', lang.hitch(this, function (evt) {
        domConstruct.destroy(tr);
        this.decreaseLib(lrec);
        if (this.addedLibs < this.startingRows) {
          var ntr = this.libsTable.insertRow(-1);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        }
        handle.remove();
      }));
      this.increaseLib(lrec);
    },
    onAddGenomeGroup: function () {
      var lrec = {};

      var label = this.genome_group.searchBox.get('displayedValue');
      var paths = this.genome_group.searchBox.get('value');
      lrec.path = paths;
      lrec.label = label;
      lrec.type = 'genome_group';

      WorkspaceManager.getObjects(paths, false).then(lang.hitch(this, function (objs) {

        var genomeIdHash = {};
        objs.forEach(function (obj) {
          var data = JSON.parse(obj.data);
          data.id_list.genome_id.forEach(function (d) {
            if (!Object.prototype.hasOwnProperty.call(genomeIdHash, d)) {
              genomeIdHash[d] = true;
            }
          });
        });
        lrec.genome_ids = Object.keys(genomeIdHash);
        var count = lrec.genome_ids.length;

        // console.log(lrec);

        var tr = this.libsTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol singledata', innerHTML: '' }, tr);

        td.libRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.formatName(label) + ' (' + count + ' genomes)</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x library-rm'/>" }, tr);

        if (this.addedLibs < this.startingRows) {
          this.libsTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          domConstruct.destroy(tr);
          this.decreaseLib(lrec);
          if (this.addedLibs < this.startingRows) {
            var ntr = this.libsTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        this.increaseLib(lrec);
      }));
    },
    onSubmit: function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      if (this.validate()) {
        var values = this.getValues();

        // console.log(values, this.addedList);
        var params = {
          family_type: values.family_type
        };
        // values.keyword

        if (this.addedLibs === 0) return;

        // if(values['taxon_id'] !== ""){
        //   Topic.publish("/navigate", {href: "/view/Taxonomy/" + values['taxon_id'] + "#view_tab=proteinFamilies"});
        //   return;
        // }

        // log GA
        if (window.gtag) {
          gtag('event', 'ProteinFamilySorter', { event_category: 'Services', family_type: params.family_type });
        }

        if (this.addedList.length === 1 && this.addedList[0].type === 'genome_group') {
          Topic.publish('/navigate', { href: '/view/GenomeGroup' + this.addedList[0].path + '#view_tab=proteinFamilies&params=' + encodeURIComponent(JSON.stringify(params)) });
        } else {
          var genomeList = [];
          this.addedList.forEach(function (rec) {
            genomeList.push(rec.genome_ids);
          });
          Topic.publish('/navigate', { href: '/view/GenomeList/?in(genome_id,(' + genomeList + '))#view_tab=proteinFamilies&params=' + encodeURIComponent(JSON.stringify(params)) });
        }
      } else {
        console.error('Form is incomplete');
      }
    }
  });
});
