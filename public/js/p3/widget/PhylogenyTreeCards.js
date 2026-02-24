define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dojo/_base/lang',
  'dojo/dom-construct', 'dojo/on', 'dojo/text!./templates/PhylogenyTreeCards.html'
], function (
  declare, _WidgetBase, _TemplatedMixin, lang,
  domConstruct, on, template
) {

  return declare([_WidgetBase, _TemplatedMixin], {
    templateString: template,

    _baseUrl: 'https://www.bv-brc.org',
    onSelectTree: null,

    setTreeData: function (taxonBlock) {
      domConstruct.empty(this.contentNode);
      if (!taxonBlock) {
        return;
      }

      const order = Array.isArray(taxonBlock.order) ? taxonBlock.order.map(String) : [];
      const groupsArr = Array.isArray(taxonBlock.groups) ? taxonBlock.groups : [];

      // build key->group for ordering
      const byKey = {};
      groupsArr.forEach(function (g) {
        if (g && g.key != null) {
          byKey[String(g.key)] = g;
        }
      });

      const used = {};
      const display = [];

      order.forEach(function (k) {
        const g = byKey[k];
        if (g) { display.push(g); used[k] = true; }
      });

      groupsArr.forEach(function (g) {
        const k = g && g.key != null ? String(g.key) : '';
        if (!k || used[k]) {
          return;
        }
        display.push(g);
      });

      const grid = domConstruct.create('div', { className: 'cardGrid' }, this.contentNode);

      display.forEach(lang.hitch(this, function (g) {
        const arc = Array.isArray(g.archaeopteryx) ? g.archaeopteryx : [];
        const nxt = Array.isArray(g.nextstrain) ? g.nextstrain : [];
        if ((arc.length + nxt.length) === 0) {
          return;
        }
        this._renderCard(grid, g.title || g.key || '(untitled)', arc, nxt);
      }));
    },

    _renderCard: function (parent, title, phyItems, nxtItems) {
      const card = domConstruct.create('div', { className: 'treeGroup' }, parent);

      domConstruct.create('div', {
        className: 'cardTitleText',
        textContent: title
      }, card);

      if (phyItems.length) {
        this._renderSection(card, 'Archaeopteryx', phyItems, title);
      }
      if (nxtItems.length) {
        this._renderSection(card, 'Nextstrain', nxtItems, title);
      }
    },

    _renderSection: function (parent, label, items, groupTitle) {
      const section = domConstruct.create('div', { className: 'innerSection' }, parent);
      domConstruct.create('div', { className: 'innerLabel', textContent: label }, section);

      const list = domConstruct.create('div', { className: 'treeList' }, section);

      items.forEach(lang.hitch(this, function (it) {
        this._renderItem(list, it, groupTitle, label);
      }));
    },

    _renderItem: function (parent, it, groupTitle, sectionLabel) {
      const name = it && it.name ? String(it.name) : '(unnamed)';
      const def = it && it.definition ? String(it.definition) : '';
      const url = this._resolvePath(it && it.path ? String(it.path) : '');

      const regionRaw = it && it.region ? String(it.region) : "";
      const region = String(regionRaw).toLowerCase();
      const imgUrl = region === 'usa'
        ? (this._baseUrl + '/api/content/images/trees/usa.png')
        : (this._baseUrl + '/api/content/images/trees/global.png');

      const a = domConstruct.create('a', {
        className: 'treeCard',
        href: url || '#',
        title: name
      }, parent);

      domConstruct.create('div', {
        className: 'treeCardHeader',
        textContent: name
      }, a);

      domConstruct.create('img', {
        className: 'treeCardImg',
        src: imgUrl,
        alt: region.includes('usa') ? 'USA tree preview' : 'Global tree preview',
        loading: 'lazy'
      }, a);

      this.own(on(a, 'click', lang.hitch(this, function (e) {
        if (!url) { e.preventDefault(); return; }

        // Prevent navigation; we will open viewer in-tab
        e.preventDefault();

        if (typeof this.onSelectTree === 'function') {
          this.onSelectTree({
            url: url,
            name: name,
            definition: def,
            groupTitle: groupTitle || '',
            section: sectionLabel || '' // "Phylogeny" / "Nextstrain"
          });
        }
      })));

      // TODO: uncomment if displaying definition
      /*if (def) {
        domConstruct.create('div', {
          className: 'treeDef',
          textContent: def
        }, row);
      }*/
    },

    _resolvePath: function (path) {
      if (!path) {
        return '';
      }
      return path.charAt(0) === '/' ? (this._baseUrl + path) : path;
    }
  });
});