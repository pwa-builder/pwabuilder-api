'use strict';

var chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon'),
    path = require('path'),
    PWABuilder = require('../../../src/services/pwabuilder'),
    uuid = require('uuid');

describe('pwabuilder service',function(){
    var pwabuilder,
        fakePWABuilderLib = {},
        fakeClient = {};

    describe('updateManifest',function(){

        it('should update the manifest',function(done){
            var manifestId = uuid.v4().slice(0,8),
                setSpy = sinon.spy();
            fakeClient = {
                get: function(id,cb){
                    cb(null, JSON.stringify({
                        id: manifestId,
                        content: {
                            start_url: 'http://www.bamideas.com'
                        }
                    }));
                },
                set: setSpy
            };

            fakePWABuilderLib.manifestTools = {
                validateManifest: function(manifest,platforms,cb){
                    cb(null,null);
                }
            };

            pwabuilder = PWABuilder.create(fakePWABuilderLib);

            pwabuilder.updateManifest(manifestId,{ name: 'Foo'},fakeClient)
                .then(function(manifest){
                    expect(manifest.content.name).to.equal('Foo');
                    expect(setSpy.calledOnce).to.equal(true);
                    done();
                })
                .fail(function(err){
                    done(err);
                });
        });
    });

    describe('normalize',function(){
        it('should normalize a url',function(done){
            fakePWABuilderLib.manifestTools = {
                validateAndNormalizeStartUrl: function(url,manifest,cb){
                    cb(null,{ content: { start_url: 'http://www.bamideas.com' }});
                }
            };

            pwabuilder = PWABuilder.create(fakePWABuilderLib);

            pwabuilder.normalize({ content: { start_url: 'bamideas.com' }})
                .then(function(manifest){
                    expect(manifest.content.start_url).to.equal('http://www.bamideas.com');
                    done();
                })
                .fail(function(err){
                    done(err);
                });
        });
    });

    describe('createProject',function(){
        it('should create the project',function(done){
            var testOutputDir = path.join('..','..','tmp');

            fakePWABuilderLib.projectBuilder = {
                createApps: function(manifest, outputDir, buildCordova, platforms, cb){
                    expect(manifest).to.deep.equal({content: { start_url: 'bamideas.com' }, generatedFrom: 'Website Wizard' });
                    cb(null);
                }
            };

            pwabuilder = PWABuilder.create(fakePWABuilderLib);

            pwabuilder.createProject({ id: '1234', content: { start_url: 'bamideas.com' }}, testOutputDir,false)
                .then(function(){
                    done();
                })
                .fail(function(err){
                    done(err);
                });
        });
    });
});
