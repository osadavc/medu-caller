import { Router } from "express";
import twilio from "twilio";

import prisma from "../lib/prisma";
import * as twilioClient from "../lib/twilio";
import * as config from "../config";

const router = Router();

const emailRegExp =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/gi;

router.post("/", async (req, res) => {
  const caller = await prisma.caller.findUnique({
    where: {
      phoneNumber: req.body.From,
    },
  });

  if (caller && emailRegExp.test(req.body.Body) && !!caller.shippingAddress) {
    await prisma.caller.update({
      where: {
        phoneNumber: req.body.From,
      },
      data: {
        emailAddress: req.body.Body,
      },
    });

    await twilioClient.sendSMS(
      req.body.From,
      "Thank you for providing your information. You will be called back within few seconds"
    );

    const response = new twilio.twiml.VoiceResponse();

    const gather = response.gather({
      action: `${config.CALLER_URL}/ivr/order`,
      method: "POST",
      timeout: 99,
      numDigits: 1,
    });

    gather.say(
      "Your shipping address is configured. Press 1 to list out all the products. or send the product name as a text message while in the call and press 2"
    );
   
    await setTimeoutAsync(1000);

    await twilioClient.default.calls.create({
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: req.body.From,
      twiml: response.toString(),
    });

    res.send();
  } else if (
    caller &&
    caller.shippingAddressSMSSent &&
    !caller.shippingAddress
  ) {
    await prisma.caller.update({
      where: {
        phoneNumber: req.body.From,
      },
      data: {
        shippingAddress: req.body.Body,
        shippingAddressSMSSent: false,
      },
    });

    await twilioClient.sendSMS(
      req.body.From,
      "Thank you for providing your shipping address. Now send your email address."
    );

    res.send();
  } else if (caller && !caller.productName) {
    await prisma.caller.update({
      where: {
        phoneNumber: req.body.From,
      },
      data: {
        productName: req.body.Body,
      },
    });
  }

  res.send();
});

export default router;

const setTimeoutAsync = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
