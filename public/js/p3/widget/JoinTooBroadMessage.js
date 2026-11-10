/**
 * JoinTooBroadMessage: renders the Data API's `join_too_broad` 400 as navigation instead
 * of a dead end.
 *
 * Contract: `p3_api/Docs/CLIENT-join-too-broad.md`. Without this the grid shows
 * `1 - 1 of 0 results` and the real explanation is console-only, so the user concludes
 * their data is missing rather than that their filter is too wide.
 *
 * When the rejection carries a `taxonId` (purely taxonomic filter), fetch the children and
 * let the user drill down. **The children are not necessarily smaller**: Viruses' largest
 * child, Riboviria, holds 14.9 M genomes — more than Viruses' own reported count — so
 * offering it as a one-click fix just reproduces the same 400 one level down. Each child
 * is compared against the `limit` from the error and rendered accordingly. Taxonomies are
 * lopsided like this routinely, and a UI that assumes otherwise frustrates exactly the
 * users who most need the help.
 */
define([
  'dojo/_base/declare', 'dojo/dom-construct', 'dojo/dom-class', 'dojo/on', 'dojo/topic',
  'dojo/request', '../util/PathJoin', '../util/joinTooBroad', '../auth/authHeaders'
], function (
  declare, domConstruct, domClass, on, Topic,
  request, PathJoin, joinTooBroad, authHeader
) {

  var MAX_CHILDREN = 12;

  return declare(null, {

    /**
     * @param node    DOM node to render into (emptied first)
     * @param err     the rejected request error
     * @param options { apiServer, viewTab } — viewTab keeps the user on the tab they
     *                chose, so drilling down lands on Sequences rather than Overview.
     * @returns true if the error was a join_too_broad and a message was rendered.
     */
    render: function (node, err, options) {
      var info = joinTooBroad.parse(err);
      if (!info || !node) { return false; }
      options = options || {};

      domConstruct.empty(node);
      var box = domConstruct.create('div', { className: 'JoinTooBroad' }, node);

      domConstruct.create('div', {
        className: 'JoinTooBroadHeadline',
        innerHTML: ''
      }, box).appendChild(document.createTextNode(joinTooBroad.describe(info)));

      // Only offer drill-down when the server told us which taxon was at fault. A
      // non-taxonomic filter (e.g. genome_status:Complete) has no children to offer.
      if (info.taxonId) {
        var childBox = domConstruct.create('div', { className: 'JoinTooBroadChildren' }, box);
        domConstruct.create('span', {
          className: 'JoinTooBroadLoading',
          innerHTML: 'Loading narrower options…'
        }, childBox);
        this._loadChildren(childBox, info, options);
      }

      return true;
    },

    _loadChildren: function (childBox, info, options) {
      var self = this;
      var api = options.apiServer || (window.App && window.App.dataAPI) || '';
      var url = PathJoin(api, 'taxonomy')
        + '/?eq(parent_id,' + encodeURIComponent(info.taxonId) + ')'
        + '&select(taxon_id,taxon_name,genomes)&sort(-genomes)&limit(' + MAX_CHILDREN + ')';

      request.get(url, {
        handleAs: 'json',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': null,
          Authorization: authHeader()
        }
      }).then(function (rows) {
        self._renderChildren(childBox, rows || [], info, options);
      }, function () {
        // The drill-down is an enhancement; the headline already told the user what is
        // wrong. Don't replace a useful message with a failure about the help text.
        domConstruct.empty(childBox);
      });
    },

    _renderChildren: function (childBox, rows, info, options) {
      domConstruct.empty(childBox);
      if (!rows.length) { return; }

      var limit = info.limit;
      // Without a limit (pre-structured-fields API) we cannot say which children would
      // work, and guessing would be worse than staying quiet about it.
      var canJudge = typeof limit === 'number';

      var usable = canJudge ? rows.filter(function (r) { return r.genomes <= limit; }) : rows;
      var tooBig = canJudge ? rows.filter(function (r) { return r.genomes > limit; }) : [];

      if (usable.length) {
        domConstruct.create('div', {
          className: 'JoinTooBroadLabel',
          innerHTML: canJudge ? 'Narrow to one of these:' : 'Sub-taxa:'
        }, childBox);
        var list = domConstruct.create('div', { className: 'JoinTooBroadList' }, childBox);
        usable.forEach(function (r) { this._childLink(list, r, options, false); }, this);
      }

      if (tooBig.length) {
        domConstruct.create('div', {
          className: 'JoinTooBroadLabel JoinTooBroadLabelMuted',
          innerHTML: 'Still too large — these need narrowing further:'
        }, childBox);
        var big = domConstruct.create('div', { className: 'JoinTooBroadList' }, childBox);
        tooBig.forEach(function (r) { this._childLink(big, r, options, true); }, this);
      }
    },

    _childLink: function (list, row, options, stillTooBig) {
      var item = domConstruct.create('span', {
        className: 'JoinTooBroadChild' + (stillTooBig ? ' JoinTooBroadChildOverLimit' : '')
      }, list);

      var href = '/view/Taxonomy/' + row.taxon_id
        + (options.viewTab ? '#view_tab=' + options.viewTab : '');

      // domConstruct.create with an href attribute, not an innerHTML string: a taxon name
      // can contain characters that an HTML parser would mangle, and the RQL-in-href
      // entity-decoding trap bites exactly this pattern.
      var a = domConstruct.create('a', {
        className: 'navigationLink',
        href: href,
        title: stillTooBig
          ? row.taxon_name + ' has ' + joinTooBroad.formatCount(row.genomes)
            + ' genomes — still above the limit, narrow further'
          : 'View ' + row.taxon_name
      }, item);
      a.appendChild(document.createTextNode(row.taxon_name));

      domConstruct.create('span', {
        className: 'JoinTooBroadCount',
        innerHTML: ''
      }, item).appendChild(document.createTextNode(' (' + joinTooBroad.formatCount(row.genomes) + ')'));

      on(a, 'click', function (evt) {
        // pushState navigation; avoids the HTML-decode path entirely.
        evt.preventDefault();
        evt.stopPropagation();
        Topic.publish('/navigate', { href: href });
      });
    }
  });
});
