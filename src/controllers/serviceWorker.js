'use strict';

var archiver = require('archiver'),
    uuid = require('node-uuid'),
    path = require('path'),
    Q = require('q'),
    fs = require('fs'),
    outputDir = process.env.TMP;

exports.create = function(pwabuilder, storage){
    var folders,
        storageContainer,
        folderName,
        tempFilePath,
        blobName = 'serviceworker';

    return {
        getServiceWorkerLocation: function (req,res,next) {
            pwabuilder.getServiceWorkers(req.query.ids)
                .then(function(resultFolders) {
                    folders = resultFolders;
                    storageContainer = uuid.v4();
                    folderName = path.join(outputDir, storageContainer);
                    return storage.createDirectory(folderName);
                })
                .then(function() { return storage.createZipFromDirs(folders, folderName, storageContainer); })
                .then(function(fileResult) {
                    tempFilePath = fileResult;
                    return storage.createContainer(storageContainer);
                })
                .then(function() { return storage.uploadZip(storageContainer, path.basename(tempFilePath, '.zip'), folderName, 'sw', blobName); } )
                .then(function() { return storage.getUrlForZip(storageContainer, blobName, 'sw' ) } )
                .then(function(url) {
                    res.json( { archive: url } );
                })
                .fail(function(err){
                    //raygun.send(err);
                    return res.status(500) .json({ error: err.message, trace: err.stackTrace });
                })
                .fin(function() { return storage.removeDir(folderName); });
        },
        getServiceWorkerCodePreview: function(req, res, next){
            pwabuilder.getServiceWorkers(req.query.ids)
                .then(function(resultFolders) {
                    return getFilesFromFolders(resultFolders);
                })
                .then(function (selectedFiles) {
                    var pendingTasks = [];
                    selectedFiles.map(function (file) {
                        var defer = Q.defer();
                        pendingTasks.push(defer.promise);

                        fs.readFile(file, 'utf8', function (error, data) {
                            if (error) {
                                defer.reject(error);
                            }
                            defer.resolve( {fileName: file, fileContent: data } );
                        });
                    });

                    return Q.allSettled(pendingTasks).then(function(results) {
                        var result = results.reduce(function (success, result) {
                            if (result.state !== 'fulfilled') {
                                log.error(result.reason.getMessage());
                                return false;
                            }
                            return success;
                        }, true);

                        if (!result) {
                            return Q.reject(new Error('One or more files could not be generated successfully.'));
                        } else {
                            return Q.resolve(
                                results.map(function(data){
                                    return data.value;
                                })
                            );
                        }
                    });
                })
                .then(function(fileContents) {
                    var webSiteFileContent = '',
                        serviceWorkerFileContent = '';

                    fileContents.map(function (file) {
                        if (file.fileName.lastIndexOf("register.js") != -1) {
                            webSiteFileContent += file.fileContent;
                        } else if (file.fileName.lastIndexOf("-sw.js") != -1) {
                            serviceWorkerFileContent += file.fileContent;
                        }
                    });

                    return res.json({
                        webSite: webSiteFileContent,
                        serviceWorker: serviceWorkerFileContent
                    });
                });
        }
    };

    function getFilesFromFolders(folders) {
        var selectedFiles = [];

        var pendingTasks = folders.map(function (folder){
            return getFilteredFilesFromFolder(folder);
        });

        return Q.allSettled(pendingTasks)
            .then(function (results) {
                var result = results.reduce(function (success, result) {
                    if (result.state !== 'fulfilled') {
                        log.error(result.reason.getMessage());
                        return false;
                    }
                    return success;
                }, true);

                if (!result) {
                    return Q.reject(new Error('One or more files could not be generated successfully.'));
                } else {
                    var resultFiles = [];
                    results.map(function(result) {
                        result.value.map(function (resultItem) {
                            resultFiles.push(resultItem);
                        });
                    });
                    return Q.resolve(resultFiles);
                }
            });
    }

    function getFilteredFilesFromFolder(folder) {
        return Q.Promise(function (resolve, reject) {
            //Read folders
            fs.readdir(folder, function (err, files){
                //Assume that files wich ends with register.js (registration of ServiceWorker) or -sw.js (Service Worker) only matterss.
                var filteredFiles = files.filter(function (item) {
                    return item.lastIndexOf("register.js") != -1 || item.lastIndexOf("-sw.js") != -1;
                }).map(function (item) {
                    return path.join(folder, item);
                });
                resolve(filteredFiles);
            });
        });
    }
};