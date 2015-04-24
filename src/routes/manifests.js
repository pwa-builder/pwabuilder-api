'use strict';

var express = require('express'),
    router = express.Router(),
    log = require('loglevel'),
    Manifold = require('../services/manifold'),
    Storage = require('../services/storage'),
    ManifestsController = require('../controllers/manifests');

global.logLevel = 'debug';
log.setLevel(global.logLevel);

module.exports = function(client,azure,manifoldjs){
    var manifold = Manifold.create(manifoldjs),
        controller = ManifestsController.create(client, Storage.create(azure), manifold);

    return router
        .get('/:id',controller.show)
        .post('/',controller.create)
        .put('/:id',controller.update)
        .post('/:id/build',controller.build);
};

