import { Handler } from "express";
import twilio from "twilio";
import * as config from "../config";

import medusa from "../lib/medusa";
import prisma from "../lib/prisma";
import * as twilioClient from "../lib/twilio";

export const greetUser: Handler = (_, res) => {
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
};

export const initialInteraction: Handler = async (req, res) => {
  switch (req.body.Digits) {
    // Order
    case "1": {
      const response = new twilio.twiml.VoiceResponse();

      const userDetails = await prisma.caller.findUnique({
        where: {
          phoneNumber: req.body.From,
        },
      });

      if (!userDetails || !userDetails.shippingAddress) {
        response.say(
          "You have not provided your shipping address yet. This call will be automatically hanged up. and you will receive a text message with the information on how to provide your shipping address."
        );
        response.hangup();

        console.log(req.body);

        await twilioClient.sendSMS(
          req.body.From,
          "Please reply to this message with your shipping address."
        );
        if (userDetails) {
          await prisma.caller.update({
            where: {
              phoneNumber: req.body.From,
            },
            data: {
              shippingAddressSMSSent: true,
            },
          });
        } else {
          await prisma.caller.create({
            data: {
              phoneNumber: req.body.From,
              shippingAddressSMSSent: true,
            },
          });
        }
      }

      const gather = response.gather({
        action: "/ivr/order",
        method: "POST",
        input: ["dtmf", "speech"],
        numDigits: 1,
      });

      gather.say(
        "You selected to place an order. Press 1 to list out all the products."
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
};

export const orderProduct: Handler = async (req, res) => {
  const { Digits: digits, SpeechResult: speechResult } = req.body;
  console.log("Speech Result 👉🏻", speechResult);
  console.log(digits);

  if (digits == "1") {
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
        timeout: 30,
      })
      .say(
        "Press 1 to list out the products again. Send the product name as a text message while in the call and press 2. or say the name of the product to buy it"
      );

    res.send(response.toString());
  } else if (digits == "2") {
    const userDetails = await prisma.caller.findUnique({
      where: {
        phoneNumber: req.body.From,
      },
    });

    if (userDetails?.productName) {
      const response = new twilio.twiml.VoiceResponse();

      const {
        products: { [0]: product },
      } = await medusa.products.list({
        q: userDetails.productName.replace(/[^a-zA-Z0-9 ]/g, ""),
      });

      response.say(
        `You selected ${product.title}. We will place your order now`
      );
      const {
        cart: { id },
      } = await medusa.carts.create({
        items: [
          {
            variant_id: product.variants[0].id,
            quantity: 1,
          },
        ],
      });
      const shippingOptions = await medusa.shippingOptions.list();
      await medusa.carts.addShippingMethod(id, {
        option_id: shippingOptions.shipping_options[0].id,
        data: {
          address: userDetails?.shippingAddress ?? "",
          phoneNumber: req.body.From,
        },
      });

      await prisma.caller.update({
        where: {
          phoneNumber: req.body.From,
        },
        data: {
          latestCartId: id,
          productName: null,
        },
      });

      response.redirect("/ivr/pay");

      res.send(response.toString());
    }
  } else if (speechResult.length > 0) {
    const {
      products: { [0]: searchResult },
    } = await medusa.products.list({
      q: speechResult.replace(/[^a-zA-Z0-9 ]/g, ""),
    });

    if (!!searchResult?.id) {
      const response = new twilio.twiml.VoiceResponse();
      const userDetails = await prisma.caller.findUnique({
        where: {
          phoneNumber: req.body.From,
        },
      });

      response.say(
        `You selected ${searchResult.title}. We will place your order now`
      );
      const {
        cart: { id },
      } = await medusa.carts.create({
        items: [
          {
            variant_id: searchResult.variants[0].id,
            quantity: 1,
          },
        ],
      });
      const shippingOptions = await medusa.shippingOptions.list();
      await medusa.carts.addShippingMethod(id, {
        option_id: shippingOptions.shipping_options[0].id,
        data: {
          address: userDetails?.shippingAddress ?? "",
          phoneNumber: req.body.From,
        },
      });

      await prisma.caller.update({
        where: {
          phoneNumber: req.body.From,
        },
        data: {
          latestCartId: id,
        },
      });

      response.redirect("/ivr/pay");

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
          "Press 1 to list out the products again. Send the product name as a text message while in the call and press 2. or say the name of the product to buy it"
        );

      res.send(response.toString());
    }
  }
};

export const pay: Handler = async (req, res) => {
  const userDetails = await prisma.caller.findUnique({
    where: {
      phoneNumber: req.body.From,
    },
  });

  const cartDetails = await medusa.carts.retrieve(userDetails?.latestCartId!);

  if (!userDetails?.latestCartId || cartDetails.cart.completed_at != null) {
    const response = new twilio.twiml.VoiceResponse();
    response.say("You have no cart to pay for. Returning to the main menu");
    response.redirect("/ivr/welcome");

    res.send(response.toString());
    return;
  }

  const response = new twilio.twiml.VoiceResponse();
  response.say("You're now ready to pay");
  console.log(((cartDetails.cart.total ?? 0) / 100).toString());
  // Twilio Pay
  response.pay({
    chargeAmount: ((cartDetails.cart.total ?? 0) / 100).toString(),
    action: "/ivr/payment-completed",
    paymentConnector: "Stripe_Connector",
  });

  res.send(response.toString());
};

export const paymentComplete: Handler = async (req, res) => {
  const userDetails = await prisma.caller.findUnique({
    where: {
      phoneNumber: req.body.From,
    },
  });

  const cartDetails = await medusa.carts.retrieve(userDetails?.latestCartId!);

  if (!userDetails?.latestCartId || cartDetails.cart.completed_at != null) {
    const response = new twilio.twiml.VoiceResponse();
    response.say("You have no cart to pay for. Returning to the main menu");
    response.redirect("/ivr/welcome");

    res.send(response.toString());
    return;
  }

  const response = new twilio.twiml.VoiceResponse();

  switch (req.body.Result) {
    case "success": {
      response.say("Payment successful. Thank you for your order");
      try {
        await medusa.carts.createPaymentSessions(userDetails?.latestCartId!);

        const data = await medusa.carts.complete(userDetails?.latestCartId!);
      } catch (error) {
        console.log(error);
      }
      // await prisma.caller.update({
      //   where: {
      //     phoneNumber: req.body.From,
      //   },
      //   data: {
      //     latestCartId: null,
      //   },
      // });
      break;
    }
    case "payment-connector-error": {
      response.say("Payment failed. Please try again");
      break;
    }
    default: {
      response.say("Payment failed. Please try again");
    }
  }

  response.hangup();

  res.send(response.toString());
};
