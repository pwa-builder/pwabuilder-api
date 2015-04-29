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

    if(url.indexOf('http') === -1){
        url = 'http://'+url;
    }

    return Q.Promise(function(resolve,reject){
        self.lib.manifestTools.getManifestFromSite(url, function(err, manifestInfo) {
            if (err) {
                if(err.message !== 'Failed to retrieve manifest from site.'){
                    return reject(err);
                }else{
                    manifestInfo = {
                        content: {
                        },
                        format: 'w3c'
                    };
                }
            }

            var manifest = _.assign(manifestInfo,{ id: uuid.v4().slice(0,8) });

            self.validateManifest(manifest)
                .then(function(manifest){
                    client.set(manifest.id,JSON.stringify(manifest));
                    return resolve(manifest);
                })
                .fail(reject);
        });
    });
};

Manifold.prototype.createManifestFromFile = function(file,client){
    var self = this;

    return Q.Promise(function(resolve,reject){
        self.lib.manifestTools.getManifestFromFile(file.path, function (err, manifestInfo) {
            if (err) { return reject(err); }

            var manifest = _.assign(manifestInfo,{ id: uuid.v4().slice(0,8) });
            self.validateManifest(manifest)
                .then(function(manifest){
                    client.set(manifest.id,JSON.stringify(manifest));
                    return resolve(manifest);
                })
                .fail(reject);
        });
    });
};

Manifold.prototype.validateManifest = function(manifest){
    var self = this;

    return Q.Promise(function(resolve,reject){
        self.lib.manifestTools.validateManifest(manifest, platforms, function(err,results){
            if(err){ return reject(err); }

            var errors = _.filter(results,{level: 'error'}),
            suggestions = _.filter(results,{level: 'suggestion'}),
            warnings = _.filter(results,{level: 'warning'});

            self.assignValidationErrors(errors,manifest);
            self.assignSuggestions(suggestions,manifest);
            self.assignWarnings(warnings,manifest);

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
            manifest.content = updates;

            return self.validateManifest(manifest)
                .then(function(manifest){
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
    var data = { errors: []};

    _.each(errors,function(e){
        if(_.any(data.errors,'member',e.member)){
            var error = _.find(data.errors,{ memeber: e.member });
            error.issues.push({ description: e.description, platform: e.platform, code: e.code });
        }else{
            data.errors.push({
                member: e.member,
                issues: [{
                    description: e.description,
                    platform: e.platform,
                    code: e.code
                }]
            });
        }
    });

    manifest = _.assign(manifest,data);
};

Manifold.prototype.assignSuggestions = function(suggestions,manifest){
    var data = { suggestions: []};

    _.each(suggestions,function(s){
        if(_.any(data.suggestions,'member',s.member)){
            var suggestion = _.find(data.suggestions,'member',s.member);
            suggestion.issues = suggestion.issues || [];
            suggestion.issues.push({ description: s.description, platform: s.platform, code: s.code });
        }else{
            data.suggestions.push({
                member: s.member,
                issues: [{
                    description: s.description,
                    platform: s.platform,
                    code: s.code
                }]
            });
        }
    });

    manifest = _.assign(manifest,data);
};

Manifold.prototype.assignWarnings = function(warnings,manifest){
    var data = { warnings: []};

    _.each(warnings,function(w){
        if(_.any(data.warnings,'member',w.member)){
            var warning = _.find(data.warnings,'member',w.member);
            warning.issues = warning.issues || [];
            warning.issues.push({ description: w.description, platform: w.platform, code: w.code });
        }else{
            data.warnings.push({
                member: w.member,
                issues: [{
                    description: w.description,
                    platform: w.platform,
                    code: w.code
                }]
            });
        }
    });

    manifest = _.assign(manifest,data);
};

exports.create = function(manifoldLib){
    return new Manifold(manifoldLib);
};
