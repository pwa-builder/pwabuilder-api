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
                name: 'Foo Web Enterprises, LLC.',
                short_name: 'Foo'
            }));
        });

        afterEach(function(done){
            client.flushdb(done);
        });

        it('should find the manifest',function(done){
            req.get('/manifests/'+manifestId)
                .expect(function(res){
                    expect(res.body.name).to.equal('Foo Web Enterprises, LLC.');
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
                        expect(result.start_url).to.equal('http://www.bamideas.com');
                    })
                    .end(done);
            });

            it('should return a json file with the short_name',function(done){
                req.post('/manifests')
                    .send({ siteUrl: 'http://www.bamideas.com' })
                    .expect(function(res){
                        var result = res.body;
                        expect(result.short_name).to.equal('WwwBamideasCom');
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
                        expect(result.name).to.equal('Web Application Template');
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
                        expect(result.short_name).to.equal('THW');
                    })
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
                    name: 'Foo Web Enterprises, LLC.',
                    short_name: 'Foo'
                }));
            });

            it('should update the record',function(done){
                var name = 'Bar Interwebs Associates, Inc.';

                req.put('/manifests/'+manifestId)
                    .send({name: name})
                    .expect(function(res){
                        expect(res.body.name).to.equal(name);
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
