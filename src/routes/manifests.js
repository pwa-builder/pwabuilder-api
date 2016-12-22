'use strict';

var express = require('express'),
    router = express.Router(),
    Manifold = require('../services/manifold'),
    Storage = require('../services/storage'),
    ManifestsController = require('../controllers/manifests');

module.exports = function(client,azure,manifoldjs){
    var manifold = Manifold.create(manifoldjs),
        controller = ManifestsController.create(client, Storage.create(azure), manifold);

    return router
        .get('/:id',controller.show)
        .get('/:id/download', controller.download)
        .post('/',controller.create)
        .put('/:id',controller.update)
        .post('/:id/build',controller.build)
        .post('/:id/package', controller.package);
};

