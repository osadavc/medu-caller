import { Router } from "express";
import twilio from "twilio";

import prisma from "../lib/prisma";
import * as twilioClient from "../lib/twilio";

const router = Router();

router.post("/", async (req, res) => {
  const caller = await prisma.caller.findUnique({
    where: {
      phoneNumber: req.body.From,
    },
  });

  if (caller && caller.shippingAddressSMSSent && !caller.shippingAddress) {
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
      "Thank you for providing your shipping address. You will now receive a call with the information on how to place your order."
    );

    const response = new twilio.twiml.VoiceResponse();

    const gather = response.gather({
      action: "/ivr/order",
      method: "POST",
      input: ["dtmf", "speech"],
      numDigits: 1,
    });

    gather.say(
      "Your shipping address is configured. Press 1 to list out all the products. or say the name of the product to buy it"
    );

    setTimeout(async () => {
      await twilioClient.default.calls.create({
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: req.body.From,
        twiml: response.toString(),
      });
    }, 1000);
  }

  res.send();
});

export default router;
