const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔐 ENV
const TOKEN = process.env.TOKEN;
const VENDOR_ID = "a6da9368-b550-4232-b4b4-fb3a73f8f30b";

// ❗ TOKEN safety check
if (!TOKEN) {
  console.error("❌ TOKEN missing in environment variables");
  process.exit(1);
}

// 🔁 Duplicate protection (memory based)
const processedWebhookIds = new Set();

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// ✅ MAIN WEBHOOK ROUTE
app.post("/shopify", async (req, res) => {
  try {
    const data = req.body;

    // 🔁 Webhook ID (with fallback)
    const webhookId =
      req.headers["x-shopify-webhook-id"] || data?.id;

    if (processedWebhookIds.has(webhookId)) {
      console.log("⚠️ Duplicate webhook ignored:", webhookId);
      return res.sendStatus(200);
    }
    processedWebhookIds.add(webhookId);

    console.log("📩 Incoming Data:", JSON.stringify(data, null, 2));

    // 👤 Customer details
    const phoneRaw = data?.customer?.phone || data?.phone;
    const name = data?.customer?.first_name || "Customer";
    const orderNumber = data?.order_number || data?.id;
    const totalPrice = data?.total_price || "0";

    // 📱 Phone format (remove +, spaces, etc.)
    let phone = null;
    if (phoneRaw) {
      phone = phoneRaw.replace(/\D/g, "");
    }

    if (!phone) {
      console.log("❌ No phone number found");
      return res.sendStatus(200);
    }

    // 🛒 PRODUCT LIST BUILD
    const lineItems = data?.line_items || [];

    let itemsText = "Items details unavailable";

    if (lineItems.length > 0) {
      itemsText = lineItems
        .map(
          (item, index) =>
            `${index + 1}. ${item.title.substring(0, 50)} x ${item.quantity}`
        )
        .join("\n");
    }

    console.log("📦 Items:\n", itemsText);

    // ================================
    // ✅ WA MANTRA TEMPLATE API CALL
    // ================================
    const response = await axios.post(
      `https://api.wamantra.com/api/${VENDOR_ID}/contact/send-template`,
      {
        phone_number: phone,

        // ⚠️ EXACT template name
        template_name: "order_confirm_sn",

        // ⚠️ Variable mapping (match template)
        template_params: [
          name,         // {{1}}
          orderNumber,  // {{2}}
          itemsText,    // {{3}}
          totalPrice    // {{4}}
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Wamantra Template Response:", response.data);

    res.sendStatus(200);

  } catch (err) {
    console.log("❌ ERROR:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// ✅ PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);