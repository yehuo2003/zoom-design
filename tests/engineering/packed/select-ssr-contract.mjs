import assert from 'node:assert/strict';

export async function verifySelectSSR(render) {
  const closed = await render('/ssr?example=select&brand=purple');
  const open = await render('/ssr?example=select&brand=purple&open=true');
  const other = await render('/ssr?example=select&brand=teal&open=true');
  const trigger = html => {
    const tag = html.match(/<button\b[^>]*\bid="ssr-select"[^>]*>/)?.[0];
    assert.ok(tag, 'Select trigger must be present in original server HTML');
    assert.match(tag, /role="combobox"/); assert.match(tag, /aria-label="SSR select"/);
    return tag;
  };
  assert.match(trigger(closed), /aria-expanded="false"/);
  assert.match(trigger(open), /aria-expanded="true"/);
  assert.match(closed, /data-select-brand="purple"/); assert.match(other, /data-select-brand="teal"/);
  const controls = trigger(open).match(/aria-controls="([^"]+)"/)?.[1];
  assert.ok(controls, 'Open SSR Select must name its inline listbox');
  assert.ok(open.includes(`id="${controls}"`), 'SSR popup must be inline even when portal is requested');
  assert.match(open, /role="listbox"/); assert.match(open, /role="option"/);
  assert.equal(await render('/ssr?example=select&brand=purple'), closed, 'closed request must be isolated');
  assert.equal(await render('/ssr?example=select&brand=purple&open=true'), open, 'open request must be isolated');
  return { render: 'PASS', initialClosed: 'PASS', initialOpenInlinePortal: 'PASS', requestIsolation: 'PASS', bytes: { closed: Buffer.byteLength(closed), open: Buffer.byteLength(open) } };
}
