define([
  'dojo/_base/declare', './ActionBar',
  'dojo/dom-construct', 'dojo/dom-class', 'dojo/dom-attr',
  'dojo/on', 'dojo/_base/lang', 'dojo/query', 'dojo/topic',
  '../util/FavoriteFolders'
], function (
  declare, ActionBar,
  domConstruct, domClass, domAttr,
  on, lang, query, Topic,
  FavoriteFolders
) {
  return declare([ActionBar], {
    path: null,
    'class': 'WSContainerActionBar',
    tooltipPosition: ['above', 'below'],
    _favoriteSubscription: null,

    _setPathAttr: function (p) {
      this.path = p;
      if (this._started) {
        this.pathContainer.innerHTML = this.generatePathLinks(p);
        this._updateFavoriteIcon();
      }
    },

    postCreate: function () {
      this.inherited(arguments);
      this.pathContainer = domConstruct.create('div', { 'class': 'wsBreadCrumbContainer' }, this.domNode);
      this.containerNode = domConstruct.create('span', {
        'class': 'ActionButtonContainer wsActionContainer'
      }, this.domNode);

      // Click handler for favorite star using event delegation
      on(this.pathContainer, 'click', lang.hitch(this, function (evt) {
        if (domClass.contains(evt.target, 'wsFavoriteStar')) {
          evt.preventDefault();
          evt.stopPropagation();
          var starPath = domAttr.get(evt.target, 'data-path');
          if (starPath && window.App && window.App.user) {
            FavoriteFolders.toggle(starPath).then(lang.hitch(this, function (isFav) {
              this._setStarState(evt.target, isFav);
            }));
          }
        }
      }));

      // Subscribe to favorite changes from other sources
      this._favoriteSubscription = Topic.subscribe('/FavoriteFolders/changed', lang.hitch(this, function () {
        this._updateFavoriteIcon();
      }));
    },

    _updateFavoriteIcon: function () {
      if (!this.path || !window.App || !window.App.user) {
        return;
      }
      var starNode = query('.wsFavoriteStar', this.pathContainer)[0];
      if (starNode) {
        FavoriteFolders.isFavorite(this.path).then(lang.hitch(this, function (isFav) {
          this._setStarState(starNode, isFav);
        }));
      }
    },

    _setStarState: function (starNode, isFavorite) {
      if (isFavorite) {
        domClass.remove(starNode, 'icon-star-o');
        domClass.add(starNode, 'icon-star');
        domClass.remove(starNode, 'not-favorite');
        domAttr.set(starNode, 'title', 'Remove from favorites');
      } else {
        domClass.remove(starNode, 'icon-star');
        domClass.add(starNode, 'icon-star-o');
        domClass.add(starNode, 'not-favorite');
        domAttr.set(starNode, 'title', 'Add to favorites');
      }
    },

    _shouldShowFavoriteStar: function (path) {
      // Don't show star if not logged in
      if (!window.App || !window.App.user) {
        return false;
      }
      // Don't show for public root
      if (path === '/public/' || path === '/public') {
        return false;
      }
      // Don't show for user's root workspace (e.g., /user@realm/)
      var parts = path.replace(/\/+/g, '/').replace(/\/$/, '').split('/');
      if (parts.length <= 2) {
        return false;
      }
      return true;
    },

    generatePathLinks: function (path) {
      // strip out /public/ of parts array
      var parts = path.replace(/\/+/g, '/').split('/');
      if (parts[1] == 'public') {
        parts.splice(1, 1);
      }

      if (parts[0] == '') {
        parts.shift();
      }

      var out = ["<span class='wsBreadCrumb'>"];
      var bp = ['workspace'];

      var isPublic = path.replace(/\/+/g, '/').split('/')[1] == 'public';

      // Add favorite star at the beginning (if applicable)
      if (this._shouldShowFavoriteStar(path)) {
        // Start with outline star, will be updated async after render
        out.push('<i class="icon-star-o wsFavoriteStar not-favorite" data-path="' + path + '" title="Add to favorites"></i> ');
      }

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
        if (idx == (parts.length - 1)) {
          out.push('<b class="perspective">' + part.replace('@' + localStorage.getItem('realm'), '') + '</b>');
          return;
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

      return out.join('');
    },

    startup: function () {
      if (this.path) {
        this.pathContainer.innerHTML = this.generatePathLinks(this.path);
        this._updateFavoriteIcon();
      }

      this.inherited(arguments);
    },

    destroy: function () {
      if (this._favoriteSubscription) {
        this._favoriteSubscription.remove();
      }
      this.inherited(arguments);
    }

  });
});
