'use strict';

var express = require('express'),
    router = express.Router(),
    PWABuilder = require('../services/pwabuilder'),
    Storage = require('../services/storage'),
    ManifestsController = require('../controllers/manifests');

module.exports = function(client,azure,pwabuilderLib){
    var pwabuilder = PWABuilder.create(pwabuilderLib),
        controller = ManifestsController.create(client, Storage.create(azure), pwabuilder);

    return router
        .get('/:id',controller.show)
        .post('/',controller.create)
        .put('/:id',controller.update)
        .post('/:id/build',controller.build)
        .post('/:id/package', controller.package)
        .post('/:id/generatemissingimages', controller.generateMissingImages);
};

