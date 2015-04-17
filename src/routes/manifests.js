'use strict';

var express = require('express'),
    router = express.Router(),
    uuid = require('node-uuid'),
    _ = require('lodash'),
    manifold = require('manifoldjs'),
    manifestTools = manifold.manifestTools,
    projectBuilder = manifold.projectBuilder,
    fs = require('fs'),
    path = require('path'),
    rimraf = require('rimraf'),
    outputDir = path.join(__dirname, '../../tmp'),
    platforms = ['windows', 'android', 'ios', 'chrome', 'firefox'];

function createManifest(manifestInfo,client,res){
    var manifest = _.assign(manifestInfo,{id: uuid.v4()});
    client.set(manifest.id,JSON.stringify(manifest));

    res.json(manifest);
}

function assignSuggestions(suggestions,manifest){
    var suggestion = { suggestions: {}};

    _.each(suggestions,function(s){
        if(suggestion.suggestions[s.member]){
            suggestion.suggestions[s.member].push(s.description);
        }else{
            suggestion.suggestions[s.member] = [s.description];
        }
    });

    manifest = _.assign(manifest,suggestion);
}

function assignWarnings(warnings, manifest){
    var warning = { warnings: {}};

    _.each(warnings,function(w){
        if(warning.warnings[w.member]){
            warning.warnings[w.member].push(w.description);
        }else{
            warning.warnings[w.member] = [w.description];
        }
    });

    manifest = _.assign(manifest,warning);
}

function sendValidationErrors(errors, res){
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
                        if(err.message === 'Failed to retrieve manifest from site.'){
                            return res.status(422).json({error: 'Failed to retrieve manifest from site.'});
                        }else{
                            return next(err);
                        }
                    }

                    createManifest(manifestInfo,client,res);
                });
            }else if(req.files.file){
                var file = req.files.file;

                manifestTools.getManifestFromFile (file.path, function (err, manifestInfo) {
                    if (err) {
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

                manifestTools.validateManifest(manifest, platforms, function(err,results){
                    var errors = _.filter(results,{level: 'error'}),
                        suggestions = _.filter(results,{level: 'suggestion'}),
                        warnings = _.filter(results,{level: 'warning'});

                    if(errors.length > 0){
                        return sendValidationErrors(errors,res);
                    }

                    if(suggestions.length > 0){
                        assignSuggestions(suggestions,manifest);
                    }

                    if(warnings.length > 0){
                        assignWarnings(warnings,manifest);
                    }


                    client.set(manifest.id,JSON.stringify(manifest));
                    res.json(manifest);
                });
            });
        })
        .post('/:id/build',function(req,res,next){
            client.get(req.params.id,function(err,reply){
                if(err) return next(err);
                if(!reply) return res.status(404).send('NOT FOUND');

                var manifest = JSON.parse(reply),
                    output = path.join(outputDir,manifest.id);

                rimraf(output,function(err){
                    if(err){ return next(err); }

                    projectBuilder.createApps(manifest, output, platforms, false, function (err) {
                        if (err) {
                            return next(err);
                        }

                        var files = fs.readdirSync(outputDir);
                        res.json(files);
                    });
                });

            });
        });
};

