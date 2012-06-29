/*!
*              __     _
*   _    _/__  /./|,//_`
*  /_//_// /_|///  //_, app.js
*
* Copyright (c) 2012 outaTiME, Inc.
*/

var

  // dependencies

  express = require('express'),
  gzippo = require('gzippo'),

  /** Yay, out application name. */
  app_name = "Inout",

  /** Check auth method, used in each express request. */
  checkAuth = function (req, res, next) {
    next();
  },

  // server
  app = module.exports = express.createServer();

// configuration

app.configure(function () {
  app.set('views', __dirname + '/jade');
  app.set('view engine', 'jade');
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'foobar' }));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(gzippo.staticGzip(__dirname + '/public'));
});

// helpers

app.helpers({
});

// routes

app.get('/', checkAuth, function (req, res) {
  res.render('index', {
    debug: app.settings.env === "development"
  });
});

// ajax

app.post('/search', checkAuth, function (req, res) {
  var keywords = encodeURIComponent(req.body.keywords), bounds = req.body.bounds, client = require('request');
  client.get({
    url: 'http://maps.googleapis.com/maps/api/geocode/json?address=' + keywords +
      '&bounds=' + bounds + '&region=ar&language=es&sensor=false',
    headers: {
      'Content-Type': 'application/json'
    }
  }, function (error, response, body) {
    res.json(body);
  });
});

// environment specific

app.configure('development', function () {
  // app.use(gzip.staticGzip(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
  /* var oneYear = 31557600000;
  app.use(gzip.staticGzip(__dirname + '/public', { maxAge: oneYear })); */
  app.use(express.errorHandler());
});

// launcher

app.listen(process.env.PORT || 3001, function () {
  console.log("%s listening on port %d (%s mode)", app_name, app.address().port, app.settings.env);
});
