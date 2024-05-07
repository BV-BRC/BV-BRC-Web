var config = require('../config');
var email = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var when = require('promised-io/promise').when;
var defer = require('promised-io/promise').defer;
const axios = require("axios");
var formidable = require('express-formidable');
var fs = require('fs');

function mail(message, subject, from, files, options) {
  if (!message) {
    throw Error('Message is required for mail()');
  }

  var transport;
  var deferred = new defer();

  var mailconf = config.get('email');
  var destMail = config.get('reportProblemEmailAddress');

  if (mailconf.localSendmail) {
    // transport = email.createTransport();
    // email.sendmail=true;
  } else {
    // email.sendmail=false;
    email.SMTP = {
      host: mailconf.host || 'localhost',
      port: mailconf.port || 25
    };
  }

  if (mailconf.username) {
    email.SMTP.use_authentication = true;
    email.SMTP.user = mailconf.username;
    email.SMTP.pass = mailconf.password;
  }

  if (!transport) {
    var transportOpts = {
      host: mailconf.host || 'localhost',
      port: mailconf.port || 25,
      debug: true
    };
    if (mailconf.username) {
      transportOpts.auth = {
        user: mailconf.username,
        pass: mailconf.password
      };
    }
    transportOpts.tls = { rejectUnauthorized: false };
    transport = email.createTransport(smtpTransport(transportOpts));
  }

  var mailmsg = {
    debug: true,
    to: destMail,
    sender: mailconf.defaultFrom, // "responder@hapticscience.com", // mailconf.defaultFrom,
    from: from || mailconf.defaultFrom,
    subject: subject || 'No Subject',
    text: message
  };

  var attachments = [];
  if (files && files.length > 0) {
    files.forEach(function (f) {
      var attach = {};
      attach.filename = f.name;
      attach.content = fs.createReadStream(f.path);
      attachments.push(attach);
    });
    mailmsg.attachments = attachments;
  }


  transport.sendMail(mailmsg, function (err, result) {
    if (deferred.fired) {
      return;
    }
    if (err) {
      deferred.reject(err);
      return;
    }

    deferred.resolve(result);
  });

  return deferred.promise;
}

function buildSubject(formBody) {
  var content = [];

  // eslint-disable-next-line no-useless-concat
  content.push('[' + formBody.jiraLabel + ']' + ' ' + formBody.subject);
  return content.join(' ');
}
function buildMessage(formBody) {
  var content = [];

  content.push('Version: ' + formBody.appVersion + ' ' + formBody.jiraLabel);
  content.push('URL: ' + formBody.url);
  content.push('User ID: ' + formBody.userId);
  content.push('Email: ' + formBody.email);
  content.push('\n' + formBody.content);
  return content.join('\n');
}

function getUserDetails(token, id) {
  var url = config.get('accountURL') + '/user/' + id;

  promise = axios.get(url, {
    headers: {
      authorization: token || '',
      accept: 'text/json'
    },
  });
  return promise;
}
module.exports = [
  // bodyParser.urlencoded({extended: true}),
  function (req, res, next) {
    next();
  },
  formidable(),

  function (req, res, next) {

    if (req.headers && req.headers.authorization) {
      when(getUserDetails(req.headers.authorization, req.fields.userId), function (repl) {
	user = repl.data;
	if (user.first_name && user.last_name) {
	    req.from = '"' + user.first_name + ' ' + user.last_name + '" ' + user.email;
	} else {
	  req.from = user.email;
	}
        req.fields.email = user.email;
        next();
      }, function (err) {
        console.log('Unable to retrieve user profile: ', err);
        next(err);
      });

    } else if (req.fields && req.fields.email) {
      req.from = req.fields.email;
      next();
    } else {
      next();
    }
  },
  function (req, res, next) {
    var body = req.fields;
    var message = buildMessage(body);
    var subject = buildSubject(body);
    // console.log("Report From: ", req.from || "");
    // console.log("Report Subject: ", subject);


    when(mail(message, subject, req.from || '', (req.files && req.files.attachment) ? [req.files.attachment] : []), function () {
      // console.log("Problem Report Mail Sent");
      res.status(201).end();
    }, function (err) {
      console.log('Error Sending Problem Report via Email', err);
      next(err);
    });
  }
];
