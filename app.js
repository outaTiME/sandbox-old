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

  // db
  mongoose = require('mongoose'),
  troop = require('mongoose-troop'),
  mongooseTypes = require("mongoose-types"),

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

app.get('/address', checkAuth, function (req, res) {
  var keywords = req.query.keywords, bounds = req.query.bounds, client = require('request');
  console.info("Searching address: %s (%s)", keywords, bounds);
  client.get({
    url: 'http://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(keywords) +
      '&bounds=' + bounds + '&region=ar&language=es&sensor=false',
    headers: {
      'Content-Type': 'application/json'
    }
  }, function (error, response, body) {
    console.log(body);
    res.json(body);
  });
});

// load types

mongooseTypes.loadTypes(mongoose);

var
  Email = mongoose.SchemaTypes.Email /*,
  useTimestamps = mongooseTypes.useTimestamps */;

// database

mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/inout');

var Schema = mongoose.Schema; //Schema.ObjectId

var Point = new Schema({
  lat: {
    type: String,
    required: true
  },
  lng: {
    type: String,
    required: true
  }
});

var Bounds = new Schema({
  points: [Point]
});

Bounds.plugin(troop.timestamp);

var User = new Schema({
  email: {
    type: Email,
    index: {
      unique: true
    },
    required: true
  },
  bounds: [Bounds]
});

User.plugin(troop.basicAuth, {
  loginPath: "email"
});

User.plugin(troop.timestamp);

// models

var
  PointModel = mongoose.model('Point', Point),
  BoundsModel = mongoose.model('Bounds', Bounds),
  UserModel =  mongoose.model('User', User);

app.get('/test', checkAuth, function (req, res, next) {
  var test_bounds = [{
    points: [
      {
        lat: -43.26519102639606,
        lng: -65.38240830126955
      },
      {
        lat: -43.29753940849775,
        lng: -65.28676429003906
      },
      {
        lat: -43.26099753659681,
        lng: -65.23561389794924
      },
      {
        lat: -43.21983026907506,
        lng: -65.29466776074219
      },
      {
        lat: -43.237691354803474,
        lng: -65.32419586669914
      },
      {
        lat: -43.246938002453014,
        lng: -65.38343826953127
      }
    ]
  }];
  // find user id
  UserModel
    .findOne({email: req.query.username || 'user@mail.com'})
    .exec(function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        // exist
        console.info('New user...');
        // create
        var user = new UserModel({
          email: "user@mail.com",
          password: "foo",
          bounds: test_bounds
        });
        user.save(function (err1) {
          if (err1) {
            return next(err1);
          }
          res.json(user);
        });
      } else {
        // new
        console.info('User exists...');
        // edit
        doc.bounds = test_bounds;
        doc.save(function (err2) {
          if (err2) {
            return next(err2);
          }
          res.json(doc);
        });
      }
    });
});

app.get('/bounds', checkAuth, function (req, res, next) {
  // find user id
  UserModel
    .findOne({email: req.query.username || 'user@mail.com'}, ['bounds'])
    .exec(function (err, doc) {
    if (err) {
      return next(err);
    }
    console.info("Bounds for: %s. %j", req.query.username, doc.bounds);
    if (doc) {
      res.json(doc);
    } else {
      res.send(500);
    }
  });
});

app.post('/bounds', checkAuth, function (req, res, next) {
  console.info("Saving bounds for: %s. %j", req.body.username, req.body.bounds);
  // find user id
  UserModel
    .findOne({email: req.body.username || 'user@mail.com'})
    .exec(function (err, doc) {
    if (err) {
      return next(err);
    }
    doc.bounds = req.body.bounds || [];
    doc.save(function (err1) {
      if (err1) {
        return next(err1);
      }
      res.json(doc);
    });
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
