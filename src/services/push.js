var request = require('got');

// var url = "http://localhost:7071/api/HttpTrigger"; // dev
var url = "https://webpush-azurefunction.azurewebsites.net/api/HttpTrigger"; // deployed

module.exports = {
  /*
    createVapidKey
    url: https://pwabuilder-api-prod.azurewebsites.net/push/create
      res:
        - status: number
        - keys:
          - publicKey: string
          - privateKey: string
    */
  createVapidKey: function (req, res) {
    request.get(url + "?action=vapidkeys", {
      responseType: 'json'
    }).then(response => response.body)
      .then((response) => {
        res.send(
          {
            ...response.res,
          });
      }).catch((err) => {
        res.status(400).send({ status: 400 });
      });
  },
  /*
  registerVapidKey
  url: https://pwabuilder-api-prod.azurewebsites.net/push/register
    req
      - userEmail: string
      - publicKey: string
      - privateKey: string
    res
      - status: number
  */
  registerVapidKey: function (req, res) {
    if (req.body && !req.body.publicKey && !req.body.privateKey && !req.body.userEmail) {
      return res.status(400).send({
        message: "missing publicKey, privateKey, or userEmail",
      });
    }

    request.post(url + "?action=register", {
      json: {
        subject: "mailto:" + req.body.userEmail,
        publicKey: req.body.publicKey,
        privateKey: req.body.privateKey,
      },
      responseType: 'json'
    }).then(response => response.body)
      .then(response => {
        if (response.res.status.toLowerCase() !== "ok") {
          res.status(400).send({ status: 400 });
        } else {
          res.status(200).send({ status: 200 });
        }
      })
      .catch(e => {
        if (e.response && e.response.body) {
          // service error
          return res.status(400).send({
            message: "error from registration"
          });

        } else if (e.message) {
          // network error
          return res.status(500);
        }
      });
  },
  /*
    unregisterVapidKey
    url: https://pwabuilder-api-prod.azurewebsites.net/push/unregister
      req
        - publicKey: string
        - privateKey: string
      res
        - status: number
  */
  unregisterVapidKey: function (req, res) {
    if (req.body && !req.body.publicKey && !req.body.privateKey) {
      return res.status(400).send({
        message: "missing publicKey, or privateKey",
      })
    }

    request.post(url + "?action=unregister", {
      json: {
        publicKey: req.body.publicKey,
        privateKey: req.body.privateKey,
      },
      responseType: 'json'
    }).then(response => response.body)
      .then(response => {
        if (response.res.status.toLowerCase() !== "ok") {
          res.status(400).send({ status: 400 });
        } else {
          res.status(200).send({ status: 200 });
        }
      })
      .catch(e => {
        res.status(400).send({
          message: "failed to unregister key"
        });
      });
  },
  /*
    subscribeUser
    url: https://pwabuilder-api-prod.azurewebsites.net/push/subscribe
      req
        - publicKey: string
        - subscription: url
      res
        - status: number
  */
  subscribeUser: function (req, res) {
    if (req.body && !req.body.publicKey && !req.body.subscription) {
      return res.status(400).send({
        message: "missing publicKey, or subscription url",
      })
    }

    request.post(url + "?action=subscribe", {
      json: {
        publicKey: req.body.publicKey,
        subscription: req.body.subscription,
      },
      responseType: 'json'
    }).then(response => response.body)
      .then(response => {
        if (response.res.status.toLowerCase() !== "ok") {
          res.status(400).send({ status: 400 });
        } else {
          res.status(200).send({ status: 200 });
        }
      })
      .catch(e => {
        res.status(400).send({
          message: "failed to unregister key"
        });
      });
  },
  /*
    unsubscribeUser
    url: https://pwabuilder-api-prod.azurewebsites.net/push/unsubscribe
      req
        - publicKey: string
        - subscription: url
      res
        - status: number
  */
  unsubscribeUser: function (req, res) {
    if (req.body && !req.body.publicKey && !req.body.subscription) {
      return res.send({
        status: 400,
        message: "missing publicKey, or subscription url",
      })
    }

    request.post(url + "?action=unsubscribe", {
      json: {
        publicKey: req.body.publicKey,
        subscription: req.body.subscription,
      },
      responseType: 'json'
    }).then(response => response.body)
      .then(response => {
        if (response.res.status.toLowerCase() !== "ok") {
          res.status(400).send({ status: 400 });
        } else {
          res.status(200).send({ status: 200 });
        }
      }).catch(e => {
        res.status(400).send({
          message: "failed to unregister key"
        });
      });
  },
  /*
      sendPushNotification
      url: https://pwabuilder-api-prod.azurewebsites.net/push/send
      req
        - publicKey: string
        - privateKey: string
        - subject: url/email
        - notification: string
      res
        - status code
  */
  sendPushNotification: function (req, res) {
    if (req.body && !req.body.publicKey && !req.body.subject && !req.body.privateKey && !req.body.notification) {
      return res.status(400).send({
        message: "missing publicKey, privateKey, notification, or subscription url",
      })
    }

    request.post(url + "?action=sendnotification", {
      json: {
        publicKey: req.body.publicKey,
        privateKey: req.body.privateKey,
        subject: req.body.subject,
        notification: req.body.notification,
      },
      responseType: 'json'
    }).then(response => response.body)
      .then(response => {
        if (response.res.status.toLowerCase() !== "ok") {
          res.status(400).send({ status: 400 });
        } else {
          res.status(200).send({ status: 200 });
        }
      }).catch(e => {
        res.status(400).send({
          message: "failed to unregister key"
        });
      });
  }
}
