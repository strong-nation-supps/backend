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

    res.sendStatus(200);

    console.log("📩 Order:", data?.order_number);

    const phoneRaw =
      data?.customer?.phone ||
      data?.billing_address?.phone ||
      data?.shipping_address?.phone ||
      data?.phone;

    const name = data?.customer?.first_name || "Customer";
    const orderNumber = data?.order_number || data?.id;
    const totalPrice = data?.total_price || "0";

    let phone = null;
    if (phoneRaw) {
      phone = phoneRaw.replace(/\D/g, "");
      if (phone.length === 10) phone = "91" + phone;
    }

    if (!phone) {
      console.log("❌ No phone found");
      return;
    }

    const lineItems = data?.line_items || [];

    let itemsText = "Items unavailable";
    if (lineItems.length > 0) {
      itemsText = lineItems
        .map(
          (item) =>
            `${(item.title || "Item").substring(0, 40)} x${item.quantity}`
        )
        .join(", ");
    }

    const payload = {
      phone_number: phone,
      template_name: "order_confirm_sn",
      template_language: "en",

      field_1: String(name),
      field_2: String(orderNumber),
      field_3: String(itemsText),
      field_4: String(totalPrice)
    };

    console.log("🧪 TEST MODE - ORDER PAYLOAD:");
    console.log(JSON.stringify(payload, null, 2));

    // ❌ API CALL DISABLED FOR TEST
    console.log("🚫 WhatsApp API call skipped (TEST MODE)");

  } catch (err) {
    console.log("❌ ERROR:", err.message);
  }
});


// 🔥 ABANDONED CART (TEST MODE)
app.post("/checkout", async (req, res) => {
  const data = req.body;

  try {
    res.sendStatus(200);

    console.log("🛒 Checkout captured");

    const phoneRaw =
      data?.phone ||
      data?.customer?.phone ||
      data?.billing_address?.phone;

    const name = data?.customer?.first_name || "Customer";
    const totalPrice = data?.total_price || "0";

    let phone = null;
    if (phoneRaw) {
      phone = phoneRaw.replace(/\D/g, "");
      if (phone.length === 10) phone = "91" + phone;
    }

    if (!phone) {
      console.log("❌ No phone");
      return;
    }

    const items = data?.line_items || [];

    let itemsText = "Your cart items";
    if (items.length > 0) {
      itemsText = items
        .map(item =>
          `${(item.title || "Item").substring(0, 40)} x${item.quantity}`
        )
        .join(", ");
    }

    console.log("📲 Will simulate send after delay:", phone);

    // ⏳ SHORT DELAY FOR TEST (5 sec)
    setTimeout(() => {
      const payload = {
        phone_number: phone,
        template_name: "abandoned_cart_sn",
        template_language: "en",

        field_1: String(name),
        field_2: String(itemsText),
        field_3: String(totalPrice)
      };

      console.log("🧪 TEST MODE - ABANDONED PAYLOAD:");
      console.log(JSON.stringify(payload, null, 2));

      console.log("🚫 WhatsApp API call skipped (TEST MODE)");

    }, 5000); // ⏳ 5 sec test

  } catch (err) {
    console.log("❌ ERROR:", err.message);
  }
});


// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);