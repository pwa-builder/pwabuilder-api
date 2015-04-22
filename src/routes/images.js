'use strict';

var express = require('express'),
    router = express.Router(),
    request = require('request'),
    imagesize = require('imagesize');

module.exports = function(){
    return router
        .post('/',function(req,res,next){
            var stream = request
                .get(req.body.image.src)
                .on('error',function(err){
                    console.log(err);
                    res.status(422).json({ error: err });
                });

            imagesize(stream, function (err, result) {
                if(err){ return next(err); }

                res.json({ meta: result }); // {type, width, height}
            });
        });
};

