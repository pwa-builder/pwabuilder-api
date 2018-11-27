'use strict';
/* global req:true */
/* global client:true */

require('./util');

var chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon'),
    azure = require('azure-storage'),
    PWABuilder = require('../../src/services/pwabuilder'),
    Q = require('q'),
    _ = require('lodash'),
    uuid = require('uuid');

describe('manifests',function(){
    describe('show route',function(){
        var manifestId;

        beforeEach(function(){
            manifestId = uuid.v4();
            client.set(manifestId,JSON.stringify({
                format: 'w3c',
                content: {
                    name: 'Foo Web Enterprises, LLC.',
                    short_name: 'Foo'
                }
            }));
        });

        it('should find the manifest',function(done){
            req.get('/manifests/'+manifestId)
                .expect(function(res){
                    expect(res.body.content.name).to.equal('Foo Web Enterprises, LLC.');
                })
                .end(done);
        });

        it('should return a 404 for a missing manifest',function(done){
            req.get('/manifests/foo')
                .expect(404)
                .end(done);
        });
    });

    describe('create route',function(){
        describe('with a site with no manifest',function(){
            it('should return a json file with the start_url',function(done){
                req.post('/manifests')
                    .send({ siteUrl: 'http://www.bamideas.com' })
                    .expect(function(res){
                        var result = res.body;
                        expect(result.content.start_url).to.equal('http://www.bamideas.com/');
                    })
                    .end(done);
            });

            it('should return a json file with the short_name',function(done){
                req.post('/manifests')
                    .send({ siteUrl: 'http://www.bamideas.com' })
                    .expect(function(res){
                        var result = res.body;
                        expect(result.content.short_name).to.equal('WwwBamideasCom');
                    })
                    .end(done);
            });

            it('should save the manifest to redis',function(done){
                sinon.spy(client,'set');

                req.post('/manifests')
                    .send({ siteUrl: 'http://www.bamideas.com' })
                    .end(function(err){
                        if(err) return done(err);

                        expect(client.set.calledOnce).to.equal(true);
                        client.set.restore();
                        done();
                    });
            });
        });

        describe('with a site that has a manifest',function(){
            it('should return a json file',function(done){
                req.post('/manifests')
                    .send({ siteUrl: 'http://www.existing.com' })
                    .expect(function(res){
                        var result = res.body;
                        expect(result.content.short_name).to.equal('Existing');
                    })
                    .end(done);
            });
        });

        describe('with an uploaded manifest file',function(){
            it('should return a json response with the contents of the file',function(done){
                req.post('/manifests')
                    .attach('file','test/fixtures/manifest.json')
                    .expect(function(res){
                        var result = res.body;
                        expect(result.content.short_name).to.equal('File');
                    })
                    .end(done);
            });
        });

        describe('with a site that does not exist',function(){
            it('should return a 200 with errors',function(done){
                req.post('/manifests')
                    .send({siteUrl: 'http://www.bamideasz.com'})
                    .expect(200)
                    .end(done);
            });
        });
    });

    describe('update route',function(){
        describe('with an existing manifest',function(){
            var manifestId;

            beforeEach(function(){
                manifestId = uuid.v4();
                client.set(manifestId,JSON.stringify({
                    id: manifestId,
                    format: 'w3c',
                    content: {
                        name: 'Foo Web Enterprises, LLC.',
                        short_name: 'Foo',
                        start_url: 'www.fwellc.com'
                    }
                }));
            });

            it('should update the record',function(done){
                var name = 'Bar Interwebs Associates, Inc.';

                req.put('/manifests/'+manifestId)
                    .send({name: name})
                    .expect(function(res){
                        expect(res.body.content.name).to.equal(name);
                    })
                    .end(done);
            });

            it('should remove any fields that no longer exist',function(done){
                var name = 'Bar Interwebs Associates, Inc.';

                req.put('/manifests/'+manifestId)
                    .send({name: name, start_url: 'www.fwellc.com'})
                    .expect(function(res){
                        expect(res.body.content.short_name).to.equal(undefined);
                    })
                    .end(done);
            });

            it('should save the manifest to redis',function(done){
                sinon.spy(client,'set');

                req.put('/manifests/'+manifestId)
                    .send({ name: 'Bar' })
                    .end(function(err){
                        if(err) return done(err);

                        expect(client.set.calledOnce).to.equal(true);

                        client.set.restore();
                        done();
                    });
            });

            it('should include any suggestions returned from the validator',function(done){
                req.put('/manifests/'+manifestId)
                    .send({ name: 'Suggestions' })
                    .expect(function(res){
                        expect(res.body.suggestions[0].issues[0].description).to.equal('a 48x48 icon should be provided for the extensions management page (chrome://extensions)');
                    })
                    .end(done);
            });

            it('should include any warnings returned from the validator',function(done){
                req.put('/manifests/'+manifestId)
                    .send({ name: 'Warnings' })
                    .expect(function(res){
                        expect(res.body.warnings[0].issues[0].description).to.equal('launcher icons of the following sizes are required: 48x48, 72x72, 96x96, 144x144, 192x192, 512x512');
                    })
                    .end(done);
            });
        });

        describe('with invalid data',function(){
            var manifestId;

            beforeEach(function(){
                manifestId = uuid.v4();
                client.set(manifestId,JSON.stringify({
                    id: manifestId,
                    format: 'w3c',
                    content: {
                        name: 'Errors',
                        short_name: 'Foo',
                    }
                }));
            });

            it('should return a 200',function(done){
                req.put('/manifests/'+manifestId)
                    .send({ name: 'Bar' })
                    .expect(200)
                    .end(done);
            });

            it('should return errors in the response',function(done){
                req.put('/manifests/'+manifestId)
                    .send({ name: 'Errors' })
                    .expect(function(res){
                        expect(res.body.errors[0].issues[0].description).to.equal('The start URL for the target web site is required');
                    })
                    .end(done);
            });
        });

        describe('without a manifest',function(){
            it('should return a 404',function(done){
                req.put('/manifests/foo')
                    .expect(404)
                    .end(done);
            });
        });
    });

    describe('build route',function(){
        describe('with a valid manifest',function(){
            var manifestId;

            beforeEach(function(){
                manifestId = uuid.v4();
                var manifest = {
                    id: manifestId,
                    format: 'w3c',
                    content: {
                        name: 'Foo Web Enterprises, LLC.',
                        short_name: 'Foo',
                        start_url: 'www.bamideas.com'
                    }
                };

                client.set(manifestId,JSON.stringify(manifest));

                var fakeBlobService = sinon.stub();

                var fakePWABuilder = function(){
                    return {
                        normalize: function(){
                            return Q.Promise(function(resolve){
                                resolve(_.assign(manifest,{ content: { start_url: 'http://www.bamideas.com' }}));
                            });
                        }
                    };
                };

                sinon.stub(azure,'createBlobService').returns(fakeBlobService);
                sinon.stub(PWABuilder,'create',fakePWABuilder);
            });

            afterEach(function(){
                azure.createBlobService.restore();
                PWABuilder.create.restore();
            });

            it('should create a zip archive of the projects');
            it('should return true if the archive was created');
            it('should upload the archive to azure storage');

            afterEach(function(){
                //rimraf(path.join(__dirname,'..','..','tmp',manifestId),done);
            });
        });

        describe('with an invalid manifest',function(){
            it('should return validation errors');
            it('should return a 422');
        });
    });
});
