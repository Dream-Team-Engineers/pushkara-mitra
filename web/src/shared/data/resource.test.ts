import { describe, expect, it } from 'vitest';
import { createResource, isStale } from './resource';

describe('createResource', () => {
  it('starts loading, then holds the data with its fetch time', async () => {
    const resource = createResource(
      () => Promise.resolve([1, 2]),
      1000,
      () => 42,
    );
    expect(resource.state.value).toEqual({ status: 'loading' });
    await resource.refresh();
    expect(resource.state.value).toEqual({
      status: 'ready',
      data: [1, 2],
      fetchedAt: 42,
      refreshFailed: false,
    });
  });

  it('shows the error state when the first load fails', async () => {
    const resource = createResource(() => Promise.reject(new Error('down')), 1000);
    await resource.refresh();
    expect(resource.state.value).toEqual({ status: 'error' });
  });

  it('keeps the last good data and flags it when a later refresh fails', async () => {
    let fail = false;
    const resource = createResource(
      () => (fail ? Promise.reject(new Error('down')) : Promise.resolve('ok')),
      1000,
      () => 7,
    );
    await resource.refresh();
    fail = true;
    await resource.refresh();
    expect(resource.state.value).toEqual({
      status: 'ready',
      data: 'ok',
      fetchedAt: 7,
      refreshFailed: true,
    });
  });

  it('recovers after a failed first load when retried', async () => {
    let fail = true;
    const resource = createResource(
      () => (fail ? Promise.reject(new Error('down')) : Promise.resolve('ok')),
      1000,
    );
    await resource.refresh();
    expect(resource.state.value.status).toBe('error');
    fail = false;
    await resource.refresh();
    expect(resource.state.value.status).toBe('ready');
  });

  it('joins a refresh that is already running instead of loading twice', async () => {
    let calls = 0;
    const resource = createResource(() => {
      calls += 1;
      return Promise.resolve(calls);
    }, 1000);
    await Promise.all([resource.refresh(), resource.refresh(), resource.refresh()]);
    expect(calls).toBe(1);
    await resource.refresh();
    expect(calls).toBe(2);
  });
});

describe('isStale', () => {
  it('is stale only after the threshold has passed', () => {
    expect(isStale(1000, 1500, 500)).toBe(false);
    expect(isStale(1000, 1501, 500)).toBe(true);
  });
});
