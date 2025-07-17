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
            unit_amount: 1999, // $19.99
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
