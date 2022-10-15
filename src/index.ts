import express from "express";
import twilio from "twilio";
import morgan from "morgan";

import ivrRouter from "./routes/ivrRouter";

const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/ivr", twilio.webhook({ validate: false }), ivrRouter);

app.listen(8080);
