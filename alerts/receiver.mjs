import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";

const required = ["RAILWAY_WEBHOOK_SECRET", "WA_ACCESS_TOKEN", "WA_PHONE_NUMBER_ID", "WA_RECIPIENT"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error("Missing required configuration:", missing.join(", "));
  process.exit(1);
}

const port = Number(process.env.PORT || 8080);
const graphVersion = process.env.WA_GRAPH_VERSION || "v23.0";
const templateName = process.env.WA_TEMPLATE_NAME || "resolve_critical_alert";
const templateLanguage = process.env.WA_TEMPLATE_LANGUAGE || "en";

function authorized(value) {
  const expected = Buffer.from("Bearer " + process.env.RAILWAY_WEBHOOK_SECRET);
  const supplied = Buffer.from(typeof value === "string" ? value : "");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

function normalizeEvent(event) {
  const type = String(event?.type || "");
  const severity = type.toLowerCase();
  if (!["deployment.failed", "deployment.crashed"].includes(severity)) return null;
  if (event?.resource?.environment?.name !== "production") return null;
  if (event?.resource?.service?.name !== "resolve-construction") return null;
  return {
    type,
    service: "resolve-construction",
    deployment: String(event?.resource?.deployment?.id || "unknown").slice(0, 80),
  };
}

async function sendWhatsApp(alert) {
  const url = `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(process.env.WA_PHONE_NUMBER_ID)}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: process.env.WA_RECIPIENT,
      type: "template",
      template: {
        name: templateName,
        language: { code: templateLanguage },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: alert.service },
            { type: "text", text: alert.type },
          ],
        }],
      },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    console.error("WhatsApp API rejected the alert (HTTP status):", response.status);
    throw new Error("WhatsApp delivery request failed");
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200).end("ok");
    return;
  }
  if (req.method !== "POST" || req.url !== "/railway-webhook") {
    res.writeHead(404).end();
    return;
  }
  if (!authorized(req.headers.authorization)) {
    res.writeHead(401).end();
    return;
  }
  try {
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 65536) {
        res.writeHead(413).end();
        return;
      }
    }
    const alert = normalizeEvent(JSON.parse(raw));
    if (alert) await sendWhatsApp(alert);
    res.writeHead(204).end();
  } catch (error) {
    console.error("Alert processing failed:", error instanceof SyntaxError ? "Invalid JSON" : "Delivery or processing error");
    res.writeHead(error instanceof SyntaxError ? 400 : 503).end();
  }
});

server.listen(port, "0.0.0.0", () => console.log("Alert receiver listening"));
