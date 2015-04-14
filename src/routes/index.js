var express = require('express'),
    manifold = require('manifoldjs');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.json({ title: 'Something else' });
});

module.exports = router;
