export function catalogEndpoint(){return new URL('../preview/catalog-snapshot.json',import.meta.url).href;}
export async function catalogFetch(){return fetch(catalogEndpoint(),{cache:'no-store',redirect:'error'});}
