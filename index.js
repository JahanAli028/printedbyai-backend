const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const axios = require('axios');

const app = express();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

// Printful Product IDs
const GILDAN_5000_ID = 4012;
const GILDAN_18500_ID = 9443;
const YUPOONG_6606_ID = 5087;

// CORS for security
app.use(cors({
  origin: [
    'https://printedbyai.com',
    'https://printedbyai.netlify.app',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());

// === Printful Option Endpoints ===
async function fetchOptions(pid, type) {
  try {
    const { data } = await axios.get(
      `https://api.printful.com/products/${pid}`,
      { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } }
    );
    const variants = (data.result.variants || []).filter(v => v.is_available);
    const colors = [...new Set(variants.map(v => v.color))];
    const sizes = [...new Set(variants.map(v => v.size))];
    if (!variants.length) {
      return { status: 404, data: { error: `No ${type} variants available`, variants: [], colors: [], sizes: [] }};
    }
    return { status: 200, data: { variants, colors, sizes }};
  } catch (e) {
    return { status: 500, data: { error: `Failed to fetch ${type} options`, detail: e.message, variants: [], colors: [], sizes: [] }};
  }
}
app.get('/api/printful-tshirt-options', async (req, res) => {
  const r = await fetchOptions(GILDAN_5000_ID, "T-shirt");
  res.status(r.status).json(r.data);
});
app.get('/api/printful-hoodie-options', async (req, res) => {
  const r = await fetchOptions(GILDAN_18500_ID, "hoodie");
  res.status(r.status).json(r.data);
});
app.get('/api/printful-cap-options', async (req, res) => {
  const r = await fetchOptions(YUPOONG_6606_ID, "cap");
  res.status(r.status).json(r.data);
});

// === Stripe checkout session creator ===
app.post('/create-stripe-session', async (req, res) => {
  try {
    const { product, color, size, image, shipping, user, variant_id } = req.body;
    if (!variant_id) {
      return res.status(400).json({ error: 'No valid Printful variant for this color/size.' });
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${product} (${color}, ${size})`,
            images: [image],
          },
          unit_amount: 2499 * 100,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://printedbyai.com/success',
      cancel_url: 'https://printedbyai.com/cancel',
      metadata: { product, color, size, image, user, ...shipping, variant_id }
    });
    res.json({ sessionId: session.id });
  } catch (err) {
    console.error("Stripe session error:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// === Stripe webhook for Printful auto order ===
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      await axios.post('https://api.printful.com/orders', {
        recipient: {
          name: session.metadata.name,
          address1: session.metadata.address,
        },
        items: [
          {
            variant_id: session.metadata.variant_id,
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
