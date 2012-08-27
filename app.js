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
  everyauth = require('everyauth'),
  gzippo = require('gzippo'),

  // db
  mongoose = require('mongoose'),
  troop = require('mongoose-troop'),
  mongooseTypes = require("mongoose-types"),

  // utils
  moment = require('moment'),
  pkg = require('package')(this),

  /** Aapplication name. */
  app_name = "Sandbox",

  /** Create Server. **/
  app = module.exports = express.createServer(),

  /** Default login field value. **/
  login_value = "user@mail.com",

  /** Default password field value. **/
  password_value = "demo",

  /** Get value only if running app in development mode, if not return empty (used by helpers). **/
  getEnvironmentValue = function (value, empty) {
    if (app.settings.env === "development") {
      return value;
    }
    return empty || "";
  },

  /** Check auth method, used in each express request. */
  checkAuth = function (req, res, next) {
    // console.log('Check authentication...');
    if (req.loggedIn) {
      next();
    } else {
      req.session.redirect_to = req.url;
      res.redirect("/login");
    }
    // next();
  },

  /** Check running environment. **/
  isProduction = function () {
    return process.env.NODE_ENV === "production";
  },

  /** Check if app running in development mode, only for especial methods. */
  checkDevelopmentMode = function (req, res, next) {
    // console.log('Check for development mode authentication...');
    if (!isProduction()) {
      // yay, valid execution
      return next();
    }
  },

  /** Get email user from context. **/
  getUserEmail = function (req) {
    return req.user.email || req.query.username || req.body.username || login_value;
  },

  /** Get mixed value, if JSON return JSON otherwise return parameter value. **/
  getMixedValue = function (value) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  };


/** Model **/

// load types

mongooseTypes.loadTypes(mongoose);

var
  Email = mongoose.SchemaTypes.Email /*,
  useTimestamps = mongooseTypes.useTimestamps */;

// database

mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/sandbox');

var Schema = mongoose.Schema,
  ObjectId = Schema.ObjectId,
  Mixed = Schema.Types.Mixed;

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

var Log = new Schema({
  _user: {
    type: ObjectId,
    ref: 'User'
  },
  module: String,
  verb: {
    type: String,
    required: true,
    default: 'GET'
  },
  action: {
    type: String,
    required: true
  },
  query: {
    type: Mixed
  },
  response: {
    type: Mixed
  }
});

Log.plugin(troop.timestamp, { useVirtual: false });

// models

var
  PointModel = mongoose.model('Point', Point),
  BoundsModel = mongoose.model('Bounds', Bounds),
  UserModel =  mongoose.model('User', User),
  LogModel = mongoose.model('Log', Log);

// authorization

everyauth.password
  .loginWith('email')
  .getLoginPath('/login')
  .postLoginPath('/login')
  .loginView('login.jade')
  .authenticate(function (login, password) {
    var promise = this.Promise(),
      invalidCredentialsMessage = 'User authentication failed due to invalid authentication values';
    UserModel.findOne({ email: login }, function (err, user) {
      if (err) {
        return promise.fulfill([err]);
      }
      if (user) {
        user.authenticate(password, function (erro, auth) {
          if (erro) {
            return promise.fulfill([erro]);
          }
          if (auth === true) {
            // yay, valid user store at request
            promise.fulfill(user);
          } else {
            return promise.fulfill([invalidCredentialsMessage]);
          }
        });
      } else {
        return promise.fulfill([invalidCredentialsMessage]);
      }
    });
    return promise;
  })
  .respondToLoginSucceed(function (res, user, data) {
    if (user) {
      // i dont want to implement everyauth findById, user object is too lightweight
      data.req.session.user = user;
      console.log("Store user object at session scope: %j", user);
      // proper redirection
      var redir_to = data.req.session.redirect_to;
      if (!redir_to || redir_to.length === 0) {
        redir_to = this.loginSuccessRedirect(); // prevent empty string
      }
      console.log("Login success, redirecting to: %s", redir_to);
      this.redirect(res, redir_to);
    }
  })
  .loginSuccessRedirect('/')
  .getRegisterPath('/signup')
  .postRegisterPath('/signup')
  .registerUser(function (newUserAttributes) {
    console.log("Registration disabled.");
  });

everyauth.everymodule.findUserById(function (userId, callback) {
  UserModel.findById(userId, function (err, user) {
    if (err) {
      callback(err, null);
    }
    callback(null, user);
  });
});

// configuration

