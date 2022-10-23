import dotenv from "dotenv";
dotenv.config();

import express from "express";
import twilio from "twilio";
import morgan from "morgan";

import ivrRouter from "./routes/ivrRouter";
import smsRouter from "./routes/smsRouter";

const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/ivr", twilio.webhook({ validate: false }), ivrRouter);
app.use("/sms", smsRouter);

app.listen(8080);
