import type { SelectionValue } from '@zoom-design/core';
type SelectionApi = typeof import('@zoom-design/core');

/** Application-owned state demonstrates public pure rules, not a selection component. */
export function mountSelectionExample(root: HTMLElement, api: SelectionApi) {
  const initial = api.normalizeOptions([
    { value: 0, label: 'Apple' }, { value: '', label: 'ALPHA' }, { value: '0', label: 'Apricot' },
    { value: 'disabled', label: 'Avocado', disabled: true }, { value: '中', label: '中文选项' },
  ]).options;
  let options = initial;
  let selected: SelectionValue = 0;
  let highlighted: SelectionValue = null;
  root.innerHTML = `<h3>Public selection functions</h3>
    <p>Value: <output data-field="value"></output> Label: <output data-field="label"></output></p>
    <p>Highlight: <output data-field="highlight"></output></p><p>Options: <output data-field="options"></output></p>
    <label>Filter <input data-field="filter"></label><label>Typeahead <input data-field="typeahead"></label>
    <label>Loop <input data-field="loop" type="checkbox"></label>
    <button type="button" data-action="next">Next</button><button type="button" data-action="previous">Previous</button>
    <button type="button" data-action="first">First</button><button type="button" data-action="last">Last</button>
    <button type="button" data-action="confirm">Confirm highlight</button><button type="button" data-action="clear">Clear value</button>
    <button type="button" data-action="typeahead">Match prefix</button><button type="button" data-action="remove">Remove selected option</button>
    <button type="button" data-action="restore">Restore options</button><button type="button" data-action="reverse">Reverse options</button>`;
  const field = <T extends HTMLElement = HTMLElement>(name: string) => root.querySelector<T>(`[data-field="${name}"]`)!;
  const describe = (value: SelectionValue) => value === null ? 'null' : `${typeof value}:${JSON.stringify(value)}`;
  const visible = () => api.filterOptions(options, field<HTMLInputElement>('filter').value);
  const render = () => {
    field('value').textContent = describe(selected);
    field('label').textContent = api.getSelectedOption(options, selected)?.label ?? 'Unmatched';
    field('highlight').textContent = describe(highlighted);
    field('options').textContent = visible().map(option => option.label).join(' | ');
  };
  field('filter').addEventListener('input', () => { highlighted = api.reconcileHighlight(visible(), highlighted, selected); render(); });
  for (const action of ['next', 'previous', 'first', 'last'] as const) root.querySelector(`[data-action="${action}"]`)!.addEventListener('click', () => {
    highlighted = api.moveHighlight(visible(), highlighted, action, field<HTMLInputElement>('loop').checked); render();
  });
  root.querySelector('[data-action="confirm"]')!.addEventListener('click', () => {
    const option = api.getSelectedOption(visible(), highlighted);
    if (option && !option.disabled) selected = option.value;
    render();
  });
  root.querySelector('[data-action="clear"]')!.addEventListener('click', () => { selected = null; render(); });
  root.querySelector('[data-action="typeahead"]')!.addEventListener('click', () => {
    highlighted = api.findTypeaheadMatch(visible(), highlighted, field<HTMLInputElement>('typeahead').value); render();
  });
  root.querySelector('[data-action="remove"]')!.addEventListener('click', () => {
    options = options.filter(option => option.value !== selected); highlighted = api.reconcileHighlight(visible(), highlighted, selected); render();
  });
  root.querySelector('[data-action="restore"]')!.addEventListener('click', () => { options = initial; highlighted = api.reconcileHighlight(visible(), highlighted, selected); render(); });
  root.querySelector('[data-action="reverse"]')!.addEventListener('click', () => { options = [...options].reverse(); highlighted = api.reconcileHighlight(visible(), highlighted, selected); render(); });
  render();
}
