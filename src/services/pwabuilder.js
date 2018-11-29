'use strict';

var uuid = require('uuid'),
  Q = require('q'),
  _ = require('lodash'),
  path = require('path'),
  config = require(path.join(__dirname,'../config')),
  puppeteer = require('puppeteer'),
  platforms = config.platforms;

function PWABuilder(pwabuilderLib){
  this.lib = pwabuilderLib;
  var platformsConfig = path.resolve(__dirname, '..', '..', 'platforms.json');
  this.lib.platformTools.configurePlatforms(platformsConfig);
}

const expirationTime = 604800;

PWABuilder.prototype.createManifestFromUrl = function(url,client){
  var self = this;

  if(url.indexOf('http') === -1){
    url = 'http://'+url;
  }

  return Q.Promise(function(resolve,reject){

    var callback = function(err, manifestInfo) {
      if (err) {
        return reject(err);
      }

      var manifest = _.assign(manifestInfo,{ id: uuid.v4().slice(0,8) });
      
      self.validateManifest(manifest)
      .then(function(manifest){
        client.set(manifest.id,JSON.stringify(manifest), 'EX', expirationTime);
        return resolve(manifest);
      })
      .fail(reject);
    }

    var resolveStartUrl =  function (err, manifestInfo) {
    if (err) {
      return callback(err, manifestInfo);
    }

    if (manifestInfo.format === self.lib.constants.BASE_MANIFEST_FORMAT) {
      return self.lib.manifestTools.validateAndNormalizeStartUrl(url, manifestInfo, callback);
    } else {
      return callback(undefined, manifestInfo);
    }
  }
    self.lib.manifestTools.getManifestFromSite(url, undefined, resolveStartUrl);
  });
};

PWABuilder.prototype.createManifestFromFile = function(file,client){
  var self = this;

  return Q.Promise(function(resolve,reject){
    self.lib.manifestTools.getManifestFromFile(file.path, function (err, manifestInfo) {
      if (err) { return reject(err); }

      var manifest = _.assign(manifestInfo,{ id: uuid.v4().slice(0,8) });
      self.validateManifest(manifest)
      .then(function(manifest){
        client.set(manifest.id,JSON.stringify(manifest), 'EX', expirationTime);
        return resolve(manifest);
      })
      .fail(reject);
    });
  });
};

PWABuilder.prototype.validateManifest = function(manifest){
  var self = this;

  var originalIcons = manifest.content.icons;
  manifest = self.cleanGeneratedIcons(manifest);

  return Q.Promise(function(resolve,reject){
    self.lib.manifestTools.validateManifest(manifest, platforms, function(err,results){
      if(err){ return reject(err); }

      var errors = _.filter(results,{level: 'error'}),
        suggestions = _.filter(results,{level: 'suggestion'}),
        warnings = _.filter(results,{level: 'warning'});

      self.assignValidationErrors(errors,manifest);
      self.assignSuggestions(suggestions,manifest);
      self.assignWarnings(warnings,manifest);

      // restore original icons
      manifest.content.icons = originalIcons;

      return resolve(manifest);
    });
  });
};

PWABuilder.prototype.updateManifest = function(client,manifestId,updates,assets) {
  var self = this;

  return Q.Promise(function(resolve,reject){
    client.get(manifestId,function(err,reply){
      if(err) return reject(err);
      if(!reply) return reject(new Error('Manifest not found'));

      var manifest = JSON.parse(reply);
      manifest.content = updates;

      if (assets) {
        manifest.assets = assets;
      } else {
        if ((updates.icons || []).filter(function(icon) { return icon.generated; }).length === 0) {
          delete manifest.assets;
        }
      }

      return self.validateManifest(manifest)
      .then(function(manifest){
        client.set(manifest.id,JSON.stringify(manifest), 'EX', expirationTime);

        resolve(manifest);
      });
    });
  });
};

