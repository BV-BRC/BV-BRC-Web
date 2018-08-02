define(['dojo/_base/declare', 'dojo/router/RouterBase'
], function (declare, Router) {

  // Firing of routes on the route object is always the same,
  // no clean way to expose this on the prototype since it's for the
  // internal router objects.
  function fireRoute(params, currentPath, newPath, state) {
    var queue,
      isStopped,
      isPrevented,
      eventObj,
      callbackArgs,
      i,
      l;

    queue = this.callbackQueue;
    isStopped = false;
    isPrevented = false;
    eventObj = {
      stopImmediatePropagation: function () {
        isStopped = true;
      },
      preventDefault: function () {
        isPrevented = true;
      },
      oldPath: currentPath,
      newPath: newPath,
      params: params,
      state: state
    };

    callbackArgs = [eventObj];

    if (params instanceof Array) {
      callbackArgs = callbackArgs.concat(params);
    } else {
      for (var key in params) {
        // guard-for-in
        if (Object.prototype.hasOwnProperty.call(params, key)) {
          callbackArgs.push(params[key]);
        }
      }
    }

    for (i = 0, l = queue.length; i < l; ++i) {
      if (!isStopped) {
        queue[i].apply(null, callbackArgs);
      }
    }

    return !isPrevented;
  }

  return declare([Router], {

    go: function (href, state) {
      // console.log("go(" + href + ")", state)

      state = state || {};

      // console.log("Current HREF: ", this._currentPath, " New HREF: ", href, " STATE: ", state);

      if (href.length > 4000) {
        var hparts = href.split('#');

        var parts = hparts[0].split('?');
        href = parts[0] + (hparts[1] ? ('#' + hparts[1]) : '');
        state.search = parts[1];
      }

      if (href != this._currentPath) {
        window.history.pushState(state || {}, 'route', href);
        this._handlePathChange(href, state || {});
      } else if (state) {
        window.history.replaceState(state || {}, 'route', href);
      }
    },

    replaceState: function (state) {
      // console.log("Router.replaceState()",state)
      window.history.replaceState(state);
    },

    _registerRoute: function (/* String|RegExp */route, /* Function */callback, /* Boolean? */isBefore) {
      var index,
        exists,
        routeObj,
        callbackQueue,
        removed,
        self = this,
        routes = this._routes,
        routeIndex = this._routeIndex;

      // Try to fetch the route if it already exists.
      // This works thanks to stringifying of regex
      index = this._routeIndex[route];
      exists = typeof index !== 'undefined';
      if (exists) {
        routeObj = routes[index];
      }

      // If we didn't get one, make a default start point
      if (!routeObj) {
        routeObj = {
          route: route,
          callbackQueue: [],
          fire: fireRoute
        };
      }

      callbackQueue = routeObj.callbackQueue;

      if (typeof route == 'string') {
        routeObj.parameterNames = this._getParameterNames(route);
        routeObj.route = this._convertRouteToRegExp(route);
      }

      if (isBefore) {
        callbackQueue.unshift(callback);
      } else {
        callbackQueue.push(callback);
      }

      if (!exists) {
        index = routes.length;
        routeIndex[route] = index;
        routes.push(routeObj);
      }

      // Useful in a moment to keep from re-removing routes
      removed = false;

      return { // Object
        remove: function () {
          var i,
            l;

          if (removed) {
            return;
          }

          for (i = 0, l = callbackQueue.length; i < l; ++i) {
            if (callbackQueue[i] === callback) {
              callbackQueue.splice(i, 1);
            }
          }

          if (callbackQueue.length === 0) {
            routes.splice(index, 1);
            self._indexRoutes();
          }

          removed = true;
        },
        register: function (callback, isBefore) {
          return self.register(route, callback, isBefore);
        }
      };
    },

    _handlePathChange: function (newPath, state) {
      // console.log("Handle Path Change", arguments)
      var i,
        j,
        li,
        lj,
        routeObj,
        result,
        allowChange,
        parameterNames,
        params,
        routes = this._routes,
        currentPath = this._currentPath;

      if (!this._started) {
        return allowChange;
      }

      allowChange = true;

      for (i = 0, li = routes.length; i < li; ++i) {
        routeObj = routes[i];
        // console.log("Checking Route: ", routeObj.route);
        result = routeObj.route.exec(newPath);
        if (result) {
          // console.log( "   Found Route: ", routeObj.parameterNames);
          if (routeObj.parameterNames) {
            parameterNames = routeObj.parameterNames;
            params = {};

            for (j = 0, lj = parameterNames.length; j < lj; ++j) {
              params[parameterNames[j]] = result[j + 1];
            }
          } else {
            params = result.slice(1);
          }
          allowChange = routeObj.fire(params, currentPath, newPath, state);
        }
      }

      // console.log("Allow Change: ", allowChange)
      if (allowChange) {
        this._currentPath = newPath;
      }

      return allowChange;
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this._started = true;
      var _self = this;

      this.currentState = window.history.state;

      window.onpopstate = function (evt) {
        // console.log("onpopstate(): ", evt)
        _self._handlePathChange(location.pathname + location.search + location.hash, evt.state);
      };

      if (!this._currentPath) {
        // console.log("No Current Path",location)
        this.go(location.pathname + location.search + location.hash);
      } else {
        // console.log("Call handlePathChange", location.pathname)
        this._handlePathChange(location.pathname + location.search + location.hash, this.currentState || {});
      }
    }
  })();

});
