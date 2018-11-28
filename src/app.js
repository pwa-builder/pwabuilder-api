'use strict';

var express      = require('express'),
  path         = require('path'),
  logger       = require('morgan'),
  cookieParser = require('cookie-parser'),
  bodyParser   = require('body-parser'),
  multer       = require('multer'),
  manifests    = require('./routes/manifests'),
  serviceworkers= require('./routes/serviceworkers'),
  raygun       = require('raygun'),
  raygunClient = new raygun.Client().init({ apiKey: 'PrRN4HizgQVI2xeXBxdSzw==' });

var PWABuilder = {
  init: function(redisClient, azure, pwabuilder){
    var app = express();

    pwabuilder.log.setLevel('debug');

    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'pug');

    app.use(logger('dev'));

    // CORS configuration
    // var allowedHost = {
    //   'http://localhost:4200': true,
    //   'http://www.manifoldjs.com': true,
    //   'http://manifoldjs.com':true,
    //   'http://manifold-site-pre.azurewebsites.net':true,
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

    app.use(bodyParser.json({limit: '2mb'}));
    app.use(bodyParser.urlencoded({limit: '2mb', extended: true }));
    app.use(multer({ dest: '../tmp/' }).any());
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));


    app.use('/manifests', manifests(redisClient,azure,pwabuilder,raygunClient));
    app.use('/serviceworkers', serviceworkers(pwabuilder, azure));

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

module.exports = PWABuilder;
