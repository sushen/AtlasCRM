import {productFamily,productBrandImage} from './catalog-groups.js';
export const telegramBrandImage = family => productBrandImage(family);
const artwork={'ChatGPT & Codex':'chatgpt',Claude:'claude','Google AI & Veo':'gemini',Canva:'canva',Notion:'notion'};
export function shopArtwork(product) {
  const family=typeof product==='string'?product:productFamily(product);
  return artwork[family]?'/images/shop/'+artwork[family]+'.jpg':'';
}
export function telegramProductImage(product) {
  const local=shopArtwork(product);if(local)return 'https://atlascrm-c5722.web.app'+local;
  if(product.image) {
    try{const url=new URL(product.image);if(url.origin==='https://canboso.com'&&!url.search&&!url.hash)return url.href;}catch{}
  }
  return '';
}
