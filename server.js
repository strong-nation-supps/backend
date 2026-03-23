const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔐 ENV
const TOKEN = process.env.TOKEN;
const VENDOR_ID = "a6da9368-b550-4232-b4b4-fb3a73f8f30b";

if (!TOKEN) {
  console.error("❌ TOKEN missing in environment variables");
  process.exit(1);
}

// 🔁 Duplicate protection
const processedWebhookIds = new Set();

// 🧹 Cleanup
setInterval(() => {
  processedWebhookIds.clear();
  console.log("🧹 Cleared webhook cache");
}, 1000 * 60 * 60);

// ✅ TEST
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// ✅ MAIN WEBHOOK
app.post("/shopify", async (req, res) => {
  try {
    const data = req.body;

    const webhookId =
      req.headers["x-shopify-webhook-id"] || data?.id;

    if (processedWebhookIds.has(webhookId)) {
      console.log("⚠️ Duplicate ignored:", webhookId);
      return res.sendStatus(200);
    }
    processedWebhookIds.add(webhookId);

    // ⚡ respond fast
    res.sendStatus(200);

    console.log("📩 Order:", data?.order_number);

    // 👤 Customer
    const phoneRaw = data?.customer?.phone || data?.phone;
    const name = data?.customer?.first_name || "Customer";
    const orderNumber = data?.order_number || data?.id;
    const totalPrice = parseInt(data?.total_price || "0");

    // 📱 Phone fix
    let phone = null;

    if (phoneRaw) {
      phone = phoneRaw.replace(/\D/g, "");

      if (phone.length === 10) {
        phone = "91" + phone;
      }
    }

    if (!phone) {
      console.log("❌ No phone");
      return;
    }

    console.log("📲 Phone:", phone);

    // 🛒 Items
    const lineItems = data?.line_items || [];

    let itemsText = "Items unavailable";

    if (lineItems.length > 0) {
      itemsText = lineItems
        .map(
          (item, i) =>
            `${i + 1}. ${(item.title || "Item").substring(0, 50)} x ${item.quantity}`
        )
        .join("\n");
    }

    console.log("📦 Items:\n" + itemsText);

    // ========================
    // 🔥 WA MANTRA API CALL
    // ========================
    const payload = {
      phone_number: phone,
      template_name: "order_confirm_sn",
      type: "template", // ✅ IMPORTANT FIX
      template_params: [
        String(name),
        String(orderNumber),
        String(itemsText),
        String(totalPrice)
      ]
    };

    console.log("📤 Sending payload:", payload);

    const response = await axios.post(
      `https://api.wamantra.com/api/${VENDOR_ID}/contact/send-template`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        },
        timeout: 15000 // ⏱️ prevent hanging
      }
    );

    console.log("✅ WhatsApp Sent:", response.data);

  } catch (err) {
    console.log("❌ WA ERROR FULL:");
    console.log(err.response?.data || err.message);
  }
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);