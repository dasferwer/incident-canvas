export type ServiceStatus = 'healthy' | 'degraded' | 'critical';
export type Severity = 'SEV-1' | 'SEV-2' | 'SEV-3';
export type IncidentStatus =
  | 'investigating'
  | 'identified'
  | 'monitoring'
  | 'resolved';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export type Service = {
  id: string;
  name: string;
  team: string;
  status: ServiceStatus;
  latencyMs: number;
  errorRate: number;
  requestsPerSecond: number;
  x: number;
  y: number;
  dependencies: string[];
};

export type TimelineEvent = {
  id: string;
  at: string;
  type: 'alert' | 'deploy' | 'metric' | 'action' | 'recovery';
  title: string;
  description: string;
};

export type Incident = {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  startedAt: string;
  commander: string | null;
  affectedUsers: number;
  summary: string;
  rootService: string;
  acknowledged: boolean;
  timeline: TimelineEvent[];
};

export type LogEntry = {
  id: number;
  at: string;
  level: LogLevel;
  service: string;
  traceId: string;
  message: string;
  durationMs: number | null;
};

export type Snapshot = {
  generatedAt: string;
  errorRate: number;
  p95LatencyMs: number;
  affectedUsers: number;
  services: Service[];
};

const services: Service[] = [
  {
    id: 'gateway',
    name: 'api-gateway',
    team: 'Platform',
    status: 'healthy',
    latencyMs: 91,
    errorRate: 0.3,
    requestsPerSecond: 842,
    x: 50,
    y: 12,
    dependencies: ['checkout', 'orders', 'payments'],
  },
  {
    id: 'checkout',
    name: 'checkout',
    team: 'Commerce',
    status: 'critical',
    latencyMs: 2840,
    errorRate: 18.4,
    requestsPerSecond: 226,
    x: 22,
    y: 42,
    dependencies: ['inventory'],
  },
  {
    id: 'orders',
    name: 'orders',
    team: 'Commerce',
    status: 'degraded',
    latencyMs: 980,
    errorRate: 4.8,
    requestsPerSecond: 312,
    x: 50,
    y: 47,
    dependencies: ['inventory', 'notifications'],
  },
  {
    id: 'payments',
    name: 'payments-api',
    team: 'Payments',
    status: 'critical',
    latencyMs: 2410,
    errorRate: 21.7,
    requestsPerSecond: 205,
    x: 78,
    y: 42,
    dependencies: ['notifications'],
  },
  {
    id: 'inventory',
    name: 'inventory',
    team: 'Supply',
    status: 'healthy',
    latencyMs: 124,
    errorRate: 0.5,
    requestsPerSecond: 408,
    x: 34,
    y: 78,
    dependencies: [],
  },
  {
    id: 'notifications',
    name: 'notifications',
    team: 'Platform',
    status: 'healthy',
    latencyMs: 72,
    errorRate: 0.1,
    requestsPerSecond: 155,
    x: 68,
    y: 78,
    dependencies: [],
  },
];

let incidents: Incident[] = [
  {
    id: 'INC-2026-0842',
    title: 'Ошибки оплаты после нового релиза',
    severity: 'SEV-1',
    status: 'investigating',
    startedAt: '2026-09-01T01:38:42+03:00',
    commander: null,
    affectedUsers: 1284,
    summary:
      'Доля неуспешных платежей выросла до 18,4%. Затронуты checkout и payments-api.',
    rootService: 'payments-api',
    acknowledged: false,
    timeline: [
      {
        id: 'evt-4',
        at: '2026-09-01T01:42:18+03:00',
        type: 'alert',
        title: 'Alert fired',
        description: 'payment_error_rate > 10%',
      },
      {
        id: 'evt-3',
        at: '2026-09-01T01:40:06+03:00',
        type: 'deploy',
        title: 'Deploy completed',
        description: 'payments-api v2.18.0',
      },
      {
        id: 'evt-2',
        at: '2026-09-01T01:38:42+03:00',
        type: 'metric',
        title: 'Latency increased',
        description: 'checkout p95 crossed 1s',
      },
      {
        id: 'evt-1',
        at: '2026-09-01T01:32:11+03:00',
        type: 'recovery',
        title: 'Baseline healthy',
        description: 'All SLOs within target',
      },
    ],
  },
  {
    id: 'INC-2026-0838',
    title: 'Задержка обработки webhook',
    severity: 'SEV-2',
    status: 'monitoring',
    startedAt: '2026-08-31T20:18:00+03:00',
    commander: 'Анна Крылова',
    affectedUsers: 342,
    summary: 'Очередь webhook обрабатывается с задержкой до 4 минут.',
    rootService: 'notifications',
    acknowledged: true,
    timeline: [],
  },
  {
    id: 'INC-2026-0824',
    title: 'Рост времени ответа inventory',
    severity: 'SEV-3',
    status: 'resolved',
    startedAt: '2026-08-30T12:05:00+03:00',
    commander: 'Михаил Громов',
    affectedUsers: 86,
    summary: 'Медленный запрос резервирования после перестроения индекса.',
    rootService: 'inventory',
    acknowledged: true,
    timeline: [],
  },
  {
    id: 'INC-2026-0819',
    title: 'Повторная доставка событий заказов',
    severity: 'SEV-2',
    status: 'identified',
    startedAt: '2026-08-29T16:40:00+03:00',
    commander: 'Олег Миронов',
    affectedUsers: 519,
    summary: 'Consumer повторно получает часть order.created после reconnect.',
    rootService: 'orders',
    acknowledged: true,
    timeline: [],
  },
];