app.configure(function () {
  app.set('views', __dirname + '/jade');
  app.set('view engine', 'jade');
  app.set('view options', {
    layout: false
  });
  app.use(express.cookieParser());
  app.use(express.session({
    secret: '29jYP87V!=HE06}q:Yv-Lbm/8Vs}7n'
  }));
  app.use(express.bodyParser());
  app.use(everyauth.middleware());
  app.use(express.methodOverride());
  app.use(app.router);
});

// helpers

app.helpers({
  loginFormFieldValue: getEnvironmentValue(login_value),
  passwordFormFieldValue: getEnvironmentValue(password_value),
  m_calendar: function (date) {
    return moment(date).calendar();
  },
  m_timestamp: function (date) {
    return moment(date).unix();
  },
  year: moment().year(),
  debug: app.settings.env === "development",
  version: pkg.version,
  demo_user: login_value,
  demo_password: password_value
});

app.dynamicHelpers({
  request: function (req) {
    return req;
  }
});

/** services **/

function _log(user, module, verb, action, query, response) {
  // create log
  new LogModel({
    _user: user._id,
    module: module,
    verb: verb,
    action: action,
    query: query,
    response: response
  }).save(); // send and forget
}

/** Services. **/

app.post('/log', [checkAuth], function (req, res, next) {
  // get user
  var user = getUserEmail(req);
  console.info("Saving log for: %s. %j", user, req.body);
  _log(
    req.user,
    req.body.module,
    req.body.verb,
    req.body.action,
    getMixedValue(req.body.query),
    getMixedValue(req.body.result)
  );
  res.send(200);
});

app.get('/inout/bounds', [checkAuth], function (req, res, next) {
  // get user
  var user = getUserEmail(req);
  // find user id
  UserModel
    .findOne({email: user}, ['bounds'])
    .exec(function (err, doc) {
    if (err) {
      return next(err);
    }
    console.info("Bounds for: %s. %j", user, doc.bounds);
    if (doc) {
      res.json(doc);
    } else {
      res.send(500);
    }
  });
});

app.post('/inout/bounds', [checkAuth], function (req, res, next) {
  // get user
  var user = getUserEmail(req);
  console.info("Saving bounds for: %s. %j", user, req.body.bounds);
  // find user id
  UserModel
    .findOne({email: user})
    .exec(function (err, doc) {
    if (err) {
      return next(err);
    }
    doc.bounds = req.body.bounds || [];
    doc.save(function (err1) {
      if (err1) {
        return next(err1);
      }
      _log(doc, 'inout', 'POST', 'bounds');
      res.json(doc);
    });
  });
});

/** Pages. **/

app.get('/', [checkAuth], function (req, res, next) {
  console.log('index');
  res.render('index', {
    // pass
  });
});

app.get('/inout', [checkAuth], function (req, res, next) {
  // get user
  var user = getUserEmail(req);
  // find user id
  UserModel
    .findOne({email: user}, ['bounds'])
    .exec(function (err, doc) {
    if (err) {
      return next(err);
    }
    console.info("Bounds for: %s. %j", user, doc.bounds);
    if (doc) {
      // res.json(doc);
      res.render('inout', {
        bounds: JSON.stringify(doc.bounds)
      });
    } else {
      res.send(500);
    }
  });
});

app.get('/logs', [checkAuth], function (req, res, next) {
  // find user id
  LogModel
    .find({})
    .populate('_user', ['email'])
    .sort('created', -1)
    .exec(function (err, logs) {
      if (err) {
        return next(err);
      }
      res.render('logs', {
        logs: logs
      });
    });
});

/** services only at dev mode **/

app.get('/fixtures/create', [checkDevelopmentMode], function (req, res, next) {
  // find user id
  UserModel
    .findOne({email: req.query.username || login_value})
    .exec(function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        console.info('New user...');
        var user = new UserModel({
          email: login_value,
          password: password_value
        });
        user.save(function (err1) {
          if (err1) {
            return next(err1);
          }
          res.json(user);
        });
      } else {
        console.info('User exists...');
        res.json(doc);
      }
    });
});

// show error on screen. False for all envs except development
// settmgs for custom error handlers
app.set('showStackError', false);

// environment specific

app.configure('development', function () {
  app.set('showStackError', true);
  app.use(express.static(__dirname + '/public'));
});

app.configure('production', function () {
  app.use(gzippo.staticGzip(__dirname + '/public'));
});

// app.use(express.logger(':method :url :status'));
app.use(express.logger('dev'));

// launcher

app.listen(process.env.PORT || 3001, function () {
  console.log("%s listening on port %d (%s mode)", app_name, app.address().port, app.settings.env);
});
