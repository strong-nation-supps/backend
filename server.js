const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔐 ENV
const TOKEN = process.env.TOKEN;
const VENDOR_ID = "a6da9368-b550-4232-b4b4-fb3a73f8f30b";

if (!TOKEN) {
  console.error("❌ TOKEN missing");
  process.exit(1);
}

// 🔁 Duplicate protection
const processedWebhookIds = new Set();

// 🧹 Cleanup every 1 hour
setInterval(() => {
  processedWebhookIds.clear();
  console.log("🧹 Cache cleared");
}, 1000 * 60 * 60);

// ✅ HEALTH CHECK
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// ✅ SHOPIFY WEBHOOK
app.post("/shopify", async (req, res) => {
  const data = req.body;

  try {
    const webhookId =
      req.headers["x-shopify-webhook-id"] || data?.id;

    if (processedWebhookIds.has(webhookId)) {
      console.log("⚠️ Duplicate:", webhookId);
      return res.sendStatus(200);
    }
    processedWebhookIds.add(webhookId);

    // ⚡ Respond fast
    res.sendStatus(200);

    console.log("📩 Order:", data?.order_number);

    // 👤 Customer
    const phoneRaw =
      data?.customer?.phone ||
      data?.billing_address?.phone ||
      data?.shipping_address?.phone ||
      data?.phone;

    const name = data?.customer?.first_name || "Customer";
    const orderNumber = data?.order_number || data?.id;
    const totalPrice = data?.total_price || "0";

    // 📱 Phone formatting
    let phone = null;
    if (phoneRaw) {
      phone = phoneRaw.replace(/\D/g, "");
      if (phone.length === 10) phone = "91" + phone;
    }

    if (!phone) {
      console.log("❌ No phone found");
      return;
    }

    console.log("📲 Phone:", phone);

    // 🛒 Line Items
    const lineItems = data?.line_items || [];

    let itemsText = "Items unavailable";
    if (lineItems.length > 0) {
      itemsText = lineItems
        .map(
          (item) =>
            `${(item.title || "Item").substring(0, 40)} x${item.quantity}`
        )
        .join(", "); // ✅ FIXED (NO NEWLINE)
    }

    console.log("📦 Items:", itemsText);

    // =========================
    // 🔥 WA MANTRA PAYLOAD
    // =========================
    const payload = {
      phone_number: phone,
      template_name: "order_confirm_sn",
      template_language: "en",

      field_1: String(name),
      field_2: String(orderNumber),
      field_3: String(itemsText),
      field_4: String(totalPrice)
    };

    console.log("📤 Sending:", JSON.stringify(payload, null, 2));

    // =========================
    // 🚀 API CALL
    // =========================
    const response = await axios.post(
      `https://api.wamantra.com/api/${VENDOR_ID}/contact/send-template-message`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    console.log("✅ SUCCESS:", response.data);

  } catch (err) {
    console.log("❌ ERROR STATUS:", err.response?.status);
    console.dir(err.response?.data, { depth: null });
    console.log("❌ ERROR MESSAGE:", err.message);
  }
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);