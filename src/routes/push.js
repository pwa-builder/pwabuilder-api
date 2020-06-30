var express = require('express'),
  router = express.Router();

var service = require('../services/push');

module.exports = function () {
  return router
    .get('/create', service.createVapidKey)
    .post('/register', service.registerVapidKey)
    .post('/unregister', service.unregisterVapidKey)
    .post('/subscribe', service.subscribeUser)
    .post('/unsubscribe', service.unsubscribeUser)
    .post('/send', service.sendPushNotification)
}