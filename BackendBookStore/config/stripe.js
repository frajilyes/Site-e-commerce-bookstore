const Stripe = require("stripe");
const env = require("./env");

let client = null;

const getStripe = () => {
  if (!env.stripeEnabled) return null;
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-10-29.clover",
      maxNetworkRetries: 2,
      timeout: 20000,
    });
  }
  return client;
};

module.exports = getStripe;
module.exports.getStripe = getStripe;
module.exports.isEnabled = () => env.stripeEnabled;
