// A manually copied handle is a CRM lookup detail, not verified account ownership.
export function normalizeWhatsAppUsername(value) {
  const handle=String(value||'').trim().replace(/^@/,'').toLowerCase();
  return /^[a-z0-9._]{3,35}$/.test(handle)?handle:null;
}
export const customerIdentity=customer=>customer?.normalizedPhone||customer?.phone||customer?.whatsappUsername||'Identity not recorded';
