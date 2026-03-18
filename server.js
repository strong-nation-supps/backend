const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = "PASTE_YOUR_TOKEN_HERE";
const VENDOR_ID = "PASTE_YOUR_VENDOR_ID_HERE";

app.post("/shopify", async (req, res) => {
  try {
    const data = req.body;

    const phone = data?.customer?.phone;
    const name = data?.customer?.first_name || "Customer";
    const orderId = data?.id;

    if (phone) {
      await axios.post(
        `https://api.wamantra.com/api/abcd1234/contact/send-message`,
        {
          phone_number: phone.replace("+", ""),
          message_body: `Hi ${name}, your order #${orderId} is confirmed ✅`
        },
        {
          headers: {
           Authorization: "Bearer 8JpOQubQbgetFvVkFzyut0C1VsxcUEwLeyB0SEK0DLdFnrjdQEwtcW0f5eyEe7ay",
            "Content-Type": "application/json"
          }
        }
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.listen(3000, () => console.log("Server running"));