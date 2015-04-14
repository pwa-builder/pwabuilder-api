'use strict';

var express = require('express'),
    router = express.Router(),
    manifold = require('manifoldjs'),
    manifestTools = manifold.manifestTools;

router
    .get('/', function(req,res) {
        res.json();
    })
    .post('/',function(req,res,next){
        console.log('files',req.files);

        if(req.body.siteUrl){
            manifestTools.getManifestFromSite(req.body.siteUrl, function(err, manifestInfo) {
                if (err) {
                    //Connection error or invalid manifest format
                    console.log(err);
                    return next(err);
                }

                res.json(manifestInfo.content);
            });
        }else if(req.files.file){
            var file = req.files.file;

            manifestTools.getManifestFromFile (file.path, function (err, manifestInfo) {
                if (err) {
                    // File error or invalid manifest format
                    console.log(err);
                    return next(err);
                }

                res.json(manifestInfo.content);
            });
        }else{
            next(new Error('No url or manifest provided'));
        }
    });

module.exports = router;
