import { groupMenu } from './telegram-catalog.mjs';
import { catalogGroups } from '../js/utils/catalog-groups.js';
import { telegramEscape as esc, readableDescription, catalogFreshness } from './telegram-presentation.mjs';
import { formatCatalogPrice } from '../js/utils/catalog-pricing.js';

export const offerLabel = product => `${product.currency} ${product.price ?? '?'} · ${product.name}`;
export function readableProductCard(product,freshness={}){
  const own=product.id.startsWith('own_');
  const title=own?offerLabel(product):product.name.slice(0,150);
  const stock=product.stock==='available'?`${product.available} available`:product.stock==='out'?'Currently out of stock':'Confirm with Support before buying.';
  const lines=[`<b>${esc(title)}</b>`];
  if(!own)lines.push(`<b>💰 Price</b>\n${esc(formatCatalogPrice(product))}`);
  if(Number.isSafeInteger(product.durationDays)&&product.durationDays>0)lines.push(`<b>⏳ Duration</b>\n${product.durationDays} day${product.durationDays===1?'':'s'}`);
  lines.push(`<b>📦 Availability</b>\n${esc(stock)}`);
  if(!own){
    let description=readableDescription(product.description,1800);
    // Bound escaped content too: supplier text can contain many HTML entities.
    while(esc(description).length>2300)description=description.slice(0,-100);
    lines.push(`<b>📝 About this product</b>\n${esc(description)}`);
  }
  const requirements=[product.requirements?.email?'Customer email':'',product.requirements?.accounts?'Customer account details':'',product.requirements?.months?'Selected subscription duration':''].filter(Boolean);
  if(requirements.length)lines.push('<b>📋 What you’ll need</b>\n'+requirements.map(r=>'• '+esc(r)).join('\n'));
  lines.push('<b>💳 Payment &amp; delivery</b>\nOur team verifies your payment, then arranges delivery.');
  lines.push('<i>'+esc(catalogFreshness(freshness).replace('Catalog updated: ','Updated ').replace(' (Bangladesh time)',''))+'</i>');
  return {parse_mode:'HTML',text:lines.join('\n\n'),reply_markup:{inline_keyboard:product.stock!=='out'&&Number.isFinite(product.price)&&product.price>0&&/^[A-Za-z0-9_-]{1,48}$/.test(product.id)?[[{text:'Buy',callback_data:'buy:'+product.id}]]:[]}};
}
export function productGridMenu(products, supplierUnavailable=false) {
  const categoryCount=catalogGroups(products).length,rows=[];
  for(let page=0;page<Math.ceil(categoryCount/24);page++){
    const buttons=groupMenu(products,page).reply_markup.inline_keyboard.flat().filter(b=>b.callback_data?.startsWith('family:'));
    for(let i=0;i<buttons.length;i+=3)rows.push(buttons.slice(i,i+3));
  }
  const own=products.filter(p=>p.id.startsWith('own_'));
  for(const p of own)rows.push([{text:offerLabel(p).slice(0,100),callback_data:'product:'+p.id}]);
  return {parse_mode:'HTML',text:`<b>🛍 Products</b>\n\n${products.length} current listings · ${categoryCount} categories\nChoose a category below. Atlas offers are listed directly after the categories.\n${supplierUnavailable?'Supplier feed unavailable; only Atlas offers are shown.\n':''}\n${own.length?'<b>Atlas offers</b>\n'+own.map(p=>esc(offerLabel(p))).join('\n'):''}`,reply_markup:{inline_keyboard:rows}};
}
export function ownedShopProduct(p){
  if(p.active!==true||typeof p.name!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(p.id||'')||typeof p.price!=='number'||!Number.isFinite(p.price)||p.price<=0||!/^[A-Z]{3}$/.test(p.currency||''))return null;
  return {id:'own_'+p.id,name:p.name.slice(0,150),price:p.price,currency:p.currency,stock:'unknown',available:null,sold:null,durationDays:Number.isSafeInteger(p.durationDays)&&p.durationDays>0?p.durationDays:null,
    description:'Atlas offer.'+(Number.isSafeInteger(p.durationDays)&&p.durationDays>0?` Subscription term: ${p.durationDays} day(s).`:'')+' Fulfillment is handled manually after payment verification.',
    type:'other',image:'',promotions:[],requirements:{}};
}
