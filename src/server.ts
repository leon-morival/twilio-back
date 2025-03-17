import express, { Request, Response } from "express";
import dotenv from "dotenv";
import twilio from "twilio";
import bodyParser from "body-parser";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/ivr", (req: Request, res: Response) => {
  const twiml = new twilio.twiml.VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: "/handle-selection",
    method: "POST",
  });

  gather.say(
    "Welcome to our service. Press 1 for Sales, 2 for Support, or 3 for Billing."
  );

  res.type("text/xml");
  res.send(twiml.toString());
});

app.post("/handle-selection", (req: Request, res: Response) => {
  const digit = req.body.Digits;
  const twiml = new VoiceResponse();

  let forwardNumber: string | undefined;
  if (digit === "1") {
    forwardNumber = process.env.FORWARD_NUMBER_1!;
  } else {
    twiml.say("Invalid option. Please try again.");
    twiml.redirect("/ivr");
    res.type("text/xml");
    res.send(twiml.toString());
    return;
  }

  if (!forwardNumber) {
    twiml.say("Sorry, an error occurred.");
    res.type("text/xml");
    res.send(twiml.toString());
    return;
  }

  twiml.say("Transferring your call now.");
  twiml.dial(forwardNumber);

  res.type("text/xml");
  res.send(twiml.toString());
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
