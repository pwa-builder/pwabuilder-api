'use strict';

var express = require('express'),
    router = express.Router(),
    request = require('request'),
    imagesize = require('imagesize');

module.exports = function(){
    return router
        .post('/',function(req,res,next){
            var stream = request(req.body.image.src);
            imagesize(stream, function (err, result) {
                if(err){ return next(err); }

                res.json(result); // {type, width, height}
            });
        });
};