const messages: Record<LogLevel, string[]> = {
  error: [
    'payment provider responded with 502 Bad Gateway',
    'transaction authorization timed out after 2500ms',
    'circuit breaker moved to OPEN state',
    'checkout request failed: upstream unavailable',
  ],
  warn: [
    'retry scheduled with exponential backoff',
    'latency budget exceeded for downstream call',
    'connection pool utilization above 85%',
    'request completed after client timeout',
  ],
  info: [
    'request completed successfully',
    'webhook accepted for asynchronous delivery',
    'order state transition persisted',
    'health probe completed',
  ],
  debug: [
    'cache key resolved for request context',
    'database connection checked out',
    'trace context propagated to downstream service',
    'feature flag evaluated',
  ],
};

function seeded(index: number): number {
  return (index * 9301 + 49297) % 233280;
}

export function generateLogs(count = 5000): LogEntry[] {
  const base = new Date('2026-09-01T01:45:00+03:00').getTime();
  const levels: LogLevel[] = ['info', 'info', 'info', 'warn', 'debug', 'error'];
  return Array.from({ length: count }, (_, index) => {
    const seed = seeded(index + 1);
    const service = services[seed % services.length];
    const level = levels[index % levels.length];
    const variants = messages[level];
    return {
      id: index + 1,
      at: new Date(base - index * 830).toISOString(),
      level,
      service: service.name,
      traceId: (seed * 7919).toString(16).padStart(8, '0').slice(-8),
      message: variants[(seed + service.name.length) % variants.length],
      durationMs: level === 'debug' ? null : 30 + (seed % 3200),
    };
  });
}

const logs = generateLogs();

function delay(ms = 180): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchSnapshot(): Promise<Snapshot> {
  await delay();
  return {
    generatedAt: new Date().toISOString(),
    errorRate: 18.4,
    p95LatencyMs: 2840,
    affectedUsers: incidents[0].affectedUsers,
    services: services.map((service) => ({ ...service })),
  };
}

export async function fetchIncidents(): Promise<Incident[]> {
  await delay(220);
  return incidents.map((incident) => ({
    ...incident,
    timeline: incident.timeline.map((event) => ({ ...event })),
  }));
}

export async function fetchLogs(): Promise<LogEntry[]> {
  await delay(260);
  return logs;
}

export async function acknowledgeIncident(id: string): Promise<Incident> {
  await delay(350);
  const found = incidents.find((item) => item.id === id);
  if (!found) throw new Error('Incident not found');
  const event: TimelineEvent = {
    id: `evt-ack-${id}`,
    at: new Date().toISOString(),
    type: 'action',
    title: 'Incident acknowledged',
    description: 'Командир: Илья Тунис',
  };
  const updated = {
    ...found,
    acknowledged: true,
    commander: 'Илья Тунис',
    timeline: [event, ...found.timeline],
  };
  incidents = incidents.map((item) => (item.id === id ? updated : item));
  return {
    ...updated,
    timeline: updated.timeline.map((item) => ({ ...item })),
  };
}

export function filterLogs(
  source: LogEntry[],
  query: string,
  level: LogLevel | 'all',
  service: string,
): LogEntry[] {
  const normalized = query.trim().toLowerCase();
  return source.filter((entry) => {
    if (level !== 'all' && entry.level !== level) return false;
    if (service && entry.service !== service) return false;
    if (!normalized) return true;
    return `${entry.message} ${entry.traceId} ${entry.service}`
      .toLowerCase()
      .includes(normalized);
  });
}

export function subscribeTelemetry(onTick: () => void): () => void {
  const timer = window.setInterval(onTick, 4000);
  return () => window.clearInterval(timer);
}
