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


// ================================
// ✅ ORDER CONFIRMATION (NO IMAGE)
// ================================
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

    console.log("📩 Order:", data?.id);

    const phoneRaw =
      data?.customer?.phone ||
      data?.billing_address?.phone ||
      data?.shipping_address?.phone ||
      data?.phone;

    const name = data?.customer?.first_name || "Customer";
    const orderNumber = data?.id;
    const totalPrice = parseFloat(data?.total_price || "0").toFixed(0);

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
        .slice(0, 2)
        .map(
          (item) =>
            `${(item.title || "Item").substring(0, 25)} x${item.quantity}`
        )
        .join(", ");

      if (lineItems.length > 2) {
        itemsText += ", + more items";
      }
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

    console.log("📤 Sending Order Template:", JSON.stringify(payload, null, 2));

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

    console.log("✅ ORDER MESSAGE SENT:", response.data);

  } catch (err) {
    console.log("❌ ORDER ERROR:", err.response?.data || err.message);
  }
});


// ==================================
// 🔥 ABANDONED CART (WITH IMAGE)
// ==================================
app.post("/checkout", async (req, res) => {
  const data = req.body;

  try {
    const checkoutId = data?.id;

    if (processedWebhookIds.has(checkoutId)) {
      console.log("⚠️ Duplicate checkout:", checkoutId);
      return res.sendStatus(200);
    }
    processedWebhookIds.add(checkoutId);

    res.sendStatus(200);

    console.log("🛒 Checkout captured");

    const phoneRaw =
      data?.phone ||
      data?.customer?.phone ||
      data?.billing_address?.phone;

    const name = data?.customer?.first_name || "Customer";
    const totalPrice = parseFloat(data?.total_price || "0").toFixed(0);

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
        .slice(0, 2)
        .map(
          (item) =>
            `${(item.title || "Item").substring(0, 25)} x${item.quantity}`
        )
        .join(", ");

      if (items.length > 2) {
        itemsText += ", + more items";
      }
    }

    console.log("📲 Will send after 24 hours:", phone);

    setTimeout(async () => {
      try {
        console.log("⏰ Sending abandoned message...");

        const productImage =
          "https://cdn.shopify.com/s/files/1/0651/8492/3725/files/41_1-Web-Banner_jpg.jpg?v=1774432527";

        const payload = {
          phone_number: phone,
          template_name: "cart_2",
          template_language: "en",

          header_image: productImage,

          field_1: String(name),
          field_2: String(itemsText),
          field_3: String(totalPrice)
        };

        console.log("📤 Sending Abandoned:", JSON.stringify(payload, null, 2));

        const response = await axios.post(
          `https://api.wamantra.com/api/${VENDOR_ID}/contact/send-template-message`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${TOKEN}`,
              "Content-Type": "application/json"
            }
          }
        );

        console.log("✅ ABANDONED MESSAGE SENT:", response.data);

      } catch (err) {
        console.log("❌ ABANDONED ERROR:", err.response?.data || err.message);
      }
    }, 86400000); // ✅ 24 HOURS

  } catch (err) {
    console.log("❌ ERROR:", err.message);
  }
});


// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);