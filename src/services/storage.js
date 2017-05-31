'use strict';

var archiver = require('archiver'),
    fs = require('fs'),
    path = require('path'),
    rimraf = require('rimraf'),
    wrench = require('wrench'),
    azure = require('azure-storage'),
    Q = require('q'),
    pwabuilderLib = require('pwabuilder-lib');

var utils = pwabuilderLib.utils;

function Storage(blobService){
    this.blobService = blobService;
}

Storage.prototype.createZip = function(output, fileName){
    return Q.Promise(function(resolve,reject){
        console.log('Creating zip archive...');
        var archive = archiver('zip'),

        zip = fs.createWriteStream(path.join(output,fileName+'.zip'));

        zip.on('close',function(){
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');

            resolve();
        });

        archive.on('error',function(err){
            reject(err);
        });

        archive.pipe(zip);

        var folderName = path.join(output, utils.sanitizeName(fileName));
        archive.directory(folderName, 'projects', { mode: '0755' }).finalize();
    });
};

Storage.prototype.createContainer = function(containerName){
    var self = this;
    return Q.Promise(function(resolve,reject){
        console.log('Creating storage container...');
        self.blobService.createContainerIfNotExists(containerName, {publicAccessLevel: 'blob'}, function(err) {
            if(err){ return reject(err); }
            return resolve();
        });
    });
};

Storage.prototype.uploadZip = function(containerName, fileName, outputDir, suffix, blobName){
    var extension = '.zip';
    var _blobName = blobName || fileName;
    return this.uploadFile(containerName, _blobName, path.join(outputDir, fileName + extension), extension, "-" + suffix);
};

Storage.prototype.uploadFile = function(containerName, fileName, filePath, extension, suffix){
    var self = this,
        suffix = suffix || '',
        contentType = (extension == ".zip") ? 'application/zip' : 'application/octet-stream';
    return Q.Promise(function(resolve,reject){
        console.log('Uploading ' + extension + '...');
        self.blobService.createBlockBlobFromLocalFile(containerName, fileName + suffix + extension, filePath, { contentType: contentType }, function(err){
            if(err){ return reject(err); }
            return resolve();
        });
    });
};

Storage.prototype.setPermissions = function(outputDir){
    console.log('Setting permissions on',outputDir,'...');
    wrench.chmodSyncRecursive(outputDir, '0755');
};

Storage.prototype.createDirectory = function(folderName) {
    return Q.Promise(function(resolve,reject){
        fs.mkdir(folderName, function (err) {
            if (err) {
                console.error(err);
                reject(err);
            }
            console.log("Directory " + folderName + " created successfully!");
            resolve();
        });
    });
}

Storage.prototype.removeDir = function(outputDir){
    console.log('Deleting output directory...');

    return Q.Promise(function(resolve,reject){
        rimraf(outputDir,{ maxBusyTries: 20 },function(err){
            if(err){ return reject(err); }
            return resolve();
        });
    });
};

Storage.prototype.getUrlForFile = function(containerName, fileName, extension, suffix){
    var container = suffix = suffix || '',
    blob = fileName + suffix + extension;

    var startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() - 15);

    var accessPolicy = {
        AccessPolicy: {
            Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
            Start: startDate,
            Expiry: azure.date.daysFromNow(7)
        }
    };

    var headers = {
        contentDisposition: 'attachment; filename=' + blob
    };

    var sasToken = this.blobService.generateSharedAccessSignature(containerName, blob, accessPolicy, headers);
    return this.blobService.getUrl(containerName,blob,sasToken,true);
};

Storage.prototype.getUrlForZip = function(containerName, fileName, suffix){
   return this.getUrlForFile(containerName, fileName, '.zip', "-" + suffix);
};

Storage.prototype.createZipFromDirs = function(folders, folderName, fileName) {
    return Q.Promise(function(resolve,reject){
        console.log('Creating zip archive...');
        var resultFilePath = path.join(folderName, fileName+'.zip');
        var archive = archiver('zip'),

        zip = fs.createWriteStream(resultFilePath);

        zip.on('close',function(){
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');

            resolve();
        });

        archive.on('error',function(err){
            reject(err);
        });

        archive.pipe(zip);

        folders.forEach(function(sourceFolder) {
            archive.directory(sourceFolder, path.basename(sourceFolder));
        });

        archive.finalize();
        return resolve(resultFilePath);
    });
};

Storage.prototype.copyDirectory= function(folder, outputFolder){
    wrench.copyDirSyncRecursive(folder, path.join(outputFolder, path.basename(folder)), { forceDelete:true });
};

exports.create = function(blobService){
    return new Storage(blobService);
};
