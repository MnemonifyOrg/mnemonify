import { describe, it, expect, vi, afterEach } from 'vitest';
import { findAPI, discoverDirectAPI } from './scorm2004.js';

function createFakeApi(overrides = {}) {
  return {
    Initialize: vi.fn(() => 'true'),
    GetValue: vi.fn(() => ''),
    SetValue: vi.fn(() => 'true'),
    Commit: vi.fn(() => 'true'),
    Terminate: vi.fn(() => 'true'),
    GetLastError: vi.fn(() => '0'),
    ...overrides,
  };
}

describe('findAPI / discoverDirectAPI', () => {
  it('finds API_1484_11 by walking the window.parent chain', () => {
    const api = createFakeApi();
    const lmsWindow = { API_1484_11: api };
    lmsWindow.parent = lmsWindow; // top window: parent === self
    const launcherWindow = { parent: lmsWindow };
    const playerWindow = { parent: launcherWindow };

    expect(findAPI(playerWindow)).toBe(api);
    expect(discoverDirectAPI(playerWindow)).toBe(api);
  });

  it('returns null when no API exists anywhere in the parent chain (standalone context)', () => {
    const topWindow = {};
    topWindow.parent = topWindow;
    const playerWindow = { parent: topWindow };

    expect(findAPI(playerWindow)).toBeNull();
    expect(discoverDirectAPI(playerWindow)).toBeNull();
  });

  it('falls back to the window.opener chain when the parent chain has no API', () => {
    const api = createFakeApi();
    const openerWindow = { API_1484_11: api };
    openerWindow.parent = openerWindow;
    const topWindow = {};
    topWindow.parent = topWindow;
    const playerWindow = { parent: topWindow, opener: openerWindow };

    expect(discoverDirectAPI(playerWindow)).toBe(api);
  });

  it('does not infinite-loop on a malformed/circular parent chain', () => {
    const winA = {};
    const winB = {};
    winA.parent = winB;
    winB.parent = winA;
    expect(findAPI(winA)).toBeNull();
  });
});

describe('initialize()', () => {
  afterEach(() => {
    delete global.window;
    vi.restoreAllMocks();
  });

  it('finds a direct API and returns true', async () => {
    const api = createFakeApi();
    const lmsWindow = { API_1484_11: api };
    lmsWindow.parent = lmsWindow;
    global.window = { parent: lmsWindow, addEventListener: vi.fn(), removeEventListener: vi.fn() };

    vi.resetModules();
    const mod = await import('./scorm2004.js');
    const result = await mod.default.initialize();

    expect(result).toBe(true);
    expect(api.Initialize).toHaveBeenCalledWith('');
  });

  it('returns false and warns when no API and no bridge is available (standalone)', async () => {
    const topWindow = {};
    topWindow.parent = topWindow;
    global.window = {
      parent: topWindow,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.resetModules();
    const mod = await import('./scorm2004.js');
    const result = await mod.default.initialize();

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('suspend data', () => {
  async function setupDirectModule() {
    const api = createFakeApi();
    const lmsWindow = { API_1484_11: api };
    lmsWindow.parent = lmsWindow;
    global.window = { parent: lmsWindow, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.resetModules();
    const mod = await import('./scorm2004.js');
    await mod.default.initialize();
    return { mod, api };
  }

  afterEach(() => {
    delete global.window;
    vi.restoreAllMocks();
  });

  it('serialises variable state and page id to JSON via SetValue, followed by Commit', async () => {
    const { mod, api } = await setupDirectModule();
    await mod.default.setSuspendData({ variables: { readDiagnosis: true }, pageId: 'pg_case1' });

    expect(api.SetValue).toHaveBeenCalledWith(
      'cmi.suspend_data',
      JSON.stringify({ variables: { readDiagnosis: true }, pageId: 'pg_case1' })
    );
    expect(api.Commit).toHaveBeenCalled();
  });

  it('parses suspend_data back into an object', async () => {
    const { mod, api } = await setupDirectModule();
    api.GetValue.mockReturnValue(JSON.stringify({ variables: { a: 1 }, pageId: 'pg_1' }));

    expect(await mod.default.getSuspendData()).toEqual({ variables: { a: 1 }, pageId: 'pg_1' });
  });

  it('returns an empty object when suspend_data is blank', async () => {
    const { mod, api } = await setupDirectModule();
    api.GetValue.mockReturnValue('');
    expect(await mod.default.getSuspendData()).toEqual({});
  });

  it('returns an empty object when suspend_data is invalid JSON', async () => {
    const { mod, api } = await setupDirectModule();
    api.GetValue.mockReturnValue('{not valid json');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await mod.default.getSuspendData()).toEqual({});
  });

  it('truncates to the most recently-set variables when serialised data exceeds 64000 characters', async () => {
    const { mod, api } = await setupDirectModule();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const variables = {};
    for (let i = 0; i < 5000; i += 1) {
      variables[`var_${i}`] = `value_${i}_${'x'.repeat(20)}`;
    }
    await mod.default.setSuspendData({ variables, pageId: 'pg_last' });

    const storedValue = api.SetValue.mock.calls.find((call) => call[0] === 'cmi.suspend_data')[1];
    expect(storedValue.length).toBeLessThanOrEqual(64000);

    const parsed = JSON.parse(storedValue);
    expect(parsed.pageId).toBe('pg_last');
    expect(parsed.variables.var_4999).toBeDefined();
    expect(parsed.variables.var_0).toBeUndefined();
  });
});

describe('session time', () => {
  afterEach(() => {
    delete global.window;
    vi.restoreAllMocks();
  });

  it('returns PT0H0M0S before startTimer has been called', async () => {
    vi.resetModules();
    const mod = await import('./scorm2004.js');
    expect(mod.default.getSessionTime()).toBe('PT0H0M0S');
  });

  it('formats elapsed time as an ISO 8601 duration (PT#H#M#S)', async () => {
    vi.resetModules();
    const mod = await import('./scorm2004.js');

    const dateNowSpy = vi.spyOn(Date, 'now');
    const start = 1000000;
    dateNowSpy.mockReturnValue(start);
    mod.default.startTimer();

    dateNowSpy.mockReturnValue(start + (3600 + 120 + 3) * 1000);
    expect(mod.default.getSessionTime()).toBe('PT1H2M3S');
  });
});
