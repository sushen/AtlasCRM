import { normalizeOrder } from './shop-orders.mjs';

// Aggregate business facts only. Buyer identities, references and screenshots stay private.
export async function businessReport(storage, { days = 30, now = Date.now(), limit = 10000 } = {}) {
  if (!Number.isInteger(days) || days < 1 || days > 365) throw Error('Invalid reporting period');
  const since = now - days * 86400000;
  const totals = { ordersCreated: 0, paymentsVerified: 0, deliveriesCompleted: 0,
    pendingPayment: 0, awaitingReview: 0, awaitingDelivery: 0, reviewOver24h: 0, deliveryOver24h: 0 };
  const currencies = new Map(); const products = new Map();
  let cursor; let scanned = 0; let invalid = 0; let undatedVerifiedPayments = 0; let complete = false;
  const bucket = currency => {
    if (!currencies.has(currency)) currencies.set(currency, { currency, orderValue: 0, verifiedReceipts: 0 });
    return currencies.get(currency);
  };
  while (scanned < limit) {
    const batchLimit = Math.min(100, limit - scanned);
    const batch = await storage.list({ prefix: 'order:', limit: batchLimit, ...(cursor ? { startAfter: cursor } : {}) });
    if (!batch.size) { complete = true; break; }
    for (const [key, raw] of batch) {
      scanned++; cursor = key;
      let order;
      try { order = normalizeOrder(raw); } catch { invalid++; continue; }
      if (!order || !Number.isFinite(order.createdAt) || typeof order.currency !== 'string'
          || !/^[A-Z]{3,5}$/.test(order.currency) || !Number.isFinite(order.totalAmount) || order.totalAmount < 0) { invalid++; continue; }
      const money = bucket(order.currency);
      if (order.paymentStatus === 'PAYMENT_VERIFIED' && !Number.isFinite(order.verifiedAt)) undatedVerifiedPayments++;
      const created = order.createdAt >= since && order.createdAt <= now;
      const paid = order.paymentStatus === 'PAYMENT_VERIFIED' && Number.isFinite(order.verifiedAt) && order.verifiedAt >= since && order.verifiedAt <= now;
      const delivered = order.deliveryStatus === 'DELIVERED' && Number.isFinite(order.deliveredAt) && order.deliveredAt >= since && order.deliveredAt <= now;
      if (created) {
        totals.ordersCreated++; money.orderValue += order.totalAmount;
        const productId = String(order.product?.id || 'unknown');
        const group = products.get(productId) || { productId, name: String(order.product?.name || 'Unknown').slice(0,180), orders: 0 };
        group.orders++; products.set(productId, group);
      }
      if (paid) { totals.paymentsVerified++; money.verifiedReceipts += order.totalAmount; }
      if (delivered) totals.deliveriesCompleted++;
      // Current backlogs include older orders, independently of the reporting window.
      if (order.paymentStatus === 'PENDING_PAYMENT') totals.pendingPayment++;
      if (['PAYMENT_SUBMITTED','PAYMENT_UNDER_REVIEW'].includes(order.paymentStatus)) {
        totals.awaitingReview++;
        if (Number.isFinite(order.submittedAt) && now-order.submittedAt >= 86400000) totals.reviewOver24h++;
      }
      if (order.paymentStatus === 'PAYMENT_VERIFIED' && order.deliveryStatus !== 'DELIVERED') {
        totals.awaitingDelivery++;
        if (Number.isFinite(order.verifiedAt) && now-order.verifiedAt >= 86400000) totals.deliveryOver24h++;
      }
    }
    if (batch.size < batchLimit) { complete = true; break; }
  }
  if (!complete && scanned >= limit) complete = !(await storage.list({prefix:'order:',startAfter:cursor,limit:1})).size;
  return { service:'atlas-market', version:1, generatedAt:new Date(now).toISOString(),
    window:{days,start:new Date(since).toISOString(),end:new Date(now).toISOString()},
    coverage:{scanned,invalid,undatedVerifiedPayments,complete:complete&&invalid===0&&undatedVerifiedPayments===0}, totals,
    money:[...currencies.values()].map(row=>({...row,orderValue:Number(row.orderValue.toFixed(6)),verifiedReceipts:Number(row.verifiedReceipts.toFixed(6))})),
    topProducts:[...products.values()].sort((a,b)=>b.orders-a.orders).slice(0,10),
    limitations:['Verified receipts reflect manual operator verification, not independent bank reconciliation.',
      'Order value is not revenue. Currencies are separate; no conversion is applied.',
      'Profit, costs, fees, refunds, website visitors and lead conversion are not measured by this report.'] };
}
