import { StrictMode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { BuildProbe } from './fixtures/BuildProbe.js';

afterEach(cleanup);

it('keeps state, receives updated props and releases its effect in StrictMode', async () => {
  const user = userEvent.setup();
  const onCount = vi.fn();
  const onActivity = vi.fn();
  const view = render(<StrictMode><BuildProbe label="Initial" onCount={onCount} onActivity={onActivity} /></StrictMode>);
  expect(screen.getByLabelText('Probe count').textContent).toBe('0');
  expect(onActivity).toHaveBeenLastCalledWith(true);
  await user.click(screen.getByRole('button', { name: /^Increment$/ }));
  expect(screen.getByLabelText('Probe count').textContent).toBe('1');
  expect(onCount).toHaveBeenLastCalledWith(1);
  view.rerender(<StrictMode><BuildProbe label="Updated" onCount={onCount} onActivity={onActivity} /></StrictMode>);
  expect(screen.getByLabelText('Probe label').textContent).toBe('Updated');
  expect(screen.getByLabelText('Probe count').textContent).toBe('1');
  view.unmount();
  expect(screen.queryByRole('button', { name: /^Increment$/ })).toBeNull();
  expect(onActivity).toHaveBeenLastCalledWith(false);
});
