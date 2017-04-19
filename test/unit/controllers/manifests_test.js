'use strict';

var chai = require('chai'),
    expect = chai.expect,
    Q = require('q'),
    uuid = require('node-uuid'),
    manifestController = require('../../../src/controllers/manifests');

describe('manifests controller',function(){
    var fakePWABuilderLib = {},
        fakeClient = {},
        fakeStorage = {};

    describe('build',function(){
        var manifestId = uuid.v4().slice(0,8);

        it('should return the archive url',function(done){
            fakeClient = {
                get: function(id,cb){
                    cb(null, JSON.stringify({
                        id: manifestId,
                        content: {
                            start_url: 'http://www.bamideas.com',
                            short_name: 'BaM'
                        }
                    }));
                }
            };

            fakeStorage = {
                createZip: function(){
                    return Q.Promise(function(resolve){
                        resolve();
                    });
                },
                createContainer: function(){
                    return Q.Promise(function(resolve){
                        resolve();
                    });
                },
                uploadZip: function(){
                    return Q.Promise(function(resolve){
                        resolve();
                    });
                },
                getUrlForZip: function(){
                    return Q.Promise(function(resolve){
                        resolve('http://storage.azure.net/site.zip');
                    });
                },
                removeDir: function(){
                    return Q.Promise(function(resolve){
                        resolve();
                    });
                },
                setPermissions: function(){
                    return;
                }
            };

            fakePWABuilderLib = {
                normalize: function(manifest){
                    return Q.Promise(function(resolve){
                        resolve(manifest);
                    });
                },
                createProject: function(){
                    return Q.Promise(function(resolve){
                        resolve();
                    });
                }
            };

            var fakeReq = {
                params: {
                    id: manifestId
                }
            };

            var fakeRes = {
                json: function(jsonData){
                    expect(jsonData.archive).to.equal('http://storage.azure.net/site.zip');
                    done();
                }
            };

            var fakeNext = function(err){
                done(err);
            };

            var controller = manifestController.create(fakeClient,fakeStorage,fakePWABuilderLib);

            controller.build(fakeReq,fakeRes,fakeNext);
        });
    });
});
