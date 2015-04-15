'use strict';

var express = require('express'),
    router = express.Router(),
    uuid = require('node-uuid'),
    _ = require('lodash'),
    manifold = require('manifoldjs'),
    manifestTools = manifold.manifestTools;


module.exports = function(client){

    return router
        .get('/:id',function(req,res,next){
            client.get(req.params.id,function(err,reply){
                if(err) return next(err);
                if(!reply) return res.status(404).send('NOT FOUND');

                var manifest = JSON.parse(reply);
                res.json(manifest);
            });
        })
        .post('/',function(req,res,next){
            if(req.body.siteUrl){
                manifestTools.getManifestFromSite(req.body.siteUrl, function(err, manifestInfo) {
                    if (err) {
                        console.log(err);
                        return next(err);
                    }

                    var manifest = _.assign(manifestInfo.content,{id: uuid.v4()});
                    client.set(manifest.id,JSON.stringify(manifest));

                    res.json(manifest);
                });
            }else if(req.files.file){
                var file = req.files.file;

                manifestTools.getManifestFromFile (file.path, function (err, manifestInfo) {
                    if (err) {
                        console.log(err);
                        return next(err);
                    }

                    var manifest = _.assign(manifestInfo.content,{id: uuid.v4()});
                    client.set(manifest.id,JSON.stringify(manifest));

                    res.json(manifest);
                });
            }else{
                next(new Error('No url or manifest provided'));
            }
        });
};
