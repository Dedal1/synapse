// Vercel Serverless Function - Create Stripe Customer Portal Session
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS headers for client-side requests
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    console.log('[Stripe Portal] Looking for customer with email:', email);

    // Find customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      console.log('[Stripe Portal] No customer found with email:', email);
      res.status(404).json({ error: 'No Stripe customer found with this email' });
      return;
    }

    const customer = customers.data[0];
    console.log('[Stripe Portal] Customer found:', customer.id);

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: 'https://synapse-mocha-one.vercel.app/',
    });

    console.log('[Stripe Portal] Portal session created:', session.id);
    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('[Stripe Portal] Error creating portal session:', error);
    res.status(500).json({ error: error.message });
  }
}
