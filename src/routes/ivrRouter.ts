import { Router } from "express";
import twilio from "twilio";
import * as config from "../config";

const router = Router();

router.post("/welcome", (_, res) => {
  const response = new twilio.twiml.VoiceResponse();
  const gather = response.gather({
    action: "/ivr/initial",
    method: "POST",
    numDigits: 1,
  });
  gather.say(
    `Hello and welcome to ${config.STORE_NAME}. If you want to place an order, press 1. or if you want to call a store associate, press 2.`
  );

  res.send(response.toString());
});

router.post("/initial", (req, res) => {
  console.log(req.body);
  console.log(req.body.Digits);

  switch (req.body.Digits) {
    // Order
    case "1": {
      const response = new twilio.twiml.VoiceResponse();
      const gather = response.gather({
        action: "/ivr/order",
        method: "POST",
        input: ["dtmf", "speech"],
        numDigits: 1,
      });
      gather.say(
        "You selected to place an order. Press 1 list to list out all the products. or say the name of the product to add it to the cart"
      );
      res.send(response.toString());
      break;
    }
    // Customer service
    case "2": {
      const response = new twilio.twiml.VoiceResponse();
      response.dial(config.CUSTOMER_SERVICE_NUMBER);

      res.send(response.toString());
      break;
    }
    default: {
      const response = new twilio.twiml.VoiceResponse();

      response.say("Returning to the main menu");
      response.redirect("/ivr/welcome");

      res.send(response.toString());
      break;
    }
  }
});

router.post("/order", (req, res) => {
  const { Digits, SpeechResult } = req.body;

  if (Digits != null) {
    
  }
});

export default router;
