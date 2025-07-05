const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Replace with your Stripe and Printful secret keys (never share these!)
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const PRINTFUL_API_KEY = 'process.env.PRINTFUL_API_KEY;

// Stripe payment session creator
app.post('/create-stripe-session', async (req, res) => {
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
    success_url: 'https://YOUR_FRONTEND_URL/success',
    cancel_url: 'https://YOUR_FRONTEND_URL/cancel',
    metadata: {
      product, color, size, image, user, ...shipping,
    },
  });
  res.json({ sessionId: session.id });
});

// Webhook to handle Stripe payment success and send order to Printful
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, 'YOUR_ENDPOINT_SECRET');
  } catch (err) {
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
            variant_id: 4012, // UPDATE to your Printful variant ID
            quantity: 1,
            files: [{ url: session.metadata.image }],
          }
        ]
      }, {
        headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` }
      });
    } catch (e) {
      // Optionally log error for your reference
    }
  }
  res.json({ received: true });
});

app.listen(10000, () => console.log('Server running on port 10000'));
