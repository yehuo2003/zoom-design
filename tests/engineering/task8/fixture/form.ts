// Throwaway protocol experiment, deliberately isolated from package exports.
type Value = string | number | null;
type Config = { value: Value; required: boolean; readonly: boolean; loading: boolean; disabled: boolean; name: string; form: string | null; reset: 'accept' | 'reject' | 'initial' };
export function mountForm(root: HTMLElement) {
  root.innerHTML = `<form id="primary"><fieldset><legend id="legend">Selection</legend><div id="bridge">
    <button type="button" id="visible" aria-label="Selection">Selection</button>
    <input type="hidden" id="submission"><select id="proxy" class="proxy" tabindex="-1" aria-hidden="true"><option value=""></option><option value="__zoom_selected__">Selected</option></select>
    </div></fieldset><button id="submit" type="submit">Submit fixture</button><button id="fixture-reset" type="reset">Reset fixture</button></form><form id="external"></form>`;
  const primary = root.querySelector<HTMLFormElement>('#primary')!;
  const external = root.querySelector<HTMLFormElement>('#external')!;
  const proxy = root.querySelector<HTMLSelectElement>('#proxy')!;
  const hidden = root.querySelector<HTMLInputElement>('#submission')!;
  const visible = root.querySelector<HTMLButtonElement>('#visible')!;
  const bridge = root.querySelector<HTMLElement>('#bridge')!;
  const fieldset = root.querySelector<HTMLFieldSetElement>('fieldset')!;
  const controller = new AbortController();
  const pending = new Set<number>();
  let disposed = false;
  const events: string[] = [];
  let submits = 0;
  let observedResets = 0;
  let config: Config = { value: null, required: true, readonly: false, loading: false, disabled: false, name: 'choice', form: null, reset: 'reject' };
  const options = [0, '', '0', 'disabled'];
  const sync = () => {
    const matched = config.value !== null && options.some(value => value === config.value);
    for (const node of [proxy, hidden]) {
      if (config.form === null) node.removeAttribute('form'); else node.setAttribute('form', config.form);
      node.disabled = config.disabled;
    }
    hidden.name = config.name; hidden.value = matched ? String(config.value) : '';
    hidden.disabled = config.disabled || !matched || !config.name;
    proxy.value = matched ? '__zoom_selected__' : '';
    proxy.required = config.required && !config.readonly;
    proxy.setCustomValidity('');
    visible.disabled = config.disabled || proxy.matches(':disabled');
    visible.removeAttribute('aria-invalid');
  };
  proxy.addEventListener('invalid', event => { event.preventDefault(); visible.setAttribute('aria-invalid', 'true'); visible.focus(); }, { signal: controller.signal });
  for (const form of [primary, external]) {
    form.addEventListener('submit', event => { event.preventDefault(); submits++; }, { signal: controller.signal });
    form.addEventListener('reset', event => {
      // A trusted reset dispatch can run microtasks BETWEEN DOM listeners.
      // A later task sees the final canceled state and the completed default action.
      const task = window.setTimeout(() => {
        pending.delete(task);
        if (disposed) return;
        observedResets++;
        if (event.defaultPrevented || proxy.form !== form) return;
        // Exercise the value reset callback only; channel order is a design review.
        if (config.value !== null) events.push('value:reset');
        if (config.reset === 'accept') config.value = null;
        if (config.reset === 'initial') config.value = 0;
        sync();
      }, 0);
      pending.add(task);
    }, { signal: controller.signal });
  }
  sync();
  return {
    set(patch: Partial<Config>) { Object.assign(config, patch); sync(); },
    state: () => ({ ...config, events: [...events], submits, observedResets, proxy: proxy.value, missing: proxy.validity.valueMissing }),
    entries: () => [...new FormData(proxy.form!).entries()],
    report: () => proxy.form!.reportValidity(),
    check: () => proxy.form!.checkValidity(),
    cancelNextReset() { proxy.form!.addEventListener('reset', event => event.preventDefault(), { once: true, signal: controller.signal }); },
    reset(cancel = false) {
      const form = proxy.form!;
      // Registered AFTER the bridge listener to exercise late preventDefault.
      if (cancel) form.addEventListener('reset', event => event.preventDefault(), { once: true });
      form.reset();
      return new Promise<void>(resolve => window.setTimeout(resolve, 0));
    },
    cleanup() { disposed = true; controller.abort(); for (const task of pending) window.clearTimeout(task); pending.clear(); },
    fieldset(disabled: boolean, legend = false) { fieldset.disabled = disabled; (legend ? root.querySelector('#legend')! : fieldset).append(bridge); sync(); },
  };
}
