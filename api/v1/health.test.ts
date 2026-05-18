import { describe, expect, it, vi } from 'vitest';
import handler from './health';

describe('GET /api/v1/health', () => {
  it('returns { ok: true }', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    handler({ method: 'GET' }, { status, json } as never);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ ok: true });
  });

  it('rejects non-GET methods', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    handler({ method: 'POST' }, { status, json } as never);

    expect(status).toHaveBeenCalledWith(405);
  });
});
