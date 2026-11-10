import { describe, expect, it } from 'vitest';
import { hrefFor, parseHash, ROUTE_IDS, ROUTES, titleKeyFor } from './router';

describe('parseHash', () => {
  it.each(['', '#', '#/', '/'])('maps %j to home', (hash) => {
    expect(parseHash(hash)).toBe('home');
  });

  it('maps every declared route path to its id', () => {
    for (const route of ROUTES) expect(parseHash(`#${route.path}`)).toBe(route.id);
  });

  it('ignores a trailing slash and a query string', () => {
    expect(parseHash('#/ghats/')).toBe('ghats');
    expect(parseHash('#/stay?sort=distance')).toBe('stay');
  });

  it.each(['#/nope', '#/ghats/12', '#//ghats', '#/GHATS', '#/api/me', '#main'])(
    'treats %j as not found',
    (hash) => {
      expect(parseHash(hash)).toBe('notFound');
    },
  );
});

describe('route table', () => {
  it('has one entry per route id with unique paths', () => {
    expect(ROUTES.map((route) => route.id).sort()).toEqual([...ROUTE_IDS].sort());
    expect(new Set(ROUTES.map((route) => route.path)).size).toBe(ROUTES.length);
  });

  it('covers Home plus the ten agreed modules', () => {
    const modules = ROUTE_IDS.filter((id) => id !== 'home' && id !== 'settings');
    expect(modules).toHaveLength(10);
  });

  it('builds hash links and titles', () => {
    expect(hrefFor('home')).toBe('#/');
    expect(hrefFor('pass')).toBe('#/pass');
    expect(titleKeyFor('notFound')).toBe('status.notFound.title');
    expect(titleKeyFor('ghats')).toBe('module.ghats.title');
  });
});
