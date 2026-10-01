// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { IncidentCanvasApp } from '../app/incident-app';
import * as gateway from '../lib/mock-api';
import { useIncidentCanvasStore } from '../lib/store';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('rolls back optimistic acknowledgement, shows the failure and permits retry', async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { staleTime: Infinity, retry: false },
      mutations: { retry: false },
    },
  });
  const [snapshot, incidents, logs] = await Promise.all([
    gateway.fetchSnapshot(),
    gateway.fetchIncidents(),
    gateway.fetchLogs(),
  ]);
  client.setQueryData(['snapshot'], snapshot);
  client.setQueryData(['incidents'], incidents);
  client.setQueryData(['logs'], logs);
  useIncidentCanvasStore.setState({
    view: 'overview',
    selectedIncidentId: incidents[0].id,
    commandOpen: false,
  });
  let rejectRequest!: (error: Error) => void;
  const pending = new Promise<gateway.Incident>((_resolve, reject) => {
    rejectRequest = reject;
  });
  const acknowledge = vi
    .spyOn(gateway, 'acknowledgeIncident')
    .mockReturnValueOnce(pending);
  render(
    <QueryClientProvider client={client}>
      <IncidentCanvasApp />
    </QueryClientProvider>,
  );

  expect(screen.getByText('Командир не назначен')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Признать инцидент' }));
  expect(
    await screen.findByRole('button', { name: 'Инцидент принят' }),
  ).toBeDisabled();
  expect(screen.getByText('Илья Тунис')).toBeVisible();

  await act(async () => {
    rejectRequest(new Error('Connection failed'));
  });
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Признать инцидент' }),
    ).toBeEnabled(),
  );
  expect(screen.getByText('Командир не назначен')).toBeVisible();
  expect(client.getQueryData(['incidents'])).toEqual(incidents);
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Не удалось принять инцидент',
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Изменения отменены');

  acknowledge.mockRestore();
  fireEvent.click(screen.getByRole('button', { name: 'Признать инцидент' }));
  await waitFor(() =>
    expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
  );
  await waitFor(() =>
    expect(screen.getByText('Incident acknowledged')).toBeVisible(),
  );
  expect(
    screen.getByRole('button', { name: 'Инцидент принят' }),
  ).toBeDisabled();
  expect(screen.getByText('Илья Тунис')).toBeVisible();
  client.clear();
});
