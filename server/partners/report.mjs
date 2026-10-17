import {PartnerError,records} from './program.mjs';
export async function partnerReport(storage,{partnerId,campaignId='',from,to,now=Date.now()}){
  const start=Date.parse(from+'T00:00:00+06:00'),end=Date.parse(to+'T23:59:59.999+06:00');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||'')||!Number.isFinite(start)||!Number.isFinite(end)||end<start||end-start>366*86400000)throw new PartnerError('Choose a reporting period up to 366 days');
  const scoped=row=>row.partnerId===partnerId&&(!campaignId||row.campaignId===campaignId);
  const during=row=>row.at>=start&&row.at<=end;
  const all=async type=>(await records(storage,'pt:'+type+':')).filter(scoped);
  const clicks=(await all('click')).filter(during),starts=(await all('start')).filter(during);
  const orders=(await all('order')).filter(x=>x.createdAt>=start&&x.createdAt<=end);
  const ledger=await all('ledger'),period=ledger.filter(during);
  // Sales reflect current non-reversed credits posted in the selected window.
  const reversed=new Set(ledger.filter(x=>x.type==='reversal').map(x=>x.orderId));
  const sales=period.filter(x=>x.type==='credit'&&!reversed.has(x.orderId)).length;
  const spend=(await all('spend')).filter(x=>x.date>=from&&x.date<=to),currencies=new Map();
  for(const row of spend)currencies.set(row.currency,(currencies.get(row.currency)||0)+row.minor);
  const allLedger=(await records(storage,'pt:ledger:')).filter(x=>x.partnerId===partnerId);
  const payouts=(await records(storage,'pt:payout:')).filter(x=>x.partnerId===partnerId);
  const paid=payouts.filter(x=>x.status==='paid').reduce((n,x)=>n+x.minor,0),reserved=payouts.filter(x=>x.status==='approved').reduce((n,x)=>n+x.minor,0);
  const net=allLedger.reduce((n,x)=>n+x.minor,0);
  const budgets=(await records(storage,'pt:budget:')).filter(x=>x.partnerId===partnerId),budgetAlerts=[];
  const monthly=new Map();
  for(const row of (await records(storage,'pt:spend:')).filter(x=>x.partnerId===partnerId&&x.date.slice(0,7)>=from.slice(0,7)&&x.date.slice(0,7)<=to.slice(0,7))){
    if(row.currency!=='USD'){if(!budgetAlerts.includes('Non-USD spend needs a documented conversion before comparison with the USD budget.'))budgetAlerts.push('Non-USD spend needs a documented conversion before comparison with the USD budget.');continue;}
    const month=row.date.slice(0,7);monthly.set(month,(monthly.get(month)||0)+row.minor);
  }
  for(const [month,minor]of monthly){const approved=budgets.find(x=>x.month===month);if(!approved||minor>approved.minor)budgetAlerts.push(month+': reported USD spend exceeds the recorded approval or has no approval.');}
  return {partnerId,campaignId,from,to,generatedAt:new Date(now).toISOString(),clicks:clicks.length,telegramStarts:starts.length,orders:orders.length,verifiedSales:sales,
    conversionRate:clicks.length?sales/clicks.length:null,spend:[...currencies].map(([currency,minor])=>({currency,minor,costPerSale:sales?minor/100/sales:null})),
    commissionMinor:period.reduce((n,x)=>n+x.minor,0),currency:'BDT',paidMinor:paid,dueMinor:Math.max(0,net-paid),reservedMinor:reserved,debtMinor:Math.max(0,paid-net),
    ledger:period.map(({id,orderId,minor,type,at,campaignId})=>({id,orderId,minor,type,at,campaignId})),orderStates:orders,budgetAlerts,
    payouts:payouts.map(({id,minor,status,at,settledAt})=>({id,minor,status,at,settledAt})),
    campaigns:(await all('campaign')).map(({id,productId,active})=>({id,productId,active})),
    budgets:budgets.map(({month,minor,currency})=>({month,minor,currency})),
    limitations:['Clicks are deduplicated first-touch visits, not independently verified people. Bots and cross-device duplicates cannot be fully detected.',
      'Period activity conversion is not a cohort rate and can exceed 100% for repeat purchases. Refunded credits are excluded from current verified sales.',
      'Spend is manually recorded from supporting evidence; currency totals are separate. Budget approval is not proof of spend or an external Meta spending cap.',
      'Commission and ledger use the selected period; paid, due, reserved and debt are partner-wide lifetime balances, including when a campaign filter is selected.']};
}
export function reportCsv(report){
  const cell=value=>'"'+String(value??'').replace(/^[=+@-]/,'\t$&').replaceAll('"','""')+'"';
  const rows=[['partner','campaign','from','to','clicks','telegram_starts','orders','verified_sales','conversion_rate','commission_BDT','paid_BDT_lifetime','due_BDT_lifetime'],
    [report.partnerId,report.campaignId,report.from,report.to,report.clicks,report.telegramStarts,report.orders,report.verifiedSales,report.conversionRate,report.commissionMinor/100,report.paidMinor/100,report.dueMinor/100],
    [],['spend_currency','reported_spend','cost_per_sale'],...report.spend.map(x=>[x.currency,x.minor/100,x.costPerSale])];
  return rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
