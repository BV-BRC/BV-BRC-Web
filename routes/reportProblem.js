var express = require('express');
var bodyParser = require("body-parser");
var config = require("../config");
var email = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
var when = require("promised-io/promise").when;
var defer = require("promised-io/promise").defer;

function mail(message, subject, options){
	console.log("Send Mail", message, subject);
	if(!message){
		throw Error("Message is required for mail()");
	}

	var transport;
	var deferred = new defer();

	var mailconf = config.get("email");
	var destMail = config.get("reportProblemEmailAddress");

	if(mailconf.localSendmail){
		transport = email.createTransport();
		// email.sendmail=true;
	}else{
		// email.sendmail=false;
		email.SMTP = {
			host: mailconf.host || "localhost",
			port: mailconf.port || 25
		}
	}

	if(mailconf.username){
		email.SMTP.use_authentication = true;
		email.SMTP.user = mailconf.username;
		email.SMTP.pass = mailconf.password;
	}

	if(!transport){
		var transportOpts = {
			host: mailconf.host || "localhost",
			port: mailconf.port || 25,
			debug: true,
		}
		if(mailconf.username){
			transportOpts.auth = {
				user: mailconf.username,
				pass: mailconf.password
			}
		}
		transportOpts.tls = {rejectUnauthorized: false}
		transport = email.createTransport(smtpTransport(transportOpts));
	}

	var mailmsg = {
		debug: true,
		to: destMail,
		sender: mailconf.defaultFrom, //"responder@hapticscience.com", // mailconf.defaultFrom,
		from: mailconf.defaultFrom,
		subject: subject || "No Subject",
		text: message
	}

	console.log("Sending Email: ", mailmsg);

	transport.sendMail(mailmsg, function(err, result){
		console.log("sendMail result: ", err, result);
		if(deferred.fired){
			return;
		}
		if(err){
			deferred.reject(err);
			return;
		}

		deferred.resolve(result)
	});

	return deferred.promise;
}

function buildSubject(formBody){
	var content = []
	if(formBody.appLabel){
		content.push("[" + formBody.appLabel + "]");
	}
	content.push(formBody.subject);

	return content.join(" ");
}
function buildMessage(formBody){
	var content = []

	content.push("Version: " + formBody.appVersion + " " + (formBody.appLabel || ""));
	content.push("URL: " + formBody.url);
	content.push("User ID: " + formBody.userId);
	content.push("\n" + formBody.content);
	return content.join("\n");
}
module.exports = [
	bodyParser.urlencoded({extended: true}),
	function(req, res, next){
		console.log("Report A Problem: ", req.body);
		var message = buildMessage(req.body);
		var subject = buildSubject(req.body);

		console.log("Report Message: ", message);
		console.log("Report Subject: ", subject);

		when(mail(message, subject), function(){
			console.log("Problem Report Mail Sent");
			res.status(201).end();
		}, function(err){
			console.log("Error Sending Problem Report via Email", err);
			next(err);
		});
	}
]
