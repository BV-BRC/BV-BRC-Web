/**
 * authHeaders: the single source of Authorization header values.
 *
 * BV-BRC uses two mutually incompatible Authorization conventions, and the
 * correct one depends on which service the URL resolves to -- not on which
 * module you are editing:
 *
 *   'api'   bare token, no scheme prefix. p3_api, p3_user, the Workspace
 *           JSON-RPC API and the app service JSON-RPC API. This is the
 *           default and covers the large majority of call sites.
 *
 *   'shock' 'OAuth ' prefix. Shock node URLs only -- that is, workspace
 *           object download/upload URLs (meta.link_reference, field 11 of a
 *           Workspace object-meta tuple), plus the app service's stdout and
 *           stderr URLs, which are served by the /task_info mount.
 *
 * A prefixed token sent to an 'api' destination fails signature
 * verification: the validator splits the token on '|' and reconstructs the
 * RSA-signed base string from the parts, so an 'OAuth ' prefix makes the
 * first part parse as the key "OAuth un" and the reconstruction no longer
 * matches what was signed. Neither the Workspace nor the app service strips
 * a scheme prefix before validating.
 *
 * The scheme is named after Shock deliberately. It is not a "workspace and
 * app service" convention -- both of those speak bare tokens on their RPC
 * paths -- and naming it that way invites a future caller to reach for the
 * prefix when adding a Workspace call.
 *
 * The optional `token` argument supports the call sites that carry their own
 * token (stores and widgets with a `this.token`, and the clients that take
 * one as a constructor parameter). Omit it to use the ambient token.
 *
 * Returns '' rather than undefined when no token is available: dojo/request
 * skips headers with falsy values, so an empty string reproduces the
 * behavior of the `(window.App.authorizationToken || '')` idiom this
 * replaces.
 */

define([], function () {

  /**
   * The ambient token: window.App.authorizationToken, or '' if unset.
   *
   * Deliberately does NOT fall back to localStorage('tokenstring'). The two
   * are normally in sync -- p3app assigns the global from localStorage at
   * startup -- but they diverge during early boot, before that assignment
   * runs. A global fallback would make requests in that window start
   * carrying a token they do not carry today, which is a behavior change,
   * and this module exists to make a refactor that has none. WorkflowManager
   * does want the fallback; it composes it at its own call site.
   */
  function ambientToken() {
    return (window.App && window.App.authorizationToken) || '';
  }

  /**
   * Apply a scheme to a token that the caller supplies. Does not consult the
   * ambient token: if `token` is empty, the result is empty.
   *
   * @param {string} [scheme] 'api' (default) or 'shock'
   * @param {string} [token] the token to format
   * @returns {string} the header value, or '' when there is no token
   */
  function forToken(scheme, token) {
    if (!token) {
      return '';
    }
    return (scheme === 'shock') ? ('OAuth ' + token) : token;
  }

  /**
   * Build an Authorization header value, falling back to the ambient token.
   *
   * @param {string} [scheme] 'api' (default) or 'shock'
   * @param {string} [token] explicit token; falls back to the ambient one
   * @returns {string} the header value, or '' when there is no token
   */
  function authHeader(scheme, token) {
    return forToken(scheme, token || ambientToken());
  }

  /**
   * Use forToken() where the caller already owns the token and the old code
   * sent exactly what it was given -- clients constructed with a token
   * (jsonrpc, SEEDClient) and functions that take one as an argument. Adding
   * an ambient fallback there would change behavior: a client constructed
   * before login would start sending a token it does not send today.
   */
  authHeader.forToken = forToken;
  authHeader.authHeader = authHeader;
  authHeader.ambientToken = ambientToken;

  return authHeader;
});
