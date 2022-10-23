import twilioClient from "twilio";

const twilio = twilioClient(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_ACCOUNT_AUTH_TOKEN
);

export const sendSMS = async (to: string, body: string) => {
  return await twilio.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
};

export default twilio;
