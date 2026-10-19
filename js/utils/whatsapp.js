export function interpolate(text,customer,vars={}){return String(text||'').replace(/\{\{\s*(\w+)\s*\}\}/g,(_,key)=>vars[key]??customer?.[key]??'')}
function chatUrl(base,phone,message=''){const n=String(phone||'').replace(/\D/g,'');if(!/^\d{8,15}$/.test(n))throw Error('Invalid WhatsApp number');return `${base}?phone=${n}${message?`&text=${encodeURIComponent(message)}`:''}`}
export function whatsappUrl(phone,message=''){return chatUrl('https://web.whatsapp.com/send',phone,message)}
export function whatsappDesktopUrl(phone,message=''){return chatUrl('whatsapp://send',phone,message)}
