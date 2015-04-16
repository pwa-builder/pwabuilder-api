'use strict';

var express = require('express'),
    router = express.Router(),
    uuid = require('node-uuid'),
    _ = require('lodash'),
    manifold = require('manifoldjs'),
    manifestTools = manifold.manifestTools;

function createManifest(manifestInfo,client,res){
    var manifest = _.assign(manifestInfo,{id: uuid.v4()});
    client.set(manifest.id,JSON.stringify(manifest));

    res.json(manifest);
}

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

                    createManifest(manifestInfo,client,res);
                });
            }else if(req.files.file){
                var file = req.files.file;

                manifestTools.getManifestFromFile (file.path, function (err, manifestInfo) {
                    if (err) {
                        console.log(err);
                        return next(err);
                    }

                    createManifest(manifestInfo,client,res);
                });
            }else{
                next(new Error('No url or manifest provided'));
            }
        })
        .put('/:id',function(req,res,next){
            client.get(req.params.id,function(err,reply){
                if(err) return next(err);
                if(!reply) return res.status(404).send('NOT FOUND');

                var manifest = JSON.parse(reply);

                manifest.content = _.assign(manifest.content,req.body);

                manifestTools.validateManifest(manifest, ['windows','ios'], function(err,results){
                    var errors = _.filter(results,{level: 'error'});

                    if(errors.length > 0){
                        var errorRes = { errors: {}};
                        _.each(errors,function(error){
                            if(errorRes.errors[error.member]){
                                errorRes.errors[error.member].push(error.description);
                            }else{
                                errorRes.errors[error.member] = [error.description];
                            }
                        });

                        return res.status(422).json(errorRes);
                    }


                    client.set(manifest.id,JSON.stringify(manifest));
                    res.json(manifest);
                });
            });
        });
};

