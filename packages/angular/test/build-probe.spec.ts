import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { BuildProbe } from './fixtures/build-probe';

describe('private Angular signal probe', () => {
  it('updates required input, emits one increment and cleans up on destroy', async () => {
    const cleanup = vi.fn();
    const fixture = TestBed.createComponent(BuildProbe);
    fixture.componentRef.setInput('label', 'Initial');
    fixture.componentRef.setInput('onCleanup', cleanup);
    const emitted: number[] = [];
    fixture.componentInstance.countChanged.subscribe((value) => emitted.push(value));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-testid="probe-label"]').textContent).toBe('Initial');
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-testid="count"]').textContent).toBe('1');
    expect(emitted).toEqual([1]);
    fixture.componentRef.setInput('label', 'Updated');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-testid="probe-label"]').textContent).toBe('Updated');
    fixture.destroy();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
