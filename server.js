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
  console.log("🧹 Cache cleared");
}, 1000 * 60 * 60);

// ✅ TEST
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// ✅ WEBHOOK
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

    // ⚡ Fast response
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

    // =========================
    // 🔥 WA MANTRA API CALL
    // =========================
    const payload = {
      phone_number: phone,
      template_name: "order_confirm_sn",
      template_params: [
        String(name),
        String(orderNumber),
        String(itemsText),
        String(totalPrice)
      ]
    };

    console.log("📤 Payload:", payload);

    const response = await axios.post(
      `https://api.wamantra.com/api/${VENDOR_ID}/contact/send-template`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    console.log("✅ WhatsApp Sent:", response.data);

  } catch (err) {
    console.log("❌ ERROR STATUS:", err.response?.status);
    console.dir(err.response?.data, { depth: null });
    console.log("❌ ERROR MESSAGE:", err.message);
  }
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);