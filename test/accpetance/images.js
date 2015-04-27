'use strict';
/* global req:true */

require('./util');

describe('images route',function(){
    describe('getting meta for an image',function(){
        this.timeout(5000);
        it('should get the width, height, and type',function(done){
            req.post('/images')
                .send({image:{src: 'https://dl.dropboxusercontent.com/u/1802855/BXH4wm4CEAAAdEO.jpg-large.jpeg'}})
                .expect(200)
                .expect({meta: { format: 'jpeg', width: 720, height: 960 }})
                .end(done);
        });
    });

    describe('fed a bad url',function(){
        it('should return a 422',function(done){
            req.post('/images')
                .send({image:{src:'http://foo.bar.baz/images/1312312.png'}})
                .expect(422)
                .end(done);
        });
    });
});
