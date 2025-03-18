import express, { Request, Response } from "express";
import dotenv from "dotenv";
import twilio from "twilio";
import bodyParser from "body-parser";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";
import axios from "axios";

dotenv.config();

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json()); // Add JSON body parser for API requests

// Function to fetch sales phone number from the API
async function fetchSalesNumber(): Promise<string | null> {
  try {
    const response = await axios.get(
      "https://lab.smartlockers.io/crm.json?forward=sales",
      {
        headers: {
          Authorization: "Bearer L3_D3F1_D35_1NG3NI3UX",
        },
      }
    );

    if (response.data && response.data.forward) {
      return response.data.forward;
    }
    return null;
  } catch (error) {
    console.error("Error fetching sales number:", error);
    return null;
  }
}

// Function to fetch support phone number from the API
async function fetchSupportNumber(): Promise<string | null> {
  try {
    const response = await axios.get(
      "https://lab.smartlockers.io/crm.json?forward=support",
      {
        headers: {
          Authorization: "Bearer L3_D3F1_D35_1NG3NI3UX",
        },
      }
    );

    if (response.data && response.data.forward) {
      return response.data.forward;
    }
    return null;
  } catch (error) {
    console.error("Error fetching support number:", error);
    return null;
  }
}

app.post("/", (req: Request, res: Response) => {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.redirect("/ivr");

  res.type("text/xml");
  res.send(twiml.toString());
});

app.post("/ivr", (req: Request, res: Response) => {
  const twiml = new twilio.twiml.VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: "/handle-selection",
    method: "POST",
  });

  gather.say(
    "Bienvenue chez smart locker. Tapez 1 pour le service vente, ou 2 pour le support technique."
  );

  res.type("text/xml");
  res.send(twiml.toString());
});

app.post("/handle-selection", async (req: Request, res: Response) => {
  const digit = req.body.Digits;
  const twiml = new VoiceResponse();

  let forwardNumber: string | undefined;

  if (digit === "1") {
    // Fetch sales number from API
    const salesNumber = await fetchSalesNumber();
    forwardNumber = salesNumber || "";
  } else if (digit === "2") {
    // Fetch support number from API
    const supportNumber = await fetchSupportNumber();
    forwardNumber = supportNumber || "";
  } else {
    twiml.say("Option invalide veuillez réessayer.");
    twiml.redirect("/ivr");
    res.type("text/xml");
    res.send(twiml.toString());
    return;
  }

  if (!forwardNumber) {
    twiml.say("Une erreur est survenue. Veuillez réessayer plus tard.");
    res.type("text/xml");
    res.send(twiml.toString());
    return;
  }

  twiml.say("Transfere de l'appel en cours.");
  twiml.dial(forwardNumber);

  res.type("text/xml");
  res.send(twiml.toString());
});

// New endpoint to fetch call logs
app.get("/api/call-logs", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const page = req.query.page ? parseInt(req.query.page as string) : 0;

    // Optional filters
    const status = req.query.status as string;
    const to = req.query.to as string;
    const from = req.query.from as string;
    const startTime = req.query.startTime as string;
    const endTime = req.query.endTime as string;

    // Build filter object
    const filter: any = { limit };
    if (status) filter.status = status;
    if (to) filter.to = to;
    if (from) filter.from = from;
    if (startTime) filter.startTime = new Date(startTime).toISOString();
    if (endTime) filter.endTime = new Date(endTime).toISOString();

    const calls = await twilioClient.calls.list(filter);

    res.json({
      success: true,
      data: calls,
      count: calls.length,
      page: page,
      limit: limit,
    });
  } catch (error) {
    console.error("Error fetching call logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch call logs",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
