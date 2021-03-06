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

function Storage(blobService) {
  this.blobService = blobService;
}

Storage.prototype.createZip = function (output, fileName) {
  return Q.Promise(function (resolve, reject) {
    console.log('Creating zip archive...');
    var archive = archiver('zip'),

      zip = fs.createWriteStream(path.join(output, fileName.replace(/[^a-zA-Z0-9]/g,'_') + '.zip'));

    zip.on('close', function () {
      console.log(archive.pointer() + ' total bytes');
      console.log('archiver has been finalized and the output file descriptor has closed.');

      resolve();
    });

    archive.on('error', function (err) {
      reject(err);
    });

    archive.pipe(zip);

    var folderName = path.join(output, utils.sanitizeName(fileName.replace(/[^a-zA-Z0-9]/g,'_')));
    archive.directory(folderName, 'projects', { mode: '0755' }).finalize();
  });
};

Storage.prototype.createContainer = function (containerName) {
  var self = this;
  return Q.Promise(function (resolve, reject) {
    console.log('Creating storage container...');
    self.blobService.createContainerIfNotExists(containerName, { publicAccessLevel: 'blob' }, function (err) {
      if (err) { return reject(err); }
      return resolve();
    });
  });
};

Storage.prototype.uploadZip = function (containerName, fileName, outputDir, suffix, blobName) {
  var extension = '.zip';
  var _blobName = blobName || fileName.replace(/[^a-zA-Z0-9]/g,'_');
  return this.uploadFile(containerName, _blobName, path.join(outputDir, fileName.replace(/[^a-zA-Z0-9]/g,'_') + extension), extension, "-" + suffix);
};

Storage.prototype.uploadFile = function (containerName, fileName, filePath, extension, suffix) {
  var self = this,
    suffix = suffix || '',
    contentType = (extension == ".zip") ? 'application/zip' : 'application/octet-stream';
  return Q.Promise(function (resolve, reject) {
    console.log('Uploading ' + extension + '...');
    self.blobService.createBlockBlobFromLocalFile(containerName, fileName.replace(/[^a-zA-Z0-9]/g,'_') + suffix + extension, filePath, { contentType: contentType }, function (err) {
      if (err) { return reject(err); }
      return resolve();
    });
  });
};

function filewalker(dir, done) {
  let results = [];

  fs.readdir(dir, function (err, list) {
    if (err) return done(err);

    var pending = list.length;

    if (!pending) return done(null, results);

    list.forEach(function (file) {
      file = path.resolve(dir, file);

      fs.stat(file, function (err, stat) {
        // If directory, execute a recursive call
        if (stat && stat.isDirectory()) {
          // Add directory to array [comment if you need to remove the directories from the array]
          results.push(file);

          filewalker(file, function (err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);

          if (!--pending) done(null, results);
        }
      });
    });
  });
};

Storage.prototype.setPermissions = function (outputDir) {
  console.log('Setting permissions on', outputDir, '...');

  try {
    filewalker(outputDir, (err, data) => {
      if (err) {
        console.log(err);
      }
      else {
        console.log(data);
        
        data.forEach((path) => {
          fs.chmodSync(path, '0755');
        })
      }
    });
  }
  catch (err) {
    console.log(err, err.message);
  }
};

Storage.prototype.createDirectory = function (folderName) {
  return Q.Promise(function (resolve, reject) {
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

Storage.prototype.removeDir = function (outputDir) {
  console.log('Deleting output directory...');

  return Q.Promise(function (resolve, reject) {
    rimraf(outputDir, { maxBusyTries: 20 }, function (err) {
      if (err) { return reject(err); }
      return resolve();
    });
  });
};

Storage.prototype.getUrlForFile = function (containerName, fileName, extension, suffix) {
  var container = suffix = suffix || '',
    blob = fileName.replace(/[^a-zA-Z0-9]/g,'_') + suffix + extension;

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
  return this.blobService.getUrl(containerName, blob, sasToken, true);
};

Storage.prototype.getUrlForZip = function (containerName, fileName, suffix) {
  return this.getUrlForFile(containerName, fileName.replace(/[^a-zA-Z0-9]/g,'_'), '.zip', "-" + suffix);
};

Storage.prototype.createZipFromDirs = function (folders, folderName, fileName) {
  return Q.Promise(function (resolve, reject) {
    console.log('Creating zip archive...');
    var resultFilePath = path.join(folderName, fileName.replace(/[^a-zA-Z0-9]/g,'_') + '.zip');
    var archive = archiver('zip'),

      zip = fs.createWriteStream(resultFilePath);

    zip.on('close', function () {
      console.log(archive.pointer() + ' total bytes');
      console.log('archiver has been finalized and the output file descriptor has closed.');

      resolve();
    });

    archive.on('error', function (err) {
      reject(err);
    });

    archive.pipe(zip);

    folders.forEach(function (sourceFolder) {
      archive.directory(sourceFolder, path.basename(sourceFolder));
    });

    archive.finalize();
    return resolve(resultFilePath);
  });
};

Storage.prototype.copyDirectory = function (folder, outputFolder) {
  wrench.copyDirSyncRecursive(folder, path.join(outputFolder, path.basename(folder)), { forceDelete: true });
};

exports.create = function (blobService) {
  return new Storage(blobService);
};
