'use strict';

var path    = require('path'),
  outputDir = process.env.TMP,
  config    = require(path.join(__dirname,'../config')),
  util      = require('util'),
  Q         = require('q'),
  fs        = require('fs');

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
      manifold.updateManifest(client,req.params.id,req.body)
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
          //raygun.send(err);
          return res.json(500,{ error: 'There was a problem loading the project, please try building it again.' });
        }
        if(!reply) return res.status(404).send('NOT FOUND');

        var platforms = req.body.platforms;
        if (!platforms) {
          // No platforms were selected by the user. Using default configured platforms.
          platforms = config.platforms;
        }

        console.log('Platforms: ', platforms);
        
        var manifest = JSON.parse(reply),
          output = path.join(outputDir,manifest.id),
          dirSuffix = req.body.dirSuffix;

        if (dirSuffix) {
          output += "-" + dirSuffix;
        }

        console.log("Output: ", output);
        console.log("ManifestInfo: " + manifest);

        storage.removeDir(output)
          .then(function(){ return manifold.normalize(manifest); })
          .then(function(normManifest){
              manifest = normManifest; 
              return manifold.createProject(manifest,output,platforms);
          })
          .then(function(){ return storage.setPermissions(output); })
          .then(function(){ return storage.createZip(output, manifest.content.short_name); })
          .then(function(){ return storage.createContainer(manifest.id); })
          .then(function(){ return storage.uploadZip(manifest.id, manifest.content.short_name, output, dirSuffix); })
          .then(function(){ return storage.removeDir(output); })
          .then(function(){ return storage.getUrlForZip(manifest.id, manifest.content.short_name, dirSuffix); })
          .then(function(url){ res.json({archive: url}); })
          .fail(function(err){
            //raygun.send(err);
            return res.json(500, { error: err.message });
          });
      });
    },
    package: function(req,res){
      client.get(req.params.id,function(err,reply){
        if(err){
          //raygun.send(err);
          return res.json(500,{ error: 'There was a problem packaging the project, please try packaging it again.' });
        }
        if(!reply) return res.status(404).send('NOT FOUND');

        var platform = req.body.platform;
        var packageOptions = req.body.options;

        if (!platform) {
          // No platforms were selected by the user. Using default configured platforms.
          return res.json(400,{ error: 'No platform has been provided' });
        }

        var platforms = [ platform ];

        console.log('Platform: ', platform);

        var manifest = JSON.parse(reply),
          output = path.join(outputDir,manifest.id),
          dirSuffix = req.body.dirSuffix;

        if (dirSuffix) {
          output += "-" + dirSuffix;
        }

        console.log("Output: ", output);

        var result = storage.removeDir(output)
          .then(function(){ return manifold.normalize(manifest); })
          .then(function(normManifest){
              manifest = normManifest; 
              return manifold.createProject(manifest,output,platforms);
          })
          .then(function(projectDir){
              return manifold.packageProject(platforms, projectDir, packageOptions);
          });

          if (packageOptions.DotWeb) {
            var dotWebPath;
            result
             .then(function(packagePaths){
                if (packagePaths.length > 1) {
                  return res.json(400,{ error: 'Multiple packages created. Expected just one.' });
                }
                dotWebPath = packagePaths[0]; 
                return storage.createContainer(manifest); 
              })
             .then(function(){ return storage.uploadFile(manifest.id, manifest.content.short_name, dotWebPath, '.web'); })
             .then(function(){ return storage.removeDir(output); })
             .then(function(){ return storage.getUrlForFile(manifest.id, manifest.content.short_name, '.web'); })
             .then(function(url){ res.json({archive: url}); })
             .fail(function(err){
               return res.json(500, { error: err.message });
            });
          }
          else {
            result
            .then(function(){ return storage.removeDir(output); })
            .then(function(){ res.json(null); })
            .fail(function(err){
              return res.json(500, { error: err.message });
            });
          }
      });
    },
    generateMissingImages: function(req, res) {
      client.get(req.params.id,function(err,reply){
        if(err){
          //raygun.send(err);
          return res.json(500,{ error: 'There was a problem loading the manifest, please try it again.' });
        }
        if(!reply) return res.status(404).send('NOT FOUND');

        var manifestInfo = JSON.parse(reply);
        manifestInfo.content.icons = manifestInfo.content.icons.filter(function (icon) {
          return !icon.generated;
        });

        var persistedIcons = JSON.parse(JSON.stringify(manifestInfo.content.icons));

        var imageFile = req.files.file;
        Q.nfcall(fs.readFile, imageFile.path).then(function (imageContents) {
          manifold.generateImagesForManifest(imageContents, manifestInfo, client)
            .then(function (manifest) {
              if (manifest.icons.length !== persistedIcons.length) { 
                manifest.icons.map(function (icon) {
                  var exists = false;
                  persistedIcons.forEach(function(_icon) {
                    if (_icon.src === icon.src && 
                        _icon.sizes === icon.sizes) {
                          exists = true;
                        }
                  }, this);

                  if (!exists) {
                    icon.generated = true;
                  }
                });
              }
              return manifest;
            })
            .then(function(manifest) {
              var assets = [{fileName: imageFile.originalname, data: imageContents.toString('hex')}];
              return manifold.updateManifest(client,req.params.id,manifest,assets);
            }).then(function (manifestInfo) {
              res.json(manifestInfo);
            });
        });
      });
    }
  };
};
