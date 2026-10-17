import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhone} from '../js/utils/phone.js';
import {whatsappUrl,whatsappDesktopUrl,interpolate} from '../js/utils/whatsapp.js';
import {parseText,previewRows} from '../js/services/imports.js';

test('normalizes Bangladesh formats and international numbers',()=>{
  assert.equal(normalizePhone('017 1234-5678'),'+8801712345678');
  assert.equal(normalizePhone('8801712345678'),'+8801712345678');
  assert.equal(normalizePhone('+8801712345678'),'+8801712345678');
  assert.equal(normalizePhone('+19396663542'),'+19396663542');
});
test('rejects invalid and incomplete numbers',()=>{assert.equal(normalizePhone('017123'),null);assert.equal(normalizePhone('not a number'),null)});
test('parses multiple numbers per line and reports duplicates',()=>{
  const rows=parseText('+8801712345678 +8801812345678\ninvalid');
  const p=previewRows(rows,[]);
  assert.equal(p.total,3);assert.equal(p.valid,2);assert.equal(p.invalid,1);
  assert.equal(previewRows(parseText('+8801712345678'),[{normalizedPhone:'+8801712345678'}]).existingMatches,1);
});
test('generates click to chat links and interpolates variables',()=>{
  assert.equal(whatsappUrl('+8801712345678','Hi there'),'https://web.whatsapp.com/send?phone=8801712345678&text=Hi%20there');
  assert.equal(whatsappUrl('+8801712345678'),'https://web.whatsapp.com/send?phone=8801712345678');
  const message='Hello & welcome!\nবাংলা + #?';
  assert.equal(new URL(whatsappUrl('+8801712345678',message)).searchParams.get('text'),message);
  assert.equal(whatsappDesktopUrl('+8801712345678'),'whatsapp://send?phone=8801712345678');
  const desktop=new URL(whatsappDesktopUrl('+8801712345678',message));
  assert.equal(desktop.protocol,'whatsapp:');
  assert.equal(desktop.searchParams.get('phone'),'8801712345678');
  assert.equal(desktop.searchParams.get('text'),message);
  assert.throws(()=>whatsappDesktopUrl('invalid'),/Invalid WhatsApp number/);
  assert.equal(interpolate('Hi {{name}} about {{product}}',{name:'Lead'},{product:'Plan'}),'Hi Lead about Plan');
});
