'use strict';

var uuid = require('node-uuid'),
    Q = require('q'),
    _ = require('lodash'),
    path = require('path'),
    config = require(path.join(__dirname,'../config')),
    platforms = config.platforms;

function Manifold(manifoldLib){
    this.lib = manifoldLib;
}

Manifold.prototype.createManifestFromUrl = function(url,client){
    var self = this;

    return Q.Promise(function(resolve,reject){
        self.lib.manifestTools.getManifestFromSite(url, function(err, manifestInfo) {
            if (err) { return reject(err); }

            var manifest = _.assign(manifestInfo,{ id: uuid.v4().slice(0,8) });
            client.set(manifest.id,JSON.stringify(manifest));

            return resolve(manifest);
        });
    });
};

Manifold.prototype.createManifestFromFile = function(file,client){
    var self = this;

    return Q.Promise(function(resolve,reject){
        self.lib.manifestTools.getManifestFromFile(file.path, function (err, manifestInfo) {
            if (err) { return reject(err); }

            var manifest = _.assign(manifestInfo,{ id: uuid.v4().slice(0,8) });
            client.set(manifest.id,JSON.stringify(manifest));

            return resolve(manifest);
        });
    });
};

Manifold.prototype.updateManifest = function(manifestId,updates,client) {
    var self = this;

    return Q.Promise(function(resolve,reject){
        client.get(manifestId,function(err,reply){
            if(err) return reject(err);
            if(!reply) return reject(new Error('Manifest not found'));

            var manifest = JSON.parse(reply);
            manifest.content = _.assign(manifest.content,updates);

            self.lib.manifestTools.validateManifest(manifest, platforms, function(err,results){
                if(err){ return reject(err); }

                var errors = _.filter(results,{level: 'error'}),
                suggestions = _.filter(results,{level: 'suggestion'}),
                warnings = _.filter(results,{level: 'warning'});

                self.assignValidationErrors(errors,manifest);
                self.assignSuggestions(suggestions,manifest);
                self.assignWarnings(warnings,manifest);

                client.set(manifest.id,JSON.stringify(manifest));

                resolve(manifest);
            });
        });
    });
};

Manifold.prototype.normalize = function(manifest){
    var self = this;

    return Q.Promise(function(resolve,reject){
        console.log('Validating start url...');
        self.lib.manifestTools.validateAndNormalizeStartUrl(manifest.content.start_url,manifest,function(err,normManifest){
            if(err){
                console.log('Normalizing Error',err);
                return reject(err);
            }

            manifest = _.assign(manifest,normManifest);

            resolve(manifest);
        });
    });
};

Manifold.prototype.createProject = function(manifest,outputDir,platforms,buildCordova){
    var self = this;

    return Q.Promise(function(resolve, reject){
        var cleanManifest = _.omit(manifest,'id');
        console.log('Building the project...',cleanManifest,outputDir,platforms,buildCordova);
        self.lib.projectBuilder.createApps(cleanManifest, outputDir, platforms, buildCordova, function (err) {

            if(err){
                console.log('Create Projects Errors!!!',err);
                return reject(err);
            }

            return resolve();
        });
    });
};

Manifold.prototype.assignValidationErrors = function(errors,manifest){
    var error = { errors: {}};

    _.each(errors,function(s){
        if(error.errors[s.member]){
            error.errors[s.member].push(s.description);
        }else{
            error.errors[s.member] = [s.description];
        }
    });

    manifest = _.assign(manifest,error);
};

Manifold.prototype.assignSuggestions = function(suggestions,manifest){
    var suggestion = { suggestions: {}};

    _.each(suggestions,function(s){
        if(suggestion.suggestions[s.member]){
            suggestion.suggestions[s.member].push(s.description);
        }else{
            suggestion.suggestions[s.member] = [s.description];
        }
    });

    manifest = _.assign(manifest,suggestion);
};

Manifold.prototype.assignWarnings = function(warnings,manifest){
    var warning = { warnings: {}};

    _.each(warnings,function(w){
        if(warning.warnings[w.member]){
            warning.warnings[w.member].push(w.description);
        }else{
            warning.warnings[w.member] = [w.description];
        }
    });

    manifest = _.assign(manifest,warning);
};

exports.create = function(manifoldLib){
    return new Manifold(manifoldLib);
};
