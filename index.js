const express = require("express");
const cors = require("cors");
const stripe = require("stripe")("sk_test_51RhTFq4D8ELU2tDdTTNXlHV3mEupxUGq5Aie3ITsCsIanox2jPCDGuywBKR41rAzlRIkpR4OylOKP37xv3lBmKHv003oGTDOlf"); // replace with your actual key

const app = express(); // ← THIS must be here before using app.get or app.post

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("PrintedByAI backend is running");
});

app.post("/api/checkout-session", async (req, res) => {
  try {
    const { imageUrl, prompt, product, color, size } = req.body;

    // Validate that imageUrl exists and is a valid HTTPS URL
    if (!imageUrl || !imageUrl.startsWith("https://")) {
      return res.status(400).json({ error: "Invalid or missing imageUrl" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 1999, // $19.99
            product_data: {
              name: `${product || "Custom Product"} - ${color || "Any"} - ${size || "One Size"}`,
              description: prompt || "Custom AI-generated design",
              images: [imageUrl], // must be HTTPS or Stripe fails
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
    console.error("Checkout session creation failed:", err.message);
    res.status(500).json({ error: "Stripe checkout failed", details: err.message });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
