'use strict';

var chai = require('chai'),
    expect = chai.expect,
    request = require('supertest'),
    redis = require('redis'),
    fakeredis = require('fakeredis'),
    sinon = require('sinon'),
    uuid = require('node-uuid'),
    manifold = require('../../src/app');

describe('manifests',function(){
    var client;

    before(function(){
        sinon.stub(redis,'createClient',fakeredis.createClient);
        client = redis.createClient();
    });

    after(function(){
        redis.createClient.restore();
    });

    describe('show route',function(){
        var req, manifestId;

        before(function(){
            var app = manifold.init(client);
            req = request(app);
        });

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

        afterEach(function(done){
            client.flushdb(done);
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
        var req;

        before(function(){
            var app = manifold.init(client);
            req = request(app);
        });

        afterEach(function(done){
            client.flushdb(done);
        });

        describe('with a site with no manifest',function(){
            it('should return a json file with the start_url',function(done){
                req.post('/manifests')
                    .send({ siteUrl: 'http://www.bamideas.com' })
                    .expect(function(res){
                        var result = res.body;
                        expect(result.content.start_url).to.equal('http://www.bamideas.com');
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
                    .send({ siteUrl: 'http://meteorite.azurewebsites.net' })
                    .expect(function(res){
                        var result = res.body;
                        expect(result.content.name).to.equal('Web Application Template');
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
                        expect(result.content.short_name).to.equal('THW');
                    })
                    .end(done);
            });
        });

        describe('with a site that does not exist',function(){
            it('should return a 422',function(done){
                req.post('/manifests')
                    .send({siteUrl: 'http://www.bamideasz.com'})
                    .expect(422)
                    .end(done);
            });
        });
    });

    describe('update route',function(){
        var req;

        before(function(){
            var app = manifold.init(client);
            req = request(app);
        });

        afterEach(function(done){
            client.flushdb(done);
        });

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
                    .send({ name: 'Bar' })
                    .expect(function(res){
                        expect(res.body.suggestions.hap_urlAccess[0]).to.equal('It is recommended to specify a set of access rules that represent the navigation scope of the application');
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
                        name: 'Foo Web Enterprises, LLC.',
                        short_name: 'Foo',
                    }
                }));
            });

            it('should return a 422',function(done){
                req.put('/manifests/'+manifestId)
                    .send({ name: 'Bar' })
                    .expect(422)
                    .end(done);
            });

            it('should return an errors response',function(done){
                req.put('/manifests/'+manifestId)
                    .send({ name: 'Bar' })
                    .expect(function(res){
                        expect(res.body.errors.start_url[0]).to.equal('The start URL for the target web site is required');
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
});
