'use strict';

var express = require('express'),
    router = express.Router(),
    PWABuilder = require('../services/pwabuilder'),
    Storage = require('../services/storage'),
    ServiceWorkerController = require('../controllers/serviceWorker');

module.exports = function(pwabuilderLib, azure){
    var pwabuilder = PWABuilder.create(pwabuilderLib),
        controller = ServiceWorkerController.create(pwabuilder, Storage.create(azure));

    return router
        .get('/',controller.getServiceWorkerLocation)
        .get('/previewcode',controller.getServiceWorkerCodePreview)
        .get('/getServiceWorkersDescription', controller.getServiceWorkersDescription);
};