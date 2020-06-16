var express = require('express'),
  router = express.Router();

var api = require('../services/push');

module.exports = function () {
  let service = new api();

  return router
    .get('/register', service.registerVapidKey)
    .get('/unregister', service.unregisterVapidKey)
    .get('/subscribe', service.subscribeUser)
    .get('/unsubscribe', service.unsubscribeUser)
    .get('/send', service.sendPushNotification)
}