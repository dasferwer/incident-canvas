import { beforeEach, describe, expect, it } from 'vitest';

import { useIncidentCanvasStore } from '../lib/store';

describe('incident canvas store', () => {
  beforeEach(() => {
    useIncidentCanvasStore.setState({
      view: 'overview',
      selectedIncidentId: 'INC-2026-0842',
      logQuery: '',
      logLevel: 'all',
      serviceFilter: '',
      commandOpen: false,
    });
  });

  it('keeps log filters while switching views', () => {
    const state = useIncidentCanvasStore.getState();
    state.setLogQuery('timeout');
    state.setLogLevel('error');
    state.setServiceFilter('payments-api');
    state.setView('logs');

    expect(useIncidentCanvasStore.getState()).toMatchObject({
      view: 'logs',
      logQuery: 'timeout',
      logLevel: 'error',
      serviceFilter: 'payments-api',
    });
  });

  it('selects an incident and returns to command center', () => {
    useIncidentCanvasStore.getState().setView('incidents');
    useIncidentCanvasStore.getState().selectIncident('INC-2026-0838');

    expect(useIncidentCanvasStore.getState()).toMatchObject({
      view: 'overview',
      selectedIncidentId: 'INC-2026-0838',
    });
  });
});
