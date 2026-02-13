'use client';

import { useState, useEffect } from 'react';
import ClockInButton from './ClockInButton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export interface ShiftData {
  log_id: string;
  staff_name: string;
  clock_in_time: string;
  shift_duration: number;
  location?: string;
}

interface StaffShiftViewProps {
  shift: ShiftData | null;
  onClockAction: (action: 'clock_in' | 'clock_out', pin: string) => Promise<void>;
  loading?: boolean;
  staffName?: string;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StaffShiftView({ shift, onClockAction, loading, staffName }: StaffShiftViewProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!shift) {
      setElapsed(0);
      return;
    }
    // Immediately compute elapsed
    const start = new Date(shift.clock_in_time).getTime();
    setElapsed(Math.floor((Date.now() - start) / 1000));

    const interval = setInterval(() => {
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [shift]);

  // Skeleton loader
  if (loading) {
    return (
      <Card className="border-vault-gold/15 bg-vault-surface-elevated">
        <CardContent className="p-6 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-3 h-3 rounded-full bg-vault-surface" />
            <Skeleton className="w-32 h-5 rounded bg-vault-surface" />
          </div>
          <Skeleton className="w-40 h-12 mb-3 rounded bg-vault-surface" />
          <Skeleton className="w-48 h-4 rounded bg-vault-surface" />
        </CardContent>
      </Card>
    );
  }

  // Not clocked in
  if (!shift) {
    return (
      <Card className="border-vault-gold/15 bg-vault-surface-elevated">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-3 h-3 rounded-full bg-vault-text-muted/40" />
            <span className="text-sm font-medium tracking-wider uppercase font-body text-vault-text-muted">
              Not Clocked In
            </span>
          </div>
          <p className="mb-6 text-sm text-vault-text-muted font-body">
            You are currently off the clock. Clock in to start your shift.
          </p>
          <ClockInButton
            action="clock_in"
            onSubmit={(pin) => onClockAction('clock_in', pin)}
            disabled={!staffName}
          />
        </CardContent>
      </Card>
    );
  }

  // Active shift
  const elapsedHours = elapsed / 3600;
  const isLongShift = elapsedHours >= 8;

  return (
    <Card className="border-vault-success/30 bg-vault-surface-elevated">
      <CardContent className="p-6">
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="relative flex w-3 h-3">
              <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-vault-success" />
              <span className="relative inline-flex w-3 h-3 rounded-full bg-vault-success" />
            </span>
            <Badge variant="secondary" className="text-sm font-semibold tracking-wider uppercase font-body text-vault-success bg-vault-success/15 hover:bg-vault-success/15 border-0">
              Active Shift
            </Badge>
          </div>
          <span className="text-xs font-body text-vault-text-muted">
            {shift.staff_name}
          </span>
        </div>

        {/* Timer */}
        <div className="mb-5">
          <p className={`font-mono text-5xl font-bold tracking-tight ${isLongShift ? 'text-vault-warning' : 'text-vault-gold'}`}>
            {formatDuration(elapsed)}
          </p>
          <p className="mt-1 text-sm text-vault-text-muted font-body">
            Clocked in at <span className="font-mono text-vault-text-light">{formatTime(shift.clock_in_time)}</span>
            {shift.location && (
              <> &middot; <span className="text-vault-gold/70">{shift.location}</span></>
            )}
          </p>
        </div>

        {/* Progress Bar (visual, based on 8h target) */}
        <div className="mb-6">
          <div className="flex justify-between mb-1 text-xs font-body text-vault-text-muted">
            <span>Shift Progress</span>
            <span className="font-mono">{Math.min(100, Math.round((elapsedHours / 8) * 100))}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-vault-surface">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                isLongShift ? 'bg-vault-warning' : 'bg-vault-gold'
              }`}
              style={{ width: `${Math.min(100, (elapsedHours / 8) * 100)}%` }}
            />
          </div>
        </div>

        {/* Clock Out Button */}
        <ClockInButton
          action="clock_out"
          onSubmit={(pin) => onClockAction('clock_out', pin)}
        />
      </CardContent>
    </Card>
  );
}
