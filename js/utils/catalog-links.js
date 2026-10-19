const atlasDestinations = new Set(['https://t.me/atlascrmshop','https://t.me/AtlasCrmMarketBot','https://t.me/AtlasCrmMarketBot?start=shop']);
export function catalogShopLink(destination='') {
  return atlasDestinations.has(destination) ? 'https://t.me/AtlasCrmMarketBot?start=shop' : destination;
}
export function catalogProductLink(product,destination='') {
  if(atlasDestinations.has(destination)&&/^[A-Za-z0-9_-]{1,48}$/.test(product?.id||''))return 'https://t.me/AtlasCrmMarketBot?start=product_'+product.id;
  return catalogShopLink(destination);
}
