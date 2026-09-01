import { describe, expect, it } from 'vitest';

import {
  acknowledgeIncident,
  fetchIncidents,
  filterLogs,
  generateLogs,
} from '../lib/mock-api';

describe('log dataset', () => {
  it('generates a deterministic large dataset', () => {
    const first = generateLogs(5);
    const second = generateLogs(5);

    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
    expect(generateLogs()).toHaveLength(5000);
  });

  it('combines level, service and text filters', () => {
    const logs = generateLogs(500);
    const target = logs.find((entry) => entry.level === 'error');
    expect(target).toBeDefined();

    const filtered = filterLogs(
      logs,
      target!.traceId,
      'error',
      target!.service,
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toMatchObject({
      traceId: target!.traceId,
      level: 'error',
      service: target!.service,
    });
  });
});

describe('incident workflow', () => {
  it('acknowledges an incident and appends a timeline action', async () => {
    const before = (await fetchIncidents()).find(
      (item) => item.id === 'INC-2026-0842',
    );
    expect(before).toBeDefined();

    const updated = await acknowledgeIncident('INC-2026-0842');
    expect(updated.acknowledged).toBe(true);
    expect(updated.commander).toBe('Илья Тунис');
    expect(updated.timeline[0].type).toBe('action');
  });
});
