define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/dom-construct', 'dojo/topic', 'dojo/request',
  'dijit/layout/BorderContainer', 'dijit/layout/ContentPane',
  '../SequenceGridContainer', '../FeatureGridContainer', '../IrdStrainGridContainer',
  '../../auth/authHeaders', '../../util/irdColumns', '../../util/irdSequenceQuery', '../../util/irdSearchRunner'
], function (
  declare, lang, on, domConstruct, Topic, request,
  BorderContainer, ContentPane,
  SequenceGridContainer, FeatureGridContainer, IrdStrainGridContainer,
  authHeader, irdColumns, irdSequenceQuery, irdSearchRunner
) {

  /**
   * IRD results page (Option C, Phase 1c), /ird/results/<grain>/?<query>.
   *
   * Hosts the ordinary BV-BRC grid container for the grain, so every grid
   * action (download, groups, MSA, tree, ...) is the one users already have,
   * and adds IRD's two things on top: IRD's column set (util/irdColumns, via
   * the containers' defaultColumns support) and IRD's display switch, "Show
   * Segment / Protein / Strain Display", for the selection or for the whole
   * result.
   *
   * The form state that produced the page rides in the hash (irdState), so
   * the whole result can be re-run at another grain. A display reached from
   * a selection has no form state; it switches selections only.
   */

  var LABEL = { segment: 'Segments', protein: 'Proteins', strain: 'Strains' };

  var CONTAINER = {
    segment: SequenceGridContainer,
    protein: FeatureGridContainer,
    strain: IrdStrainGridContainer
  };

  function grainFromPath(pathname) {
    var m = /^\/ird\/results\/(segment|protein|strain)\b/.exec(pathname || '');
    return m ? m[1] : null;
  }

  function formStateFrom(state) {
    var raw = state && state.hashParams && state.hashParams.irdState;
    if (!raw) return null;
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch (e) {
      console.error('IRD results: unreadable irdState', e);
      return null;
    }
  }

  return declare([BorderContainer], {
    baseClass: 'IrdResults',
    gutters: false,
    grain: null,
    formState: null,

    postCreate: function () {
      this.inherited(arguments);
      this.bar = new ContentPane({ region: 'top', 'class': 'ird-results-bar' });
      var inner = domConstruct.create('div', { 'class': 'ird-results-inner' }, this.bar.containerNode);
      this.titleNode = domConstruct.create('h1', { 'class': 'ird-results-title' }, inner);
      var row = domConstruct.create('div', { 'class': 'ird-results-row' }, inner);
      domConstruct.create('span', { 'class': 'ird-results-label', textContent: 'Show as' }, row);
      this.switchButtons = {};
      ['segment', 'protein', 'strain'].forEach(lang.hitch(this, function (g) {
        var b = domConstruct.create('button', { type: 'button', 'class': 'ird-button', textContent: LABEL[g] }, row);
        this.own(on(b, 'click', lang.hitch(this, 'switchTo', g)));
        this.switchButtons[g] = b;
      }));
      this.hintNode = domConstruct.create('span', { 'class': 'ird-results-hint' }, row);
      // Plain link: leaving reloads the page (see views/ird/_banner.ejs).
      domConstruct.create('a', { href: '/ird/search/sequences', 'class': 'ird-results-new', textContent: 'New search' }, row);
      this.messageNode = domConstruct.create('div', { 'class': 'ird-search-message', role: 'alert', style: 'display:none' }, inner);
      this.addChild(this.bar);
    },

    _setStateAttr: function (state) {
      this._set('state', state);
      // dijit applies constructor params before postCreate builds the bar;
      // startup() applies the state once everything exists.
      if (!this._started) return;
      var grain = grainFromPath(state && state.pathname) || this.grain;
      if (!grain) return;
      this.formState = formStateFrom(state);
      this._showMessage('');

      var containerState = lang.mixin({}, state, {
        hashParams: lang.mixin({}, state.hashParams, { defaultColumns: irdColumns.defaultColumns(grain) })
      });

      if (this.container && grain === this.grain) {
        this.container.set('state', containerState);
      } else {
        if (this.container) {
          this.removeChild(this.container);
          this.container.destroyRecursive();
        }
        this.grain = grain;
        this.container = new CONTAINER[grain]({ region: 'center', state: containerState });
        this.addChild(this.container);
        this.container.set('visible', true);
        // GridContainer applies its query from a state *change* (a watch), so
        // state given to the constructor alone leaves the first view
        // unfiltered: every sequence in BV-BRC. Set it again, as the list
        // viewers do through TabViewerBase.
        this.container.set('state', lang.mixin({}, containerState));
      }

      this.titleNode.textContent = LABEL[grain];
      Object.keys(this.switchButtons).forEach(lang.hitch(this, function (g) {
        this.switchButtons[g].disabled = g === grain;
        this.switchButtons[g].classList.toggle('ird-button-current', g === grain);
      }));
      this.hintNode.textContent = this.formState
        ? 'With rows selected, only those are shown.'
        : 'Select rows to show them another way.';
    },

    startup: function () {
      if (this._started) return;
      this.inherited(arguments);
      if (this.state) this.set('state', this.state);
    },

    _showMessage: function (text) {
      this.messageNode.textContent = text || '';
      this.messageNode.style.display = text ? '' : 'none';
    },

    _selection: function () {
      var bar = this.container && this.container.selectionActionBar;
      return (bar && bar.get('selection')) || [];
    },

    _post: function (collection, query) {
      return request.post(window.App.dataServiceURL.replace(/\/$/, '') + '/' + collection + '/', {
        data: query,
        handleAs: 'json',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: authHeader()
        }
      });
    },

    /**
     * IRD's "Show ... Display". Selected rows: those records at the other
     * grain. Nothing selected: the whole search, re-run at the other grain.
     * Counted first either way, so a refused or empty result is explained
     * here instead of opening an empty grid.
     */
    switchTo: function (to) {
      if (to === this.grain) return Promise.resolve();
      this._showMessage('');
      var post = lang.hitch(this, '_post');
      var rows = this._selection();
      var annotation = this.formState && this.formState.annotation;
      var run;
      if (rows.length) {
        run = Promise.resolve().then(lang.hitch(this, function () {
          var built = irdSequenceQuery.pivotQuery(this.grain, to, rows, { annotation: annotation });
          return irdSearchRunner.count(built, post).then(function () {
            return irdSearchRunner.resultsHref(to, built.query, null);
          });
        }));
      } else if (this.formState) {
        run = irdSearchRunner.run(lang.mixin({}, this.formState, { grain: to }), post).then(function (result) {
          return result.href;
        });
      } else {
        this._showMessage('Select rows to show them as ' + LABEL[to].toLowerCase() + '.');
        return Promise.resolve();
      }
      return run.then(function (href) {
        Topic.publish('/navigate', { href: href });
      }, lang.hitch(this, function (err) {
        this._showMessage(err.message);
      }));
    }
  });
});
