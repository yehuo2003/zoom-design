import type { DialogPanelAttributes, DialogProps } from './types';

const panelText = new Set(['title', 'dir']);
const panelEvents = new Set(['onFocus', 'onBlur', 'onKeydown', 'onKeyup', 'onClick']);

function normalizePanelAttrs(input: unknown, issue: (category: string) => void): DialogPanelAttributes | undefined {
  if (input == null) return undefined;
  if (typeof input !== 'object' || Array.isArray(input)) {
    issue('panelAttrs');
    return undefined;
  }
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (panelText.has(key) && typeof value === 'string') safe[key] = value;
    else if ((key === 'class' || key === 'style') && value != null) safe[key] = value;
    else if (panelEvents.has(key) && (typeof value === 'function' || (Array.isArray(value) && value.every(item => typeof item === 'function')))) safe[key] = value;
    else if (key.startsWith('data-') && (value === undefined || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) safe[key] = value;
    else issue('panelAttrs');
  }
  return safe as DialogPanelAttributes;
}

/** Pure parsing of JS inputs. The component owns issue reporting and browser resources. */
export function normalizeDialog(props: DialogProps) {
  const issues: string[] = [];
  const issue = (category: string) => {
    const message = `Invalid ${category}; using default or omitting value`;
    if (!issues.includes(message)) issues.push(message);
  };
  const bool = (name: keyof DialogProps, fallback: boolean) => {
    const value = props[name];
    if (value == null) return fallback;
    if (typeof value === 'boolean') return value;
    issue(String(name));
    return fallback;
  };
  const callback = (name: 'initialFocus' | 'returnFocus' | 'getContainer') => {
    const value = props[name];
    if (value == null) return undefined;
    if (typeof value === 'function') return value;
    issue(name);
    return undefined;
  };
  const reference = (name: 'id' | 'aria-label' | 'aria-labelledby') => {
    const value = props[name];
    if (value == null) return undefined;
    if (typeof value === 'string' && value.trim()) return value.trim();
    issue(name);
    return undefined;
  };
  const description = props['aria-describedby'];
  if (description != null && typeof description !== 'string') issue('aria-describedby');
  const closeLabel = typeof props.closeLabel === 'string' && props.closeLabel.trim()
    ? props.closeLabel : '关闭';
  if (props.closeLabel !== undefined && closeLabel === '关闭' && props.closeLabel !== '关闭') issue('closeLabel');
  const getContainer = callback('getContainer');
  const wantsPortal = bool('portal', false);
  if (wantsPortal && !getContainer) issue('getContainer');

  return {
    open: bool('open', false),
    modal: bool('modal', true),
    closeOnEscape: bool('closeOnEscape', true),
    closeOnOutside: bool('closeOnOutside', true),
    restoreFocus: bool('restoreFocus', true),
    portal: wantsPortal && !!getContainer,
    initialFocus: callback('initialFocus'),
    returnFocus: callback('returnFocus'),
    getContainer,
    closeLabel,
    id: reference('id'),
    'aria-label': reference('aria-label'),
    'aria-labelledby': reference('aria-labelledby'),
    'aria-describedby': typeof description === 'string' ? description : undefined,
    panelAttrs: normalizePanelAttrs(props.panelAttrs, issue),
    issues,
  };
}

/** Pass one Set per component instance so repeated renders warn once per category. */
export function reportDialogIssues(issues: readonly string[], warned: Set<string>, warn: (message: string) => void): void {
  for (const issue of issues) if (!warned.has(issue)) {
    warned.add(issue);
    warn(issue);
  }
}
