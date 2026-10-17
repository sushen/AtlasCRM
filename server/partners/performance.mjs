import {records,PartnerError} from './program.mjs';

// One bounded scan per entity; no buyer IDs, visit capabilities or evidence leave here.
export async function partnerPerformance(storage,{days=7,now=Date.now()}={}){
  if(![7,30,90].includes(days))throw new PartnerError('Choose 7, 30 or 90 days');
  const until=new Date(now+6*3600000).toISOString().slice(0,10);
  const end=Date.parse(until+'T23:59:59.999+06:00');
  const start=end+1-days*86400000,from=new Date(start+6*3600000).toISOString().slice(0,10);
  const [partners,campaigns,clicks,starts,orders,ledger,spends]=await Promise.all(
    ['partner','campaign','click','start','order','ledger','spend'].map(type=>records(storage,'pt:'+type+':')));
  if(campaigns.length>1000)throw new PartnerError('Too many campaigns for performance report');
  const during=at=>Number.isFinite(at)&&at>=start&&at<=Math.min(end,now);
  const names=new Map(partners.map(p=>[p.id,p.name]));
  const reversed=new Set(ledger.filter(r=>r.type==='reversal').map(r=>r.orderId));
  const rows=campaigns.map(c=>{
    const scope=r=>r.partnerId===c.partnerId&&r.campaignId===c.id;
    const visits=clicks.filter(r=>scope(r)&&during(r.at)),ids=new Set(visits.map(r=>r.id));
    const scopedOrders=orders.filter(scope),credits=ledger.filter(r=>scope(r)&&r.type==='credit'&&!reversed.has(r.orderId));
    const byOrder=new Map(scopedOrders.map(o=>[o.orderId,o]));
    const cohort=scopedOrders.filter(o=>ids.has(o.clickId));
    const cohortIds=new Set(cohort.map(o=>o.orderId));
    const cohortSales=credits.filter(r=>cohortIds.has(r.orderId));
    const buyers=new Set(cohortSales.map(r=>byOrder.get(r.orderId)?.clickId).filter(Boolean));
    const revenue=new Map(),spend=new Map();let revenueKnownSales=0;
    for(const credit of cohortSales){
      const order=byOrder.get(credit.orderId);
      if(!/^[A-Z]{3,5}$/.test(order.currency||'')||!Number.isFinite(order.totalAmount)||order.totalAmount<0)continue;
      revenue.set(order.currency,(revenue.get(order.currency)||0)+order.totalAmount);
      revenueKnownSales++;
    }
    for(const row of spends.filter(r=>scope(r)&&r.date>=from&&r.date<=until)){
      spend.set(row.currency,(spend.get(row.currency)||0)+row.minor);
    }
    return {partnerId:c.partnerId,partnerName:String(names.get(c.partnerId)||c.partnerId).slice(0,120),
      campaignId:c.id,label:String(c.label||c.id).slice(0,240),creative:String(c.creative||'').slice(0,240),hypothesis:String(c.hypothesis||'').slice(0,240),
      active:!!c.active,metaAccountId:c.metaAccountId||null,metaAdId:c.metaAdId||null,
      link:'https://atlascrm-c5722.web.app/?catalog=1&ref='+encodeURIComponent(c.partnerId)+'&campaign='+encodeURIComponent(c.id)+'&utm_source=facebook&utm_medium=paid&utm_campaign='+encodeURIComponent(c.id)+'&utm_content='+encodeURIComponent(c.id),
      visits:visits.length,telegramStarts:starts.filter(r=>scope(r)&&during(r.at)).length,
      orders:scopedOrders.filter(o=>during(o.createdAt)).length,verifiedSales:credits.filter(r=>during(r.at)).length,
      cohortOrders:cohort.length,cohortSales:cohortSales.length,convertedVisits:buyers.size,
      cohortConversion:visits.length?buyers.size/visits.length:null,
      cohortMature:now-end>=30*86400000,
      legacyOrders:scopedOrders.filter(o=>!o.clickId).length,
      revenue:[...revenue].map(([currency,value])=>({currency,value})),revenueKnownSales,
      manualSpend:[...spend].map(([currency,minor])=>({currency,minor})),
      pendingReview:cohort.filter(o=>['PAYMENT_SUBMITTED','PAYMENT_UNDER_REVIEW'].includes(o.paymentStatus)).length,
      pendingDelivery:cohort.filter(o=>o.paymentStatus==='PAYMENT_VERIFIED'&&o.deliveryStatus!=='DELIVERED').length};
  });
  return {schemaVersion:1,service:'atlas-partner-performance',generatedAt:new Date(now).toISOString(),from,to:until,days,
    complete:true,rows,limitations:[
      'Visits are accepted first-touch browser referrals, not every ad click or verified unique people. Bots, shared links and cross-device journeys can distort attribution.',
      'Cohort sales count non-refunded payment-verified and delivered orders from visits starting in the selected period, as of retrieval. Recent 30-day attribution cohorts are still maturing.',
      'Period starts/orders/sales are separate activities, not a cohort funnel. Old orders without a click ID are excluded from cohort attribution.',
      'Spend is joined by an explicit unique Meta ad mapping. A link must be used exclusively on that ad for comparable cost-per-sale. Currency conversion, tax and collaborator fees are not inferred.'
    ]};
}
