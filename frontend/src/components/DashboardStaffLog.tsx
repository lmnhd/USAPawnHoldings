'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  onForceClockOut?: (staffName: string) => Promise<void>;
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
      <TableCell className="px-4 py-3"><Skeleton className="w-24 h-4" /></TableCell>
      <TableCell className="px-4 py-3"><Skeleton className="w-32 h-4 mx-auto rounded-lg" /></TableCell>
      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-14" /></TableCell>
      <TableCell className="px-4 py-3"><Skeleton className="w-12 h-4" /></TableCell>
      <TableCell className="px-4 py-3"><Skeleton className="w-20 h-4" /></TableCell>
      <TableCell className="px-4 py-3"><Skeleton className="w-24 h-4" /></TableCell>
    </TableRow>
  );
}

export default function DashboardStaffLog({ staffLog, loading, onForceClockOut }: DashboardStaffLogProps) {
  const [forcingOut, setForcingOut] = useState<string | null>(null);

  // Build a map of staff members to their latest entry (current status)
  // This shows ONE row per staff member, not duplicates for clock-in and out
  const staffStatusMap = new Map<string, StaffEntry>();
  const sortedByTime = [...staffLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  for (const entry of sortedByTime) {
    const key = entry.staff_name.toLowerCase();
    if (!staffStatusMap.has(key)) {
      staffStatusMap.set(key, entry);
    }
  }

  // Convert to array and sort: active (clocked in) first, then by most recent
  const displayEntries = Array.from(staffStatusMap.values())
    .sort((a, b) => {
      const aActive = isClockIn(a);
      const bActive = isClockIn(b);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })
    .slice(0, 15);

  if (!loading && displayEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="mb-4 text-4xl" aria-hidden="true">🕐</span>
        <h3 className="mb-2 text-lg font-display text-vault-text-light">No staff activity today</h3>
        <p className="max-w-xs text-sm text-vault-text-muted font-body">
          Clock-in and clock-out events will appear here once staff begin their shifts.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-20 overflow-x-auto border rounded-xl border-vault-gold/15 dashboard-card">
      <Table className="w-full text-left">
        <TableHeader>
          <TableRow className="border-b border-vault-gold/20 bg-gradient-to-r from-vault-surface/60 to-vault-surface/40 hover:bg-gradient-to-r hover:from-vault-surface/70 hover:to-vault-surface/50">
            <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase font-body text-vault-text-muted">
              Name
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider text-center uppercase font-body text-vault-text-muted">
              Status
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase font-body text-vault-text-muted">
              Time
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase font-body text-vault-text-muted">
              Duration
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider uppercase font-body text-vault-text-muted">
              Location
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold tracking-wider text-right uppercase font-body text-vault-text-muted">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-vault-gold/10">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            : displayEntries.map((entry) => {
                const isActive = isClockIn(entry);

                return (
                  <TableRow
                    key={`${entry.staff_name}-status`}
                    className={`transition-colors ${
                      isActive 
                        ? 'bg-gradient-to-r from-vault-success/12 to-transparent border-l-4 border-l-vault-success hover:from-vault-success/18 hover:to-transparent' 
                        : 'bg-vault-surface-elevated/10 border-l-4 border-l-vault-text-muted/20 hover:bg-vault-surface-elevated/20'
                    }`}
                  >
                    {/* Name */}
                    <TableCell className="px-4 py-4">
                      <span className="text-sm font-semibold font-body text-vault-text-light">
                        {entry.staff_name}
                      </span>
                    </TableCell>

                    {/* Status Badge — LARGE, COLOR-CODED */}
                    <TableCell className="px-4 py-4 text-center">
                      {isActive ? (
                        <Badge 
                          variant="secondary" 
                          className="inline-flex items-center gap-2 text-sm font-bold bg-vault-success/20 text-vault-success px-3 py-1.5 rounded-lg border border-vault-success/40 whitespace-nowrap"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-vault-success animate-pulse" />
                          Clocked In
                        </Badge>
                      ) : (
                        <Badge 
                          variant="secondary" 
                          className="inline-flex items-center gap-2 text-sm font-bold bg-vault-text-muted/15 text-vault-text-muted px-3 py-1.5 rounded-lg border border-vault-text-muted/20 whitespace-nowrap"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-vault-text-muted" />
                          Clocked Out
                        </Badge>
                      )}
                    </TableCell>

                    {/* Time (most recent clock event) */}
                    <TableCell className="px-4 py-4">
                      <span className="font-mono text-xs text-vault-text-light">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </TableCell>

                    {/* Duration (current shift or last shift) */}
                    <TableCell className="px-4 py-4">
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
                    <TableCell className="px-4 py-4">
                      <span className="text-xs font-body text-vault-text-muted truncate block max-w-[120px]">
                        {entry.location ?? '—'}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-4 py-4 text-right">
                      {isActive && onForceClockOut && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (forcingOut === entry.staff_name) return;
                            setForcingOut(entry.staff_name);
                            try {
                              await onForceClockOut(entry.staff_name);
                            } catch (err) {
                              console.error('Force clock-out failed:', err);
                            } finally {
                              setForcingOut(null);
                            }
                          }}
                          disabled={forcingOut === entry.staff_name}
                          className="px-2 py-1 text-xs font-body h-7 border-vault-red/30 text-vault-red hover:bg-vault-red/10 hover:text-vault-red disabled:opacity-50"
                        >
                          {forcingOut === entry.staff_name ? (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Clocking Out...
                            </span>
                          ) : (
                            'Force Clock-out'
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
    </div>
  );
}
