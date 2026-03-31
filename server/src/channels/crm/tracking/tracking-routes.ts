// Tracking API Routes — Facebook CAPI events + UTM link builder + attribution

import crypto from 'crypto';
import { Router } from 'express';
import { facebookCAPI } from './facebook-capi.js';
import { utmService } from './utm-service.js';

const router = Router();

// POST /api/channels/tracking/event — send arbitrary CAPI event
router.post('/event', async (req, res) => {
  const { event_name, email, phone, customer_id, custom_data, source } = req.body;
  if (!event_name) return res.status(400).json({ error: 'Missing event_name' });

  const result = await facebookCAPI.sendEvent({
    event_name,
    event_time: Math.floor(Date.now() / 1000),
    user_data: {
      ...(email ? { em: [crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex')] } : {}),
      ...(phone ? { ph: [crypto.createHash('sha256').update(phone.replace(/[^0-9]/g, '')).digest('hex')] } : {}),
      ...(customer_id ? { external_id: [customer_id] } : {}),
    },
    custom_data: custom_data || {},
    action_source: source || 'website',
  });

  res.json(result);
});

// POST /api/channels/tracking/purchase — track purchase event
router.post('/purchase', async (req, res) => {
  const { email, phone, customer_id, order_id, value, currency, contents } = req.body;
  const result = await facebookCAPI.trackPurchase({
    email, phone, customerId: customer_id, orderId: order_id,
    value, currency, contents,
  });
  res.json(result);
});

// POST /api/channels/tracking/lead — track lead event
router.post('/lead', async (req, res) => {
  const { email, phone, customer_id, source } = req.body;
  const result = await facebookCAPI.trackLead({ email, phone, customerId: customer_id, source });
  res.json(result);
});

// POST /api/channels/tracking/utm — build UTM link
router.post('/utm', async (req, res) => {
  const { base_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.body;
  if (!base_url) return res.status(400).json({ error: 'Missing base_url' });
  const link = utmService.buildUTMLink(base_url, { utm_source, utm_medium, utm_campaign, utm_content, utm_term });
  res.json({ url: link });
});

// GET /api/channels/tracking/attribution/:customerId
router.get('/attribution/:customerId', async (req, res) => {
  const attr = await utmService.getAttribution(req.params.customerId);
  res.json(attr || {});
});

export default router;
