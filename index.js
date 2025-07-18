const express = require("express");
const cors = require("cors");
const stripe = require("stripe")("sk_test_..."); // replace with your actual key

const app = express(); // ← THIS must be here before using app.get or app.post

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("PrintedByAI backend is running");
});

app.post("/api/checkout-session", async (req, res) => {
  try {
    const { imageUrl, prompt, product, color, size } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 1999,
            product_data: {
              name: `${product} - ${color} - ${size}`,
              description: prompt,
              images: [imageUrl],
            },
          },
          quantity: 1,
        },
      ],
      success_url: "https://printedbyai.com/success",
      cancel_url: "https://printedbyai.com/cancel",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout session creation failed:", err);
    res.status(500).json({ error: "Stripe checkout failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
