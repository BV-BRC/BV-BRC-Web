var config = require('../config');
var email = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var when = require('promised-io/promise').when;
var defer = require('promised-io/promise').defer;
var formidable = require('express-formidable');

function mail(subject, message) {
  if (!message) {
    throw Error('Message is required for mail()');
  }

  var transport;
  var deferred = new defer();

  var mailconf = config.get('email');
  var destMail = config.get('sequenceSubmissionNotificationEmailAddress');

  if (mailconf.localSendmail) {
    //transport = email.createTransport();
  } else {
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
    sender: mailconf.defaultFrom,
    from: mailconf.defaultFrom,
    subject: subject,
    text: message
  };

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

function buildMessage(formBody) {
  let content = [];

  content.push('User ID: ' + formBody.ownerId);
  content.push('Job Path: ' + formBody.submissionJobPath);
  content.push('Number of Sequences: ' + formBody.numberOfSequences);
  return content.join('\n');
}

module.exports = [
  function (req, res, next) {
    next();
  },
  formidable(),

  function (req, res, next) {
    const body = req.fields;
    const message = buildMessage(body);

    when(mail(body.subject, message), function () {
      // console.log("Problem Report Mail Sent");
      res.status(201).end();
    }, function (err) {
      console.log('Error Sending Problem Report via Email', err);
      next(err);
    });
  }
];
