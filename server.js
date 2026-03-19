const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

app.post("/shopify", async (req, res) => {
  try {
    console.log("BODY:", req.body); // debug

    const phone = req.body?.customer?.phone;
    const name = req.body?.customer?.first_name || "Customer";
    const orderId = req.body?.id;

    if (!phone) {
      console.log("❌ Phone missing");
      return res.sendStatus(200);
    }

    const cleanPhone = phone.replace("+", "");
    console.log("📞 Sending to:", cleanPhone);

    const response = await axios.post(
      "https://api.wamantra.com/api/a6da9368-b550-4232-b4b4-fb3a73f8f30b/contact/send-message",
      {
        phone_number: cleanPhone,
        message_body: `Hi ${name}, your order #${orderId} is confirmed ✅`
      },
      {
        headers: {
          Authorization: "Bearer 8JpOQubQbgetFvVkFzyut0C1VsxcUEwLeyB0SEK0DLdFnrjdQEwtcW0f5eyEe7ay",
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ SUCCESS:", response.data);

    res.sendStatus(200);

  } catch (err) {
    console.log("❌ ERROR:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));