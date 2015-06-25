'use strict';

var express      = require('express'),
  path         = require('path'),
  logger       = require('morgan'),
  cookieParser = require('cookie-parser'),
  bodyParser   = require('body-parser'),
  multer       = require('multer'),
  manifests    = require('./routes/manifests'),
  images       = require('./routes/images'),
  raygun       = require('raygun'),
  raygunClient = new raygun.Client().init({ apiKey: 'PrRN4HizgQVI2xeXBxdSzw==' });

var Manifold = {
  init: function(redisClient, azure, manifold){
    var app = express();

    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'jade');

    app.use(logger('dev'));

    // CORS configuration
    // var allowedHost = {
    //   'http://localhost:4200': true,
    //   'http://www.manifoldjs.com': true,
    //   'http://manifoldjs.com':true,
    //   'http://manifold-site-staging.azurewebsites.net':true,
    //   'http://manifold-site-prod.azurewebsites.net':true
    // };

    app.use(function (req, res, next) {
      // var origin = req.get('origin');

      // if(allowedHost[origin]){
      //   res.setHeader('Access-Control-Allow-Origin', origin);
      //   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      //   res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
      //   res.setHeader('Access-Control-Allow-Credentials', true);
      // }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
      res.setHeader('Access-Control-Allow-Credentials', true);

      next();
    });

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(multer({ dest: '../tmp/'}));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));


    app.use('/manifests', manifests(redisClient,azure,manifold,raygunClient));
    app.use('/images',images());

    // catch 404 and forward to error handler
    app.use(function(req, res, next) {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
    });

    // error handlers

    // development error handler
    // will print stacktrace
    if (app.get('env') === 'development') {
      app.use(function(err, req, res) {
        res.status(err.status || 500);
        res.render('error', {
          message: err.message,
          error: err
        });
      });
    }

    // production error handler
    // no stacktraces leaked to user
    app.use(raygunClient.expressHandler);
    app.use(function(err, req, res) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: {}
      });
    });

    return app;
  }
};

module.exports = Manifold;
