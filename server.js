const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ✅ FINAL VALUES
const TOKEN = "8JpOQubQbgetFvVkFzyut0C1VsxcUEwLeyB0SEK0DLdFnrjdQEwtcW0f5eyEe7ay";
const VENDOR_ID = "a6da9368-b550-4232-b4b4-fb3a73f8f30b";

app.post("/shopify", async (req, res) => {
  try {
    const data = req.body;

    const phoneRaw = data?.customer?.phone;
    const name = data?.customer?.first_name || "Customer";
    const orderId = data?.id;

    // ✅ SAFETY: phone format fix
    const phone = phoneRaw ? phoneRaw.replace("+", "") : null;

    console.log("Incoming Data:", data);
    console.log("Phone:", phone);

    if (phone) {
      const response = await axios.post(
        `https://api.wamantra.com/api/${VENDOR_ID}/contact/send-message`,
        {
          phone_number: phone,
          message_body: `Hi ${name}, your order #${orderId} is confirmed ✅`
        },
        {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );

      // ✅ DEBUG RESPONSE
      console.log("Wamantra Response:", response.data);
    } else {
      console.log("No phone number found");
    }

    res.sendStatus(200);
  } catch (err) {
    console.log("ERROR:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// ✅ IMPORTANT (Render ke liye)
const PORT = process.env.PORT || 3000;                                                                  
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

