'use strict';

var express = require('express'),
    router = express.Router(),
    Manifold = require('../services/manifold'),
    Storage = require('../services/storage'),
    ServiceWorkerController = require('../controllers/serviceWorker');

module.exports = function(manifoldjs, azure){
    var manifold = Manifold.create(manifoldjs),
        controller = ServiceWorkerController.create(manifold, Storage.create(azure));

    return router
        .get('/',controller.getServiceWorkerLocation)
        .get('/previewcode',controller.getServiceWorkerCodePreview);
};