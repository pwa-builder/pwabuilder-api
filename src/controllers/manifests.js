'use strict';

var path    = require('path'),
  outputDir = path.join(__dirname, '../../tmp'),
  config    = require(path.join(__dirname,'../config')),
  platforms = config.platforms;

exports.create = function(client, storage, manifold, raygun){
  return {
    show: function(req,res,next){
      client.get(req.params.id,function(err,reply){
        if(err) return next(err);
        if(!reply) return res.status(404).send('NOT FOUND');

        var manifest = JSON.parse(reply);
        res.json(manifest);
      });
    },
    create: function(req,res,next){
      if(req.body.siteUrl){
        manifold.createManifestFromUrl(req.body.siteUrl,client)
        .then(function(manifest){
          res.json(manifest);
        })
        .fail(function(err){
          if(err.message === 'Failed to retrieve manifest from site.'){
            return res.status(422).json({error: 'Failed to retrieve manifest from site.'});
          }else{
            return next(err);
          }

        });
      }else if(req.files.file){
        var file = req.files.file;
        manifold.createManifestFromFile(file,client)
        .then(function(manifest){
          res.json(manifest);
        })
        .fail(function(err){
          return next(err);
        });
      }else{
        next(new Error('No url or manifest provided'));
      }
    },
    update: function(req,res,next){
      manifold.updateManifest(req.params.id,req.body,client)
      .then(function(manifest){
        res.json(manifest);
      })
      .fail(function(err){
        if(err.message === 'Manifest not found'){
          return res.status(404).json({error: err});
        }

        next(err);
      });
    },
    build: function(req,res){
      client.get(req.params.id,function(err,reply){
        if(err){
          raygun.send(err);
          return res.json(500,{ error: 'There was a problem loading the project, please try building it again.' });
        }
        if(!reply) return res.status(404).send('NOT FOUND');

        var manifest = JSON.parse(reply),
          output = path.join(outputDir,manifest.id);

        manifold.normalize(manifest)
          .then(function(normManifest){
            manifest = normManifest;
            return manifold.createProject(manifest,output,platforms,false);
          })
          .then(function(){ return storage.setPermissions(output); })
          .then(function(){ return storage.createZip(output,manifest); })
          .then(function(){ return storage.createContainer(manifest); })
          .then(function(){ return storage.uploadZip(manifest,output); })
          .then(function(){ return storage.removeDir(output); })
          .then(function(){ return storage.getUrlForZip(manifest); })
          .then(function(url){ res.json({archive: url}); })
          .fail(function(err){
            raygun.send(err);
            return res.json(500, { error: err.message });
          });
      });
    }
  };
};
