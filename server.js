const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔐 ENV
const TOKEN = process.env.TOKEN;
const VENDOR_ID = "a6da9368-b550-4232-b4b4-fb3a73f8f30b";

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// ✅ MAIN WEBHOOK ROUTE
app.post("/shopify", async (req, res) => {
  try {
    const data = req.body;

    console.log("📩 Incoming Data:", JSON.stringify(data, null, 2));

    const phoneRaw = data?.customer?.phone || data?.phone;
    const name = data?.customer?.first_name || "Customer";
    const orderId = data?.name || data?.id;

    // ✅ Phone format fix
    const phone = phoneRaw ? phoneRaw.replace("+", "") : null;

    if (!phone) {
      console.log("❌ No phone number found");
      return res.sendStatus(200);
    }

    // 🧠 PRODUCT LIST BUILD
    const lineItems = data?.line_items || [];

    let productText = "";

    if (lineItems.length > 0) {
      lineItems.forEach((item, index) => {
        productText += `${index + 1}. ${item.title} x ${item.quantity}\n`;
      });
    } else {
      productText = "Items details unavailable";
    }

    // 💰 TOTAL PRICE
    const totalPrice = data?.total_price || "0";

    // 💬 FINAL MESSAGE
    const message = `Hi ${name} 👋

🎉 Your order ${orderId} is CONFIRMED ✅

🛒 Items:
${productText}

💰 Total: ₹${totalPrice}

📦 We'll notify you once it's shipped.

Thank you for shopping with us ❤️`;

    console.log("📤 Final Message:\n", message);

    // ✅ WhatsApp API call
    const response = await axios.post(
      `https://api.wamantra.com/api/${VENDOR_ID}/contact/send-message`,
      {
        phone_number: phone,
        message_body: message
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Wamantra Response:", response.data);

    res.sendStatus(200);
  } catch (err) {
    console.log("❌ ERROR:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// ✅ PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));