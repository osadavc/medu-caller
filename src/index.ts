import express from "express";
import twilio from "twilio";
import morgan from "morgan";
import * as config from "./config";

import ivrRouter from "./routes/ivrRouter";

const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post("/calls", twilio.webhook({ validate: false }), (_, res) => {
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

app.use("/ivr", twilio.webhook({ validate: false }), ivrRouter);

app.listen(8080);
