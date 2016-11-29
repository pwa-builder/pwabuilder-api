'use strict';

var archiver = require('archiver'),
    fs = require('fs'),
    path = require('path'),
    rimraf = require('rimraf'),
    wrench = require('wrench'),
    azure = require('azure-storage'),
    Q = require('q'),
    manifoldJsLib = require('manifoldjs-lib');

var utils = manifoldJsLib.utils;

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

        var folderName = path.join(output, utils.sanitizeName(manifest.content.short_name));
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

Storage.prototype.uploadZip = function(manifest, outputDir, suffix){
    var extension = '.zip';
    return this.uploadFile(manifest, path.join(outputDir,manifest.content.short_name + extension), extension, "-" + suffix);
};

Storage.prototype.uploadFile = function(manifest, filePath, extension, suffix){
    var self = this,
        suffix = suffix ? suffix : '',
        contentType = (extension == ".zip") ? 'application/zip' : 'application/octet-stream';

    return Q.Promise(function(resolve,reject){
        console.log('Uploading ' + extension + '...');
        self.blobService.createBlockBlobFromLocalFile(manifest.id, manifest.content.short_name + suffix + extension, filePath, { contentType: contentType }, function(err){
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

Storage.prototype.getUrlForFile = function(manifest, extension, suffix){
    var container = manifest.id,
    suffix = suffix ? suffix : '',
    blob = manifest.content.short_name + suffix + extension;

    var startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() - 15);

    var accessPolicy = {
        AccessPolicy: {
            Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
            Start: startDate,
            Expiry: azure.date.daysFromNow(7)
        }
    };

    var sasToken = this.blobService.generateSharedAccessSignature(container, blob, accessPolicy);
    return this.blobService.getUrl(container,blob,sasToken,true);
};

Storage.prototype.getUrlForZip = function(manifest, suffix){
   return this.getUrlForFile(manifest, '.zip', "-" + suffix);
};

exports.create = function(blobService){
    return new Storage(blobService);
};
