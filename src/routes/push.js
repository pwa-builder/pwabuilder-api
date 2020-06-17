var express = require('express'),
  router = express.Router();

var PushApi = require('../services/push');

module.exports = function () {
  let service = new PushApi();

  return router
    .post('/create', service.createVapidKey)
    .post('/register', service.registerVapidKey)
    .post('/unregister', service.unregisterVapidKey)
    .post('/subscribe', service.subscribeUser)
    .post('/unsubscribe', service.unsubscribeUser)
    .post('/send', service.sendPushNotification)
}