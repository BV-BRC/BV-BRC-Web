var express = require('express');

function parseUsernameFromToken(token) {
  if (!token) return null;
  var parts = token.split('|');
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].indexOf('un=') === 0) {
      return parts[i].slice(3);
    }
  }
  return null;
}

module.exports = function (sessionManager) {
  var router = express.Router();

  router.use(express.json());

  router.post('/start', function (req, res) {
    var token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    var username = parseUsernameFromToken(token);
    if (!username) {
      return res.status(401).json({ error: 'Could not determine username from token' });
    }

    var result = sessionManager.start(username);
    res.cookie('_querylog', result.sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax'
    });
    res.json({ status: 'started', filename: result.filename });
  });

  router.post('/stop', function (req, res) {
    var sessionId = req.cookies && req.cookies._querylog;
    if (!sessionId) {
      return res.json({ status: 'not_active' });
    }

    sessionManager.stop(sessionId);
    res.clearCookie('_querylog', { path: '/' });
    res.json({ status: 'stopped' });
  });

  router.get('/status', function (req, res) {
    var sessionId = req.cookies && req.cookies._querylog;
    if (!sessionId) {
      return res.json({ active: false });
    }

    var session = sessionManager.getSession(sessionId);
    if (!session) {
      res.clearCookie('_querylog', { path: '/' });
      return res.json({ active: false });
    }

    res.json({ active: true, filename: session.filename });
  });

  return router;
};
