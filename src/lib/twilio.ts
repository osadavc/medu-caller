import twilioClient from "twilio";
import * as config from "../config";

const twilio = twilioClient(
  config.twilioAccountSID,
  config.twilioAccountAuthToken
);

export const sendSMS = async (to: string, body: string) => {
  return await twilio.messages.create({
    body,
    from: config.twilioPhoneNumber,
    to,
  });
};

export default twilio;
