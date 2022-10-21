import { Router } from "express";
import twilio from "twilio";
import * as config from "../config";
import medusa from "../lib/medusa";

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
        "You selected to place an order. Press 1 to list out all the products. or say the name of the product to buy it"
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

router.post("/order", async (req, res) => {
  const { Digits: digits, SpeechResult: speechResult } = req.body;
  console.log("Speech Result 👉🏻", speechResult);

  if (digits != null) {
    const products = await medusa.products.list({
      limit: config.PRODUCT_LIST_LIMIT,
    });

    const response = new twilio.twiml.VoiceResponse();
    response.say("Here are the products we have currently available.");

    const availableProductList = products.products
      .map((product) => ({
        id: product.id,
        name: product.title,
        price:
          product.variants[0].prices.find((item) => item.currency_code == "usd")
            ?.amount! / 100,
        isAvailable: product.variants[0].inventory_quantity > 0,
      }))
      .filter((item) => item.isAvailable);

    availableProductList.forEach((item) => {
      response.say(`${item.name} for ${item.price} dollars.`);
    });

    response
      .gather({
        action: "/ivr/order",
        method: "POST",
        input: ["dtmf", "speech"],
        numDigits: 1,
      })
      .say(
        "Press 1 to list out the products again. or say the name of the product to buy it"
      );

    res.send(response.toString());
  } else if (speechResult.length > 0) {
    const product = await medusa.products.search({
      q: speechResult,
    });
    console.log(product);

    if (product.hits.length > 0) {
      const response = new twilio.twiml.VoiceResponse();

      response.say(
        `You selected ${product.hits}. We will place your order now`
      );

      res.send(response.toString());
    } else {
      const response = new twilio.twiml.VoiceResponse();

      response
        .gather({
          action: "/ivr/order",
          method: "POST",
          input: ["dtmf", "speech"],
          numDigits: 1,
        })
        .say(
          "Press 1 to list out the products again. or say the name of the product to buy it"
        );

      res.send(response.toString());
    }
  }
});

export default router;
