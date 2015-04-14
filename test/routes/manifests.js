'use strict';

var chai = require('chai'),
    expect = chai.expect,
    request = require('supertest'),
    app = require('../../src/app');

describe('manifests',function(){
    describe('index route',function(){
        it('respond with json', function(done){
            request(app)
                .get('/manifests')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(200, done);
        });
    });

    describe('create route',function(){
        describe('with a site with no manifest',function(){
            var req;
            before(function(){
                req = request(app);
            });

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
        });

        describe('with an uploaded manifest file',function(){
            var req;
            before(function(){
                req = request(app);
            });

            it('should return a json response with the contents of the file',function(done){
                req.post('/manifests')
                    .attach('file','test/fixtures/manifest.json')
                    .expect(function(res){
                        var result = res.body;
                        expect(result.short_name).to.equal('THW');
                    })
                    .end(function(err,res){
                        if (err) return done(err);
                        done();
                    });

            });
        });
    });
});
