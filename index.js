require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const axios = require('axios');

const app = express();

// STRIPE & PRINTFUL SETUP
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

// CORS - ONLY ALLOW YOUR DOMAINS
app.use(cors({
  origin: [
    'https://printedbyai.com', 
    'https://printedbyai.netlify.app', 
    'http://localhost:3000'
  ],
  credentials: true
}));

// BODY PARSER for /create-stripe-session
app.use(express.json());

// STRIPE CHECKOUT SESSION CREATOR
app.post('/create-stripe-session', async (req, res) => {
  try {
    const { product, color, size, image, shipping, user } = req.body;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${product} (${color}, ${size})`,
            images: [image],
          },
          unit_amount: 2499 * 100, // $24.99
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://printedbyai.com/success',
      cancel_url: 'https://printedbyai.com/cancel',
      metadata: { product, color, size, image, user, ...shipping },
    });
    res.json({ sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// STRIPE WEBHOOK for payment success (must be raw body)
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      // Place Printful order (you may need to adjust for your product/variant)
      await axios.post('https://api.printful.com/orders', {
        recipient: {
          name: session.metadata.name,
          address1: session.metadata.address,
        },
        items: [
          {
            variant_id: 4012, // <-- CHANGE to your actual Printful variant ID
            quantity: 1,
            files: [{ url: session.metadata.image }],
          }
        ]
      }, {
        headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` }
      });
    } catch (e) {
      console.error("Printful order error:", e.response?.data || e.message);
    }
  }
  res.json({ received: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
