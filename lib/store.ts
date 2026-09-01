import { create } from 'zustand';

import type { LogLevel } from './mock-api';

export type View = 'overview' | 'incidents' | 'logs';

type IncidentCanvasState = {
  view: View;
  selectedIncidentId: string;
  logQuery: string;
  logLevel: LogLevel | 'all';
  serviceFilter: string;
  commandOpen: boolean;
  setView: (view: View) => void;
  selectIncident: (id: string) => void;
  setLogQuery: (value: string) => void;
  setLogLevel: (value: LogLevel | 'all') => void;
  setServiceFilter: (value: string) => void;
  setCommandOpen: (open: boolean) => void;
};

export const useIncidentCanvasStore = create<IncidentCanvasState>((set) => ({
  view: 'overview',
  selectedIncidentId: 'INC-2026-0842',
  logQuery: '',
  logLevel: 'all',
  serviceFilter: '',
  commandOpen: false,
  setView: (view) => set({ view }),
  selectIncident: (selectedIncidentId) =>
    set({ selectedIncidentId, view: 'overview' }),
  setLogQuery: (logQuery) => set({ logQuery }),
  setLogLevel: (logLevel) => set({ logLevel }),
  setServiceFilter: (serviceFilter) => set({ serviceFilter }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}));
