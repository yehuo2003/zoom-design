import assert from 'node:assert/strict';

export async function verifyComboboxSSR(render) {
  const closedUrl = '/ssr?example=combobox&brand=purple&query=Ze';
  const openUrl = `${closedUrl}&open=true`;
  const closed = await render(closedUrl);
  const open = await render(openUrl);
  const other = await render('/ssr?example=combobox&brand=teal&query=Em&open=true');
  const input = html => {
    const tag = html.match(/<input\b[^>]*\bid="ssr-combobox"[^>]*>/)?.[0];
    assert.ok(tag, 'Combobox input must be present in original server HTML');
    assert.match(tag, /role="combobox"/); assert.match(tag, /aria-label="SSR combobox"/);
    assert.match(tag, /aria-autocomplete="list"/);
    return tag;
  };
  assert.match(input(closed), /aria-expanded="false"/);
  assert.match(input(open), /aria-expanded="true"/);
  assert.match(input(closed), /value="Ze"/); assert.match(input(open), /value="Ze"/);
  assert.match(input(other), /value="Em"/);
  assert.match(closed, /data-combobox-brand="purple"/); assert.match(other, /data-combobox-brand="teal"/);
  const controls = input(open).match(/aria-controls="([^"]+)"/)?.[1];
  assert.ok(controls, 'Open SSR Combobox must name its inline listbox');
  assert.ok(open.includes(`id="${controls}"`), 'SSR popup must be inline even when portal is requested');
  assert.match(open, /role="listbox"/); assert.match(open, /role="option"/);
  assert.equal(await render(closedUrl), closed, 'closed query request must be isolated');
  assert.equal(await render(openUrl), open, 'open query request must be isolated');
  return { render: 'PASS', initialQuery: 'PASS', initialClosed: 'PASS', initialOpenInlinePortal: 'PASS', requestIsolation: 'PASS', bytes: { closed: Buffer.byteLength(closed), open: Buffer.byteLength(open) } };
}
