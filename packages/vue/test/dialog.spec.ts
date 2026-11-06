import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import Dialog from '../src/dialog/Dialog.vue';

const wrappers: ReturnType<typeof mount>[] = [];
function dialog(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) {
  const wrapper = mount(Dialog, { props, slots, attrs, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('Task13.2 Dialog shell', () => {
  it('T13.2.1 creates a single panel only while controlled open is true', async () => {
    const wrapper = dialog({}, { title: 'Example', default: 'Content' });
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(0);
    await wrapper.setProps({ open: true });
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(wrapper.get('.zoom-dialog__content').text()).toBe('Content');
    expect(wrapper.find('.zoom-dialog__backdrop').exists()).toBe(true);
    await wrapper.setProps({ modal: false });
    expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBeUndefined();
    expect(wrapper.find('.zoom-dialog__backdrop').exists()).toBe(false);
    await wrapper.setProps({ open: false });
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(0);
  });

  it('T13.2.2 applies name priority and points generated title ID to a real element', async () => {
    const wrapper = dialog({ open: true }, { title: 'Account settings' });
    const panel = wrapper.get('[role="dialog"]');
    const title = wrapper.get('.zoom-dialog__title');
    expect(panel.attributes('aria-labelledby')).toBe(title.attributes('id'));
    expect(document.getElementById(title.attributes('id')!)).toBe(title.element);
    expect(panel.attributes('aria-label')).toBeUndefined();
    expect(panel.attributes('aria-modal')).toBe('true');
    expect(panel.attributes('tabindex')).toBe('-1');
    await wrapper.setProps({ 'aria-label': 'Explicit label' });
    expect(panel.attributes('aria-label')).toBe('Explicit label');
    expect(panel.attributes('aria-labelledby')).toBeUndefined();
    await wrapper.setProps({ 'aria-labelledby': 'business-name' });
    expect(panel.attributes('aria-labelledby')).toBe('business-name');
    expect(panel.attributes('aria-label')).toBeUndefined();
    await wrapper.setProps({ id: 'chosen-dialog' });
    expect(panel.attributes('id')).toBe('chosen-dialog');
    expect(title.attributes('id')).toBe('chosen-dialog-title');
  });

  it('T13.2.2 keeps generated IDs stable between SSR and first client render', async () => {
    const app = createSSRApp({ render: () => h(Dialog, { open: true, 'aria-label': 'Server name' }, { title: () => 'Server title' }) });
    const html = await renderToString(app);
    const id = html.match(/role="dialog"[^>]*id="([^"]+)"|id="([^"]+)"[^>]*role="dialog"/)?.slice(1).find(Boolean);
    expect(id).toBeTruthy();
    expect(html).toContain(`${id}-title`);
    expect(html).not.toMatch(/\bundefined\b|\bNaN\b/);
    const client = dialog({ open: true, 'aria-label': 'Server name' }, { title: 'Server title' });
    expect(client.get('[role="dialog"]').attributes('id')).toBe(id);
  });

  it('T13.2.3 associates description only when appropriate, including empty explicit opt-out', async () => {
    const wrapper = dialog({ open: true, 'aria-label': 'Name' });
    const panel = wrapper.get('[role="dialog"]');
    expect(panel.attributes('aria-describedby')).toBeUndefined();
    await wrapper.setProps({ 'aria-describedby': 'help-text' });
    expect(panel.attributes('aria-describedby')).toBe('help-text');
    await wrapper.setProps({ 'aria-describedby': '' });
    expect(panel.attributes('aria-describedby')).toBeUndefined();
    const described = dialog({ open: true, 'aria-label': 'Another' }, { description: 'A short note' });
    const ownPanel = described.get('[role="dialog"]');
    expect(ownPanel.attributes('aria-describedby')).toBe(described.get('.zoom-dialog__description').attributes('id'));
    await described.setProps({ 'aria-describedby': '' });
    expect(ownPanel.attributes('aria-describedby')).toBeUndefined();
  });

  it('T13.2.4 renders native non-submit close and replaces it completely with a custom close slot', () => {
    const regular = dialog({ open: true, 'aria-label': 'Name' }, { footer: '<button type="submit">Save</button>' });
    const close = regular.get('.zoom-dialog__close');
    expect(close.element.tagName).toBe('BUTTON');
    expect(close.attributes('type')).toBe('button');
    expect(close.attributes('aria-label')).toBe('关闭');
    expect(regular.get('.zoom-dialog__footer button').attributes('type')).toBe('submit');
    const custom = dialog({ open: true, 'aria-label': 'Custom' }, { close: ({ requestClose }: { requestClose: () => void }) => h('button', { type: 'button', onClick: requestClose }, 'Dismiss') });
    expect(custom.find('.zoom-dialog__close').exists()).toBe(false);
    expect(custom.findAll('.zoom-dialog__close-slot button')).toHaveLength(1);
    expect(custom.find('button button').exists()).toBe(false);
  });

  it('T13.2.5 routes root and panel attrs separately and protects dialog semantics', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = dialog({ open: true, 'aria-label': 'Name', class: 'brand', style: 'color: rgb(1, 2, 3)', panelAttrs: { title: 'Panel title', dir: 'rtl', class: 'panel-brand', style: 'border-width: 3px', 'data-panel': 'yes', role: 'alertdialog', tabindex: 0, 'aria-modal': 'false' } }, {}, { 'data-root': 'yes', role: 'presentation', tabindex: '0', onclick: 'bad' });
    const root = wrapper.get('.zoom-dialog');
    expect(root.classes()).toContain('brand');
    expect((root.element as HTMLElement).style.color).toBe('rgb(1, 2, 3)');
    expect(root.attributes('data-root')).toBe('yes');
    expect(root.attributes('role')).toBeUndefined();
    expect(root.attributes('tabindex')).toBeUndefined();
    expect(root.attributes('onclick')).toBeUndefined();
    const panel = wrapper.get('[role="dialog"]');
    expect(panel.classes()).toContain('panel-brand');
    expect((panel.element as HTMLElement).style.borderWidth).toBe('3px');
    expect(panel.attributes()).toMatchObject({ title: 'Panel title', dir: 'rtl', 'data-panel': 'yes', 'aria-modal': 'true', tabindex: '-1' });
    expect(panel.attributes('data-root')).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('T13.2.5 warns once for an open dialog with no accessible name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = dialog({ open: true });
    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBeUndefined();
    await wrapper.setProps({ modal: false });
    expect(warn.mock.calls.filter(([message]) => String(message).includes('name'))).toHaveLength(1);
  });
});
