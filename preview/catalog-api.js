import {previewState} from './preview/runtime.js';
export function catalogEndpoint(){throw Error('No live endpoint exists in the isolated preview.');}
export async function catalogFetch(){
  const sources=previewState.suppliers.filter(s=>s.enabled);const available=sources.reduce((n,s)=>n+(s.id==='canboso'?2:3),0),cost=sources.some(s=>s.id==='nam')?8:10;
  const markup=available===1?40:available<=4?30:20;
  return Response.json({products:sources.length?[{id:'preview-plan',name:'Fictional 30-day plan',description:'Simulated branch preview product.',price:Math.round(cost*(100+markup))/100,currency:'USD',available,stock:'available',type:'account',requirements:{},promotions:[]}]:[],fetchedAt:new Date().toISOString(),storefront:{brand:'Atlas preview',telegramUrl:''},pricing:{mode:'preview_simulation'}});
}
