import assert from 'node:assert/strict';

export async function verifyDialogSSR(render) {
  assert.equal(typeof window, 'undefined', 'SSR must run without a browser window');
  assert.equal(typeof document, 'undefined', 'SSR must run without a browser document');
  const closedUrl = '/ssr?example=dialog&brand=purple&id=dialog-purple';
  const openUrl = `${closedUrl}&open=true&portal=true`;
  const otherUrl = '/ssr?example=dialog&brand=teal&id=dialog-teal&open=true&portal=false';
  const closed = await render(closedUrl);
  const open = await render(openUrl);
  const other = await render(otherUrl);
  assert.match(closed, /data-dialog-brand="purple"/);
  assert.doesNotMatch(closed, /role="dialog"|data-testid="ssr-dialog-body"/, 'Closed SSR must not render dialog content');
  assert.match(open, /data-dialog-brand="purple"/);
  assert.match(open, /id="dialog-purple"[^>]*role="dialog"/);
  assert.match(open, /id="dialog-purple-title"/);
  assert.match(open, /SSR dialog purple/);
  assert.match(open, /data-testid="ssr-dialog-body"[^>]*>Real purple dialog content is present in server HTML/);
  assert.ok(open.indexOf('data-testid="ssr-dialog"') < open.indexOf('id="ssr-dialog-host"'), 'Open portal must render inline before its host');
  assert.match(other, /data-dialog-brand="teal"/);
  assert.match(other, /id="dialog-teal"[^>]*role="dialog"/);
  assert.match(other, /SSR dialog teal/);
  assert.doesNotMatch(other, /dialog-purple/);
  assert.equal(await render(closedUrl), closed, 'Closed request must not inherit open state');
  assert.equal(await render(openUrl), open, 'Open request must be isolated from another brand and ID');
  const generatedA = await render('/ssr?example=dialog&open=true&idPrefix=first-');
  const generatedB = await render('/ssr?example=dialog&open=true&idPrefix=second-');
  const generatedId = html => html.match(/id="(zoom-dialog-[^"]+)" class="zoom-dialog__panel"/)?.[1];
  assert.match(generatedId(generatedA) ?? '', /^zoom-dialog-first-/);
  assert.match(generatedId(generatedB) ?? '', /^zoom-dialog-second-/);
  assert.notEqual(generatedId(generatedA), generatedId(generatedB));
  return { render: 'PASS', initialClosed: 'PASS', initialOpenInlinePortal: 'PASS', requestIsolation: 'PASS', idPrefix: 'PASS', bytes: { closed: Buffer.byteLength(closed), open: Buffer.byteLength(open) } };
}
