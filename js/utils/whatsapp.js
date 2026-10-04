export function interpolate(text,customer,vars={}){return String(text||'').replace(/\{\{\s*(\w+)\s*\}\}/g,(_,key)=>vars[key]??customer?.[key]??'')}
export function whatsappUrl(phone,message=''){const n=String(phone||'').replace(/\D/g,'');if(!/^\d{8,15}$/.test(n))throw Error('Invalid WhatsApp number');return `https://wa.me/${n}${message?`?text=${encodeURIComponent(message)}`:''}`}
