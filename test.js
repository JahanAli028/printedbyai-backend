require('dotenv').config();
const axios = require('axios');

const PRODUCT_ID = 4012; // Try 4012 or 4011
const API_KEY = process.env.PRINTFUL_API_KEY;

async function test() {
  try {
    const res = await axios.get(
      `https://api.printful.com/catalog/products/${PRODUCT_ID}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`
        }
      }
    );
    console.log("✅ Got response:");
    console.dir(res.data, { depth: null });
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
  }
}

test();