PWABuilder.prototype.normalize = function(manifest){
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

PWABuilder.prototype.cleanGeneratedIcons = function(manifest){
  var self = this;

// remove properties in the manifest to track generated icons
  manifest.content.icons = (manifest.content.icons || []).map(function (icon) {
    return _.omit(icon, 'generated', 'fileName');
  });

  return manifest;
};

PWABuilder.prototype.createProject = function(manifest,outputDir,platforms){
  var self = this;

  return Q.Promise(function(resolve, reject){
    var cleanManifest = _.omit(manifest,'id');
    cleanManifest = _.assign(cleanManifest,{ generatedFrom: 'Website Wizard' });
    console.log('Building the project...',cleanManifest,outputDir,platforms);
    try{
      if (!manifest.assets) {
        manifest.assets = [];
      }
      manifest.assets.map(function (asset) {
        asset.data = new Buffer(asset.data, 'hex');
      });

      var options = {
        'crosswalk' : false,
        'build'     : false,
        'assets'    : manifest.assets
      };

      self.lib.projectBuilder.createApps(cleanManifest, outputDir, platforms, options, function (err, projectDir) {

        if(err){
          console.log('Create Projects Errors!!!',err);
          return reject(err);
        }

        return resolve(projectDir);
      });
    }catch(e){
      return reject(e);
    }
  });
};

PWABuilder.prototype.packageProject = function(platforms,outputDir,options){
  var self = this;

  return Q.Promise(function(resolve, reject){
    console.log('Packaging the project...',outputDir,platforms);
    try{

      self.lib.projectBuilder.packageApps(platforms, outputDir, options, function (err, packagePaths) {

        if(err){
          console.log('Package Project Errors!!!',err);
          return reject(err);
        }

        return resolve(packagePaths);
      });
    }catch(e){
      return reject(e);
    }
  });
};

PWABuilder.prototype.getServiceWorkers = function(id) {
  var self = this;

  return Q.Promise(function (resolve, reject) {
    self.lib.serviceWorkerTools.getAssetsFolders(id, function (err, resultURL) {
      return resolve(resultURL);
    });
  });
};

PWABuilder.prototype.getServiceWorkersDescription = function() {
  var self = this;

  return Q.Promise(function (resolve, reject) {
    self.lib.serviceWorkerTools.getServiceWorkersDescription(function (err, resultURL) {
      return resolve(resultURL);
    });
  });
};

PWABuilder.prototype.assignValidationErrors = function(errors,manifest){
  var data = { errors: []};

  _.each(errors,function(e){
    if(_.some(data.errors,'member',e.member)){
      var error = _.find(data.errors,'member',e.member);
      error.issues = error.issues || [];
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

PWABuilder.prototype.assignSuggestions = function(suggestions,manifest){
  var data = { suggestions: []};

  _.each(suggestions,function(s){
    if(_.some(data.suggestions,'member',s.member)){
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

PWABuilder.prototype.assignWarnings = function(warnings,manifest){
  var data = { warnings: []};

  _.each(warnings,function(w){
    if(_.some(data.warnings,'member',w.member)){
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

PWABuilder.prototype.generateImagesForManifest = function(image, manifestInfo, client) {
  var self = this;

  var options = {
    generationSvcUrl: config.images.generationSvcUrl
  };

  return Q.Promise(function(resolve, reject) {
    self.lib.manifestTools.generateImagesForManifest(image, manifestInfo.content, options, function(err, resultManifestInfo) {
      if (err) {
        return reject(err);
      } else {
        return resolve(resultManifestInfo);
      }
    });
  });
}

PWABuilder.prototype.getServiceWorkerFromURL = function(url) {
  return Q.Promise(async function(resolve,reject){
    const browser = await puppeteer.launch({headless: true, args: ["--no-sandbox"]});
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: ['networkidle0','load', 'domcontentloaded']});

    try {
      let serviceWorkerHandle = await page.waitForFunction(() => {
        return navigator.serviceWorker.ready.then((res) => res.active.scriptURL);
      }, {timeout: config.serviceWorkerChecker.timeout});
      
      return resolve(serviceWorkerHandle.jsonValue());
    } catch (error) {
      if(error.name && error.name.indexOf("TimeoutError") > -1){
        return resolve(false);
      }
      return reject(error);
    }
  })
}


exports.create = function(pwabuilderLib){
  return new PWABuilder(pwabuilderLib);
};
