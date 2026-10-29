type DOMApi = typeof import('@zoom-design/dom');
export function mountFormExample(root: HTMLElement, api: DOMApi) {
  root.innerHTML = `<form id="form-a"><button type="reset">Reset A</button><button type="submit">Submit A</button></form><form id="form-b"><button type="reset">Reset B</button></form>
    <button id="bridge-trigger">Visible form trigger</button><fieldset id="bridge-fieldset"><legend><select id="legend-proxy"><option>Legend</option></select></legend>
    <select id="bridge-proxy" form="form-a" required aria-label="Validation proxy"><option value="">Choose</option><option value="zero">Zero</option></select><input id="bridge-submission" type="hidden" name="choice" form="form-a" value=""></fieldset>
    <button id="bridge-fill">Fill value</button><button id="bridge-rebind">Use form B</button><button id="bridge-disable">Toggle fieldset</button><button id="bridge-cancel">Cancel resets</button><button id="bridge-dispose">Dispose bridge</button>
    <output id="bridge-state" aria-label="Form bridge state"></output>`;
  const proxy = root.querySelector<HTMLSelectElement>('#bridge-proxy')!; const submission = root.querySelector<HTMLInputElement>('#bridge-submission')!; const trigger = root.querySelector<HTMLButtonElement>('#bridge-trigger')!;
  let resets = 0; let invalid = 0; let owner = ''; let cancel = false;
  const render = () => { root.querySelector('#bridge-state')!.textContent = `${owner};reset=${resets};invalid=${invalid};value=${proxy.value};disabled=${api.isFieldsetDisabled(proxy)};legend=${api.isFieldsetDisabled(root.querySelector<HTMLElement>('#legend-proxy')!)}`; };
  const handle = api.observeFormBridge({ proxy, submission, trigger, onReset() { resets++; submission.value = proxy.value; render(); }, onInvalid() { invalid++; render(); }, onOwnerChange(form) { owner = form?.id ?? 'none'; render(); } });
  for (const form of root.querySelectorAll('form')) { form.addEventListener('reset', event => { if (cancel) event.preventDefault(); }); form.addEventListener('submit', event => event.preventDefault()); }
  root.querySelector('#bridge-fill')!.addEventListener('click', () => { proxy.value = submission.value = 'zero'; render(); });
  root.querySelector('#bridge-rebind')!.addEventListener('click', () => { proxy.setAttribute('form', 'form-b'); submission.setAttribute('form', 'form-b'); submission.name = 'renamed'; handle.refresh(); });
  root.querySelector('#bridge-disable')!.addEventListener('click', () => { const fieldset = root.querySelector<HTMLFieldSetElement>('fieldset')!; fieldset.disabled = !fieldset.disabled; render(); });
  root.querySelector('#bridge-cancel')!.addEventListener('click', () => { cancel = !cancel; });
  root.querySelector('#bridge-dispose')!.addEventListener('click', () => { handle.cleanup(); handle.cleanup(); });
  window.addEventListener('pagehide', () => handle.cleanup(), { once: true }); render();
}
