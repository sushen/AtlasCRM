import { featuredProducts } from '../js/utils/catalog-featured.js';
import { shopContactUrl,shopProductLink } from './telegram-shop.mjs';
import { formatCatalogPrice } from '../js/utils/catalog-pricing.js';
import {telegramProductImage} from '../js/utils/shop-images.js';
export function channelShopPosts(products,{username='AtlasCrmMarketBot',supportUrl,channel='@atlascrmshop'}={}) {
  if(channel!=='@atlascrmshop')throw Error('Only the approved Atlas channel is supported');
  const contact=shopContactUrl(supportUrl);if(!contact)throw Error('Configure a public admin contact before publishing');
  const bot='https://t.me/'+username;
  const welcome={key:'welcome',photo:'https://atlascrm-c5722.web.app/images/brand/atlas-logo.jpg',text:'ATLAS MARKET\n\nDiscover digital tools for work and creativity. Browse the collection, compare plans and request an order in our private shop.\n\n1. Select your product\n2. Contact admin to confirm stock and payment instructions\n3. Submit your payment reference for human review\n4. Admin confirms payment and handles delivery\n\nNo website login needed. A submitted reference is not proof of payment. Never send passwords or payment-account credentials. Prices and stock can change; confirm before paying.',
    reply_markup:{inline_keyboard:[[{text:'🛒 Browse catalog · Open shop',url:bot+'?start=shop'}],[{text:'💬 Contact admin',url:contact}],[{text:'🌐 Website catalog',url:'https://atlascrm-c5722.web.app/?catalog=1'}]]}};
  const posts=[welcome];
  for(const featured of featuredProducts(products)) {
    const product=featured.product;if(!product)continue;const link=shopProductLink(username,product.id);if(!link)continue;
    posts.push({key:'featured:'+featured.family,photo:telegramProductImage(product),text:('ATLAS MARKET • '+featured.name+' • '+formatCatalogPrice(product)+'\n\n'+product.name.slice(0,160)+'\n\n'+formatCatalogPrice(product)+' • '+(product.stock==='available'?product.available+' in stock':product.stock==='out'?'Out of stock':'Confirm availability')+'\n\n'+product.description.slice(0,380)+'\n\nReference: '+product.id+'\n\nChoose the listing below to request an order. Admin confirms current price, stock and payment.').slice(0,1000),
      reply_markup:{inline_keyboard:[[{text:formatCatalogPrice(product)+(product.stock==='out'?' · Ask about restocking':' · Order request'),url:link}],[{text:'Contact admin',url:contact}]]}});
  }
  return posts;
}
