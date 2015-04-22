'use strict';

var manifold = require('../src/app'),
    request = require('supertest'),
    fakeredis = require('fakeredis'),
    redis = require('redis'),
    sinon = require('sinon');

global.req = {};
global.client = {};

before(function(){
    console.log('Running main setup...');
    sinon.stub(redis,'createClient',fakeredis.createClient);
    global.client = redis.createClient();
    var app = manifold.init(global.client);
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
