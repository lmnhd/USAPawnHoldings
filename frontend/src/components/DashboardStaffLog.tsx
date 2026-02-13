'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface StaffEntry {
  log_id: string;
  staff_name: string;
  event_type: 'clock_in' | 'clock_out' | 'in' | 'out';
  timestamp: string;
  location?: string;
  shift_duration?: number | null;
  notes?: string;
}

interface DashboardStaffLogProps {
  staffLog: StaffEntry[];
  loading?: boolean;
}

function isClockIn(entry: StaffEntry): boolean {
  return entry.event_type === 'clock_in' || entry.event_type === 'in';
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Calculate running duration from clock-in time to now, in seconds */
function runningSeconds(clockInTime: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(clockInTime).getTime()) / 1000));
}

function RunningTimer({ clockInTime }: { clockInTime: string }) {
  const [elapsed, setElapsed] = useState(() => runningSeconds(clockInTime));

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(runningSeconds(clockInTime));
    }, 60_000); // every 60s
    return () => clearInterval(id);
  }, [clockInTime]);

  return (
    <span className="font-mono text-xs text-vault-success whitespace-nowrap">
      {formatDuration(elapsed)}
    </span>
  );
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-16 rounded-full mx-auto" /></TableCell>
      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-14" /></TableCell>
      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-20" /></TableCell>
    </TableRow>
  );
}

export default function DashboardStaffLog({ staffLog, loading }: DashboardStaffLogProps) {
  // Derive which staff are on active shifts (clocked in but not out)
  const activeStaff = new Map<string, StaffEntry>();
  const sortedByTime = [...staffLog].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const entry of sortedByTime) {
    const key = entry.staff_name.toLowerCase();
    if (isClockIn(entry)) {
      activeStaff.set(key, entry);
    } else {
      activeStaff.delete(key);
    }
  }

  // Sort for display: active shifts first, then by most recent
  const displayEntries = [...staffLog]
    .sort((a, b) => {
      const aActive = activeStaff.has(a.staff_name.toLowerCase()) && isClockIn(a);
      const bActive = activeStaff.has(b.staff_name.toLowerCase()) && isClockIn(b);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })
    .slice(0, 10);

  if (!loading && displayEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-4" aria-hidden="true">🕐</span>
        <h3 className="font-display text-lg text-vault-text-light mb-2">No staff activity today</h3>
        <p className="text-sm text-vault-text-muted font-body max-w-xs">
          Clock-in and clock-out events will appear here once staff begin their shifts.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-vault-gold/10">
      <Table className="w-full text-left">
        <TableHeader>
          <TableRow className="border-b border-vault-gold/10 bg-vault-surface hover:bg-vault-surface">
            <TableHead className="px-4 py-3 text-xs font-body font-semibold text-vault-text-muted uppercase tracking-wider">
              Name
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-body font-semibold text-vault-text-muted uppercase tracking-wider text-center">
              Status
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-body font-semibold text-vault-text-muted uppercase tracking-wider">
              Time
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-body font-semibold text-vault-text-muted uppercase tracking-wider">
              Duration
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-body font-semibold text-vault-text-muted uppercase tracking-wider">
              Location
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-vault-gold/5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            : displayEntries.map((entry, idx) => {
                const staffKey = entry.staff_name.toLowerCase();
                const isActive = activeStaff.has(staffKey) && isClockIn(entry);

                return (
                  <TableRow
                    key={entry.log_id}
                    className={`transition-colors ${
                      idx % 2 === 0 ? 'bg-vault-surface-elevated/50' : 'bg-vault-surface-elevated/20'
                    } ${isActive ? 'border-l-2 border-l-vault-success' : ''}`}
                  >
                    {/* Name */}
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <span className="inline-block w-2 h-2 rounded-full bg-vault-success animate-pulse flex-shrink-0" />
                        )}
                        <span className="font-body text-sm font-medium text-vault-gold truncate">
                          {entry.staff_name}
                        </span>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-4 py-3 text-center">
                      {isActive ? (
                        <Badge variant="secondary" className="inline-flex items-center gap-1 text-xs font-mono bg-vault-success/15 text-vault-success px-2 py-0.5 rounded-full">
                          🟢 Active
                        </Badge>
                      ) : isClockIn(entry) ? (
                        <Badge variant="secondary" className="inline-flex items-center gap-1 text-xs font-mono bg-vault-text-muted/15 text-vault-text-muted px-2 py-0.5 rounded-full">
                          ⚪ Off
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="inline-flex items-center gap-1 text-xs font-mono bg-vault-text-muted/15 text-vault-text-muted px-2 py-0.5 rounded-full">
                          ⚪ Off
                        </Badge>
                      )}
                    </TableCell>

                    {/* Time */}
                    <TableCell className="px-4 py-3">
                      <span className="font-mono text-xs text-vault-text-light">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </TableCell>

                    {/* Duration */}
                    <TableCell className="px-4 py-3">
                      {isActive ? (
                        <RunningTimer clockInTime={entry.timestamp} />
                      ) : entry.shift_duration != null && entry.shift_duration > 0 ? (
                        <span className="font-mono text-xs text-vault-text-muted">
                          {formatDuration(entry.shift_duration)}
                        </span>
                      ) : (
                        <span className="text-xs text-vault-text-muted">—</span>
                      )}
                    </TableCell>

                    {/* Location */}
                    <TableCell className="px-4 py-3">
                      <span className="text-xs font-body text-vault-text-muted truncate block max-w-[120px]">
                        {entry.location ?? '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
    </div>
  );
}
