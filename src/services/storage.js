'use strict';

var archiver = require('archiver'),
    fs = require('fs'),
    path = require('path'),
    rimraf = require('rimraf'),
    wrench = require('wrench'),
    azure = require('azure-storage'),
    Q = require('q');

// The sanitizeName function was "borrowed" from ManifoldJS to fix an issue where package generation fails
// while generating a .zip archive if the app folder name differs from the short_name because it has been 
// sanitized. Copying this function is a temporary fix. Ideally, ManifoldJS should be updated to expose this
// function publicly.

// This function sanitizes the name to only allow the following: ([A-Za-z][A-Za-z0-9]*)(\.[A-Za-z][A-Za-z0-9]*)*
function sanitizeName(name) {
  var sanitizedName = name;
  
  // Remove all invalid characters
  sanitizedName = sanitizedName.replace(/[^A-Za-z0-9\.]/g, '');
  
  var currentLength;
  do {
    currentLength = sanitizedName.length;
    
    // If the name starts with a number, remove the number 
    sanitizedName = sanitizedName.replace(/^[0-9]/, '');
    
    // If the name starts with a dot, remove the dot
    sanitizedName = sanitizedName.replace(/^\./, '');
    
    // If there is a number right after a dot, remove the number
    sanitizedName = sanitizedName.replace(/\.[0-9]/g, '.');
    
    // If there are two consecutive dots, remove one dot
    sanitizedName = sanitizedName.replace(/\.\./g, '.');
    
    // if the name ends with a dot, remove the dot
    sanitizedName = sanitizedName.replace(/\.$/, '');
  } 
  while (currentLength > sanitizedName.length);
  
  if (sanitizedName.length === 0) {
    sanitizedName = 'MyManifoldJSApp';
  }
  
  return sanitizedName;
}

function Storage(blobService){
    this.blobService = blobService;
}

Storage.prototype.createZip = function(output, manifest){
    return Q.Promise(function(resolve,reject){
        console.log('Creating zip archive...');
        var archive = archiver('zip'),

        zip = fs.createWriteStream(path.join(output,manifest.content.short_name+'.zip'));

        zip.on('close',function(){
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');

            resolve();
        });

        archive.on('error',function(err){
            reject(err);
        });

        archive.pipe(zip);

        var folderName = path.join(output, sanitizeName(manifest.content.short_name));
        archive.directory(folderName, 'projects', { mode: '0755' }).finalize();
    });
};

Storage.prototype.createContainer = function(manifest){
    var self = this;

    return Q.Promise(function(resolve,reject){
        console.log('Creating storage container...');
        self.blobService.createContainerIfNotExists(manifest.id, {publicAccessLevel: 'blob'}, function(err) {
            if(err){ return reject(err); }
            return resolve();
        });
    });
};

Storage.prototype.uploadZip = function(manifest, outputDir){
    var self = this;

    return Q.Promise(function(resolve,reject){
        console.log('Uploading zip...');
        self.blobService.createBlockBlobFromLocalFile(manifest.id, manifest.content.short_name + '.zip', path.join(outputDir,manifest.content.short_name+'.zip'),{ contentType: 'application/zip' }, function(err){
            if(err){ return reject(err); }
            return resolve();
        });
    });
};

Storage.prototype.setPermissions = function(outputDir){
    console.log('Setting permissions on',outputDir,'...');
    wrench.chmodSyncRecursive(outputDir, '0755');
};

Storage.prototype.removeDir = function(outputDir){
    console.log('Deleting output directory...');

    return Q.Promise(function(resolve,reject){
        rimraf(outputDir,{ maxBusyTries: 20 },function(err){
            if(err){ return reject(err); }
            return resolve();
        });
    });
};

Storage.prototype.getUrlForZip = function(manifest){
    var container = manifest.id,
    blob = manifest.content.short_name + '.zip',
    accessPolicy = {
        AccessPolicy: {
            Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
            Start: new Date(),
            Expiry: azure.date.daysFromNow(7)
        }
    };

    var sasToken = this.blobService.generateSharedAccessSignature(container, blob, accessPolicy);
    return this.blobService.getUrl(container,blob,sasToken,true);
};

exports.create = function(blobService){
    return new Storage(blobService);
};
