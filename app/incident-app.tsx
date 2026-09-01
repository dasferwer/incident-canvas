'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SortingState,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownUp,
  Bell,
  CheckCircle2,
  Clock3,
  Command,
  Search,
  ShieldAlert,
  TerminalSquare,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Incident,
  LogEntry,
  LogLevel,
  Service,
  Snapshot,
  acknowledgeIncident,
  fetchIncidents,
  fetchLogs,
  fetchSnapshot,
  filterLogs,
  subscribeTelemetry,
} from '@/lib/mock-api';
import { View, useIncidentCanvasStore } from '@/lib/store';

const severityOrder = { 'SEV-1': 1, 'SEV-2': 2, 'SEV-3': 3 } as const;
const statusLabels = {
  investigating: 'Расследование',
  identified: 'Причина найдена',
  monitoring: 'Наблюдение',
  resolved: 'Устранён',
} as const;

const incidentTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});
const incidentColumn = createColumnHelper<
  typeof incidentTableFeatures,
  Incident
>();

function severityBadge(severity: Incident['severity']) {
  const classes =
    severity === 'SEV-1'
      ? 'bg-critical/12 text-critical ring-critical/20'
      : severity === 'SEV-2'
        ? 'bg-warning/12 text-warning ring-warning/20'
        : 'bg-primary/10 text-primary ring-primary/20';
  return <Badge className={`${classes} ring-1`}>{severity}</Badge>;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function AppHeader({ live }: { live: boolean }) {
  const { view, setView, setCommandOpen } = useIncidentCanvasStore();
  const navigation: { id: View; label: string; icon: typeof Activity }[] = [
    { id: 'overview', label: 'Command center', icon: Activity },
    { id: 'incidents', label: 'Инциденты', icon: ShieldAlert },
    { id: 'logs', label: 'Live logs', icon: TerminalSquare },
  ];
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-white/8 bg-panel/88 px-4 py-2 backdrop-blur-xl lg:px-7">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Activity className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">IncidentCanvas</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            production / eu-central
          </p>
        </div>
      </div>
      <nav
        aria-label="Основная навигация"
        className="hidden items-center gap-1 rounded-lg border border-white/8 bg-white/3 p-1 md:flex"
      >
        {navigation.map((item) => (
          <Button
            key={item.id}
            variant={view === item.id ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView(item.id)}
          >
            <item.icon data-icon="inline-start" /> {item.label}
          </Button>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="hidden gap-1.5 border-white/10 bg-white/3 sm:flex"
        >
          <span
            className={`size-1.5 rounded-full ${live ? 'bg-primary' : 'bg-warning'}`}
          />
          {live ? 'live' : 'reconnecting'}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Открыть командную строку"
          onClick={() => setCommandOpen(true)}
        >
          <Search />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Уведомления">
          <Bell />
        </Button>
        <div className="grid size-8 place-items-center rounded-full bg-violet-400/15 text-xs font-semibold text-violet-300">
          ИТ
        </div>
      </div>
    </header>
  );
}

function MetricCards({ snapshot }: { snapshot: Snapshot }) {
  const healthy = snapshot.services.filter(
    (service) => service.status === 'healthy',
  ).length;
  const metrics = [
    {
      label: 'Error rate',
      value: `${snapshot.errorRate.toFixed(1)}%`,
      note: '+15,9% за 12 минут',
      icon: AlertTriangle,
    },
    {
      label: 'P95 latency',
      value: `${snapshot.p95LatencyMs.toLocaleString('ru-RU')} ms`,
      note: 'SLO: 650 ms',
      icon: Clock3,
    },
    {
      label: 'Affected users',
      value: snapshot.affectedUsers.toLocaleString('ru-RU'),
      note: 'за последние 15 минут',
      icon: Activity,
    },
    {
      label: 'Healthy services',
      value: `${healthy} / ${snapshot.services.length}`,
      note: '2 critical · 1 degraded',
      icon: CheckCircle2,
    },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="border-white/6 bg-panel ring-0">
          <CardHeader>
            <CardDescription className="font-mono text-[11px] uppercase tracking-[0.13em]">
              {metric.label}
            </CardDescription>
            <CardAction className="grid size-8 place-items-center rounded-md bg-white/5 text-muted-foreground">
              <metric.icon className="size-4" />
            </CardAction>
            <CardTitle className="text-2xl font-semibold text-white">
              {metric.value}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {metric.note}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Topology({ services }: { services: Service[] }) {
  const byId = new Map(services.map((service) => [service.id, service]));
  const edges = services.flatMap((service) =>
    service.dependencies.map((dependency) => ({
      from: service,
      to: byId.get(dependency),
    })),
  );
  return (
    <Card className="border-white/6 bg-panel ring-0">
      <CardHeader className="border-b border-white/6">
        <CardTitle>Карта зависимостей</CardTitle>
        <CardDescription>Путь деградации в платёжном контуре</CardDescription>
        <CardAction>
          <Badge
            variant="outline"
            className="border-white/10 font-mono text-muted-foreground"
          >
            {services.length} services
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="relative h-[360px] overflow-hidden rounded-lg border border-white/6 bg-grid">
          <svg
            className="absolute inset-0 h-full w-full"
            aria-label="Граф зависимостей сервисов"
          >
            {edges.map(({ from, to }) =>
              to ? (
                <line
                  key={`${from.id}-${to.id}`}
                  x1={`${from.x}%`}
                  y1={`${from.y}%`}
                  x2={`${to.x}%`}
                  y2={`${to.y}%`}
                  className={
                    from.status === 'critical'
                      ? 'stroke-critical/55'
                      : from.status === 'degraded'
                        ? 'stroke-warning/45'
                        : 'stroke-white/12'
                  }
                  strokeWidth="1.5"
                />
              ) : null,
            )}
          </svg>
          {services.map((service) => (
            <div
              key={service.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${service.x}%`, top: `${service.y}%` }}
            >
              <div
                className={`rounded-lg border px-3 py-2 shadow-xl backdrop-blur ${
                  service.status === 'critical'
                    ? 'border-critical/45 bg-critical/12 text-critical'
                    : service.status === 'degraded'
                      ? 'border-warning/45 bg-warning/10 text-warning'
                      : 'border-white/10 bg-surface/90 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-current" />
                  <span className="font-mono text-xs">{service.name}</span>
                </div>
                <p className="mt-1 font-mono text-[9px] opacity-60">
                  {service.latencyMs}ms · {service.errorRate}% err
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Timeline({ incident }: { incident: Incident }) {
  return (
    <Card className="border-white/6 bg-panel ring-0">
      <CardHeader className="border-b border-white/6">
        <CardTitle>Incident timeline</CardTitle>
        <CardDescription>
          Автоматические сигналы и действия команды
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-0">
        {incident.timeline.map((event, index) => (
          <div
            key={event.id}
            className="relative grid grid-cols-[72px_18px_1fr] gap-2 pb-6 last:pb-0"
          >
            <time className="font-mono text-[11px] text-muted-foreground">
              {formatTime(event.at)}
            </time>
            <div className="relative flex justify-center">
              <span
                className={`relative z-10 mt-1 size-2 rounded-full ${
                  event.type === 'alert'
                    ? 'bg-critical shadow-[0_0_14px_var(--critical)]'
                    : event.type === 'deploy' || event.type === 'metric'
                      ? 'bg-warning'
                      : 'bg-primary'
                }`}
              />
              {index < incident.timeline.length - 1 && (
                <span className="absolute top-3 h-[calc(100%+12px)] w-px bg-white/8" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                {event.title}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {event.description}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Overview({
  snapshot,
  incident,
}: {
  snapshot: Snapshot;
  incident: Incident;
}) {
  const queryClient = useQueryClient();
  const acknowledge = useMutation({
    mutationFn: () => acknowledgeIncident(incident.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['incidents'] });
      const previous = queryClient.getQueryData<Incident[]>(['incidents']);
      queryClient.setQueryData<Incident[]>(['incidents'], (current) =>
        current?.map((item) =>
          item.id === incident.id
            ? { ...item, acknowledged: true, commander: 'Илья Тунис' }
            : item,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous)
        queryClient.setQueryData(['incidents'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['incidents'] }),
  });

  return (
    <>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2">
            {severityBadge(incident.severity)}
            <span className="font-mono text-xs text-muted-foreground">
              {incident.id}
            </span>
            {incident.acknowledged && (
              <Badge
                variant="outline"
                className="border-primary/20 text-primary"
              >
                acknowledged
              </Badge>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] md:text-4xl">
            {incident.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {incident.summary}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="h-8 border-white/10 bg-white/3 px-3"
          >
            {incident.commander ?? 'Командир не назначен'}
          </Badge>
          <Button
            className="bg-critical text-white hover:bg-critical/80"
            disabled={incident.acknowledged || acknowledge.isPending}
            onClick={() => acknowledge.mutate()}
          >
            {incident.acknowledged ? 'Инцидент принят' : 'Признать инцидент'}
          </Button>
        </div>
      </div>
      <div className="mt-6">
        <MetricCards snapshot={snapshot} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.7fr)]">
        <Topology services={snapshot.services} />
        <Timeline incident={incident} />
      </div>
    </>
  );
}

function IncidentsTable({ incidents }: { incidents: Incident[] }) {
  const selectIncident = useIncidentCanvasStore(
    (state) => state.selectIncident,
  );
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'severity', desc: false },
    { id: 'startedAt', desc: true },
  ]);
  const columns = useMemo(
    () =>
      incidentColumn.columns([
        incidentColumn.accessor('severity', {
          header: 'Severity',
          sortFn: (a, b) =>
            severityOrder[a.original.severity] -
            severityOrder[b.original.severity],
          cell: ({ row }) => severityBadge(row.original.severity),
        }),
        incidentColumn.accessor('title', {
          header: 'Инцидент',
          cell: ({ row }) => (
            <Button
              variant="link"
              className="h-auto justify-start px-0 text-left"
              onClick={() => selectIncident(row.original.id)}
            >
              <span>
                <span className="block font-medium text-foreground">
                  {row.original.title}
                </span>
                <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                  {row.original.id}
                </span>
              </span>
            </Button>
          ),
        }),
        incidentColumn.accessor('rootService', {
          header: 'Root service',
          cell: ({ getValue }) => (
            <span className="font-mono text-xs">{String(getValue())}</span>
          ),
        }),
        incidentColumn.accessor('status', {
          header: 'Статус',
          cell: ({ row }) => (
            <Badge variant="secondary">
              {statusLabels[row.original.status]}
            </Badge>
          ),
        }),
        incidentColumn.accessor('affectedUsers', {
          header: 'Пользователи',
          cell: ({ getValue }) => Number(getValue()).toLocaleString('ru-RU'),
        }),
        incidentColumn.accessor('startedAt', {
          header: 'Начало',
          cell: ({ getValue }) => (
            <span className="font-mono text-xs">
              {formatDate(String(getValue()))}
            </span>
          ),
        }),
      ]),
    [selectIncident],
  );
  const table = useTable({
    features: incidentTableFeatures,
    data: incidents,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <Card className="border-white/6 bg-panel ring-0">
      <CardHeader className="border-b border-white/6">
        <CardTitle>История инцидентов</CardTitle>
        <CardDescription>
          Сортировка, статус и переход в command center
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <table.FlexRender header={header} />
                        {header.column.getCanSort() && (
                          <ArrowDownUp data-icon="inline-end" />
                        )}
                      </Button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function logLevelClass(level: LogLevel): string {
  if (level === 'error') return 'text-critical';
  if (level === 'warn') return 'text-warning';
  if (level === 'debug') return 'text-violet-300';
  return 'text-primary';
}

function VirtualLogs({
  logs,
  services,
}: {
  logs: LogEntry[];
  services: Service[];
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const {
    logQuery,
    logLevel,
    serviceFilter,
    setLogQuery,
    setLogLevel,
    setServiceFilter,
  } = useIncidentCanvasStore();
  const filtered = useMemo(
    () => filterLogs(logs, logQuery, logLevel, serviceFilter),
    [logs, logLevel, logQuery, serviceFilter],
  );
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34,
    overscan: 16,
  });

  return (
    <Card className="border-white/6 bg-panel ring-0">
      <CardHeader className="border-b border-white/6">
        <CardTitle>Live logs</CardTitle>
        <CardDescription>
          {filtered.length.toLocaleString('ru-RU')} строк после фильтрации
        </CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <div className="relative w-52">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Поиск по логам"
              value={logQuery}
              onChange={(event) => setLogQuery(event.target.value)}
              placeholder="message, trace, service"
              className="pl-8 font-mono text-xs"
            />
          </div>
          <NativeSelect
            aria-label="Уровень логов"
            value={logLevel}
            onChange={(event) =>
              setLogLevel(event.target.value as LogLevel | 'all')
            }
          >
            <NativeSelectOption value="all">Все уровни</NativeSelectOption>
            <NativeSelectOption value="error">error</NativeSelectOption>
            <NativeSelectOption value="warn">warn</NativeSelectOption>
            <NativeSelectOption value="info">info</NativeSelectOption>
            <NativeSelectOption value="debug">debug</NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            aria-label="Сервис"
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
          >
            <NativeSelectOption value="">Все сервисы</NativeSelectOption>
            {services.map((service) => (
              <NativeSelectOption key={service.id} value={service.name}>
                {service.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2">
        <div className="mb-1 grid grid-cols-[92px_58px_120px_78px_minmax(260px,1fr)_70px] gap-2 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <span>time</span>
          <span>level</span>
          <span>service</span>
          <span>trace</span>
          <span>message</span>
          <span className="text-right">duration</span>
        </div>
        <div
          ref={parentRef}
          className="h-[580px] overflow-auto rounded-md border border-white/6 bg-background/45"
        >
          <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const entry = filtered[item.index];
              return (
                <div
                  key={entry.id}
                  className="absolute left-0 top-0 grid w-full grid-cols-[92px_58px_120px_78px_minmax(260px,1fr)_70px] gap-2 border-b border-white/4 px-2 py-2 font-mono text-[11px] hover:bg-white/3"
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  <span className="text-muted-foreground">
                    {formatTime(entry.at)}
                  </span>
                  <span className={logLevelClass(entry.level)}>
                    {entry.level}
                  </span>
                  <span className="truncate text-slate-300">
                    {entry.service}
                  </span>
                  <span className="text-violet-300">{entry.traceId}</span>
                  <span className="truncate text-slate-400">
                    {entry.message}
                  </span>
                  <span className="text-right text-muted-foreground">
                    {entry.durationMs === null ? '—' : `${entry.durationMs}ms`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CommandMenu() {
  const { commandOpen, setCommandOpen, setView } = useIncidentCanvasStore();
  const actions: {
    label: string;
    description: string;
    view: View;
    icon: typeof Activity;
  }[] = [
    {
      label: 'Открыть command center',
      description: 'Активный инцидент и topology',
      view: 'overview',
      icon: Activity,
    },
    {
      label: 'Показать инциденты',
      description: 'Сортируемая таблица истории',
      view: 'incidents',
      icon: ShieldAlert,
    },
    {
      label: 'Открыть live logs',
      description: 'Виртуализированный поток логов',
      view: 'logs',
      icon: TerminalSquare,
    },
  ];
  return (
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent className="border border-white/8 bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Командная строка</DialogTitle>
          <DialogDescription>
            Быстрый переход между рабочими поверхностями.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          {actions.map((action) => (
            <Button
              key={action.view}
              variant="ghost"
              className="h-auto w-full justify-start px-3 py-3 text-left"
              onClick={() => {
                setView(action.view);
                setCommandOpen(false);
              }}
            >
              <action.icon className="size-4 text-primary" />
              <span>
                <span className="block text-sm font-medium">
                  {action.label}
                </span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {action.description}
                </span>
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function IncidentCanvasApp() {
  const queryClient = useQueryClient();
  const {
    view,
    selectedIncidentId,
    logQuery,
    logLevel,
    serviceFilter,
    setCommandOpen,
    setView,
  } = useIncidentCanvasStore();
  const [live, setLive] = useState(false);
  const snapshot = useQuery({ queryKey: ['snapshot'], queryFn: fetchSnapshot });
  const incidents = useQuery({
    queryKey: ['incidents'],
    queryFn: fetchIncidents,
  });
  const logs = useQuery({
    queryKey: ['logs'],
    queryFn: fetchLogs,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    const stop = subscribeTelemetry(() => {
      setLive(true);
      void queryClient.invalidateQueries({ queryKey: ['snapshot'] });
    });
    const ready = window.setTimeout(() => setLive(true), 400);
    return () => {
      stop();
      window.clearTimeout(ready);
    };
  }, [queryClient]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setCommandOpen]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('view', view);
    if (view === 'logs') {
      if (logQuery) params.set('q', logQuery);
      if (logLevel !== 'all') params.set('level', logLevel);
      if (serviceFilter) params.set('service', serviceFilter);
    }
    window.history.replaceState(null, '', `?${params}`);
  }, [logLevel, logQuery, serviceFilter, view]);

  const activeIncident =
    incidents.data?.find((incident) => incident.id === selectedIncidentId) ??
    incidents.data?.[0];
  const error = snapshot.error ?? incidents.error ?? logs.error;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader live={live} />
      <div className="mx-auto max-w-[1600px] p-4 lg:p-7">
        <div className="mb-4 flex gap-2 overflow-x-auto md:hidden">
          {(['overview', 'incidents', 'logs'] as View[]).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={view === item ? 'secondary' : 'outline'}
              onClick={() => setView(item)}
            >
              {item === 'overview'
                ? 'Center'
                : item === 'incidents'
                  ? 'Инциденты'
                  : 'Logs'}
            </Button>
          ))}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-5">
            <AlertCircle />
            <AlertTitle>Не удалось получить telemetry snapshot</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {(!snapshot.data || !incidents.data || !logs.data) && !error ? (
          <div className="grid gap-4">
            <Skeleton className="h-24 bg-panel" />
            <Skeleton className="h-[520px] bg-panel" />
          </div>
        ) : snapshot.data && incidents.data && logs.data && activeIncident ? (
          <>
            {view === 'overview' && (
              <Overview snapshot={snapshot.data} incident={activeIncident} />
            )}
            {view === 'incidents' && (
              <IncidentsTable incidents={incidents.data} />
            )}
            {view === 'logs' && (
              <VirtualLogs logs={logs.data} services={snapshot.data.services} />
            )}
          </>
        ) : null}
      </div>
      <Button
        variant="outline"
        className="fixed bottom-5 right-5 hidden border-white/10 bg-surface/90 text-muted-foreground shadow-2xl backdrop-blur md:flex"
        onClick={() => setCommandOpen(true)}
      >
        <Command data-icon="inline-start" />{' '}
        <span className="font-mono">⌘ K</span>
      </Button>
      <CommandMenu />
    </main>
  );
}
