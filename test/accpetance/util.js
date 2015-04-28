'use strict';

var manifold = require('../../src/app'),
    request = require('supertest'),
    fakeredis = require('fakeredis'),
    redis = require('redis'),
    sinon = require('sinon'),
    manifestFixture = require('../fixtures/manifest.json');

global.req = {};
global.client = {};

var fakeManifoldJS = {
    manifestTools: {
        getManifestFromSite: function(url,cb){
            if(url === 'http://www.bamideasz.com'){
                cb(new Error('Failed to retrieve manifest from site.'),null);
            }else if(url ==='http://www.existing.com'){
                manifestFixture.content.short_name = 'Existing';
                cb(null,manifestFixture);
            }else{
                cb(null,manifestFixture);
            }
        },
        getManifestFromFile: function(filepath,cb){
            manifestFixture.content.short_name = 'File';
            cb(null,manifestFixture);
        },
        validateManifest: function(manifest,platforms,cb){
            if(manifest.content.name === 'Suggestions'){
                return cb(null,[
                    { description: 'a 48x48 icon should be provided for the extensions management page (chrome://extensions)',
                        platform: 'chrome',
                        level: 'suggestion',
                        member: 'icons',
                        code: 'missing-image',
                        data: [ '48x48' ] }
                ]);
            }

            if(manifest.content.name === 'Warnings'){
                return cb(null,[
                    { description: 'launcher icons of the following sizes are required: 48x48, 72x72, 96x96, 144x144, 192x192, 512x512',
                        platform: 'android',
                        level: 'warning',
                        member: 'icons',
                        code: 'missing-image',
                        data: [ '48x48', '72x72', '96x96', '144x144', '192x192', '512x512' ] }
                ]);
            }

            if(manifest.content.name === 'Errors'){
                return cb(null,[
                    { description: 'The start URL for the target web site is required',
                        platform: 'all',
                        level: 'error',
                        member: 'start_url',
                        code: 'required-value' }
                ]);
            }

            cb(null,null);
        }
    },
    projectBuilder: {
    }
};

var fakeAzure = {
    createBlobService: function(){
        return {};
    }
};

before(function(){
    console.log('Running main setup...');
    sinon.stub(redis,'createClient',fakeredis.createClient);

    global.client = redis.createClient();
    var app = manifold.init(global.client,fakeAzure,fakeManifoldJS);
    global.req = request(app);
});


afterEach(function(done){
    global.client.flushdb(done);
});

after(function(){
    console.log('Running main teardown...');
    redis.createClient.restore();
    global.req = null;
});
