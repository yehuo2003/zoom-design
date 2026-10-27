import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import BuildProbe from './fixtures/BuildProbe.vue';

describe('private Vue SFC build probe', () => {
  it('renders parent updates, emits the clicked count and disposes on unmount', async () => {
    const wrapper = mount(BuildProbe, { props: { label: 'Initial' }, attachTo: document.body });
    expect(wrapper.get('[aria-label="Label"]').text()).toBe('Initial');
    expect(wrapper.get('[aria-label="Count"]').text()).toBe('0');
    await wrapper.setProps({ label: 'Updated' });
    expect(wrapper.get('[aria-label="Label"]').text()).toBe('Updated');
    await wrapper.get('button').trigger('click');
    expect(wrapper.get('[aria-label="Count"]').text()).toBe('1');
    expect(wrapper.emitted('changed')).toEqual([[1]]);
    wrapper.unmount();
    expect(wrapper.emitted('disposed')).toEqual([[]]);
    expect(document.querySelector('[aria-label="Vue engineering probe"]')).toBeNull();
  });
});
