var request = require('got');
var lib = require('pwabuilder-lib');

module.exports = class {
  url = "http://localhost:7071/api/HttpTrigger"; // dev
  // url = "https://webpush-azurefunction.azurewebsites.net/api/HttpTrigger"; // deployed

  constructor() {

  }

  /*
  createVapidKey
    res:
      - status: number
      - keys:
        - publicKey: string
        - privateKey: string
  */
  async createVapidKey(req, res) {
    try {
      const response = await request.get(this.url + "?action=vapidkeys").json();

      return res.send({
        ...response.res,
        status: 200,
      })
    } catch (e) {
      return res.status(400);
    }
  }

  /*
  registerVapidKey
    req
      - userEmail: string
      - publicKey: string
      - privateKey: string
    res
      - status: number
  */
  async registerVapidKey(req, res) {
    if (req.body && !req.body.publicKey && !req.body.privateKey && !req.body.userEmail) {
      return res.send({
        status: 400,
        message: "missing publicKey, privateKey, or userEmail",
      });
    }

    try {
      const response = await request.get(this.url + "?action=register", {
        json: {
          subject: "mailto:" + req.body.userEmail,
          publicKey: req.body.publicKey,
          privateKey: req.body.privateKey,
        }
      }).json();

      if (response.res.status.toLowerCase() !== "ok") {
        return res.send({ status: 400, message: "error from registration" });
      }

      return res.status(200);
    } catch (e) {
      if (e.response && e.response.body) {
        // service error
        return res.send({
          status: 400,
          message: "error from registration"
        });

      } else if (e.message) {
        // network error
        return res.status(500);
      }
    }
  }
  /*
  unregisterVapidKey
    req
      - publicKey: string
      - privateKey: string
    res
      - status: number
  */
  async unregisterVapidKey(req, res) {
    if (req.body && !req.body.publicKey && !req.body.privateKey) {
      return res.send({
        status: 400,
        message: "missing publicKey, or privateKey",
      })
    }

    try {
      const response = await request.get(this.url + "?action=unregister", {
        json: {
          publicKey: req.body.publicKey,
          privateKey: req.body.privateKey,
        }
      }).json();

      res.status(200);
    } catch (e) {
      res.send({
        status: 400,
        message: "failed to unregister key"
      });
    }
  }
  /*
  subscribeUser
    req
      - publicKey: string
      - subscription: url
    res
      - status: number
  */
  async subscribeUser(req, res) {
    if (req.body && !req.body.publicKey && !req.body.subscription) {
      return res.send({
        status: 400,
        message: "missing publicKey, or subscription url",
      })
    }

    try {
      const response = await request.get(this.url + "?action=subscribe", {
        json: {
          publicKey: req.body.publicKey,
          subscription: req.body.subscription,
        }
      }).json();

      res.status(200);
    } catch (e) {
      res.send({
        status: 400,
        message: "failed to unregister key"
      });
    }
  }
  /*
  unsubscribeUser
    req
      - publicKey: string
      - subscription: url
    res
      - status: number
  */
  async unsubscribeUser(req, res) {
    if (req.body && !req.body.publicKey && !req.body.subscription) {
      return res.send({
        status: 400,
        message: "missing publicKey, or subscription url",
      })
    }

    try {
      const response = await request.get(this.url + "?action=unsubscribe", {
        json: {
          publicKey: req.body.publicKey,
          subscription: req.body.subscription,
        }
      }).json();

      if (response.res.status.toLowerCase() !== "ok") {
        throw new Exception();
      }

      res.status(200);
    } catch (e) {
      res.send({
        status: 400,
        message: "failed to unregister key"
      });
    }
  }
  /*
  sendPushNotification
    req
      - publicKey: string
      - privateKey: string
      - subject: url/email
      - notification: string
    res
      - status code
  */
  sendPushNotification(req, res) {
    if (req.body && !req.body.publicKey && !req.body.subject && !req.body.privateKey && !req.body.notification) {
      return res.send({
        status: 400,
        message: "missing publicKey, privateKey, notification, or subscription url",
      })
    }

    try {
      const response = await request.get(this.url + "?action=register", {
        json: {
          publicKey: req.body.publicKey,
          privateKey: req.body.privateKey,
          subscription: req.body.subscription,
          notification: req.body.notification,
        }
      }).json();

      if (response.res.status.toLowerCase() !== "ok") {
        throw new Exception();
      }

      res.status(200);
    } catch (e) {
      res.send({
        status: 400,
        message: "failed to unregister key"
      });
    }
  }
}
