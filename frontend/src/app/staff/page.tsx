'use client';

import { useState, useEffect, useCallback } from 'react';
import StaffShiftView, { type ShiftData } from '@/components/StaffShiftView';
import QueueManager, { type QueueItem } from '@/components/QueueManager';
import ItemEntryForm from '@/components/ItemEntryForm';
import StaffInventoryManager from '@/components/StaffInventoryManager';
import PriceLookupTool from '@/components/PriceLookupTool';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type LeadRecord = {
  lead_id: string;
  appointment_id?: string;
  customer_name?: string;
  scheduled_time?: string;
  appointment_time?: string;
  preferred_time?: string;
  item_description?: string;
  item_interest?: string;
  estimated_value?: number;
  source?: string;
  status?: string;
  type?: string;
};

/* ------------------------------------------------------------------
   Staff Portal Page (auth-gated via middleware)
   ------------------------------------------------------------------ */
export default function StaffPage() {
  const [staffName, setStaffName] = useState<string>('');
  const [activeShift, setActiveShift] = useState<ShiftData | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(true);
  const [showPriceLookup, setShowPriceLookup] = useState(false);
  const [showItemEntry, setShowItemEntry] = useState(false);
  const [showInventoryManager, setShowInventoryManager] = useState(false);
  const [availableStaff, setAvailableStaff] = useState<Array<{ name: string; pin: string }>>([]);
  const isClockedIn = Boolean(activeShift);

  /* ----------------------------------------------------------------
     Data fetching
     ---------------------------------------------------------------- */
  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);

      const [staffRes, leadsRes] = await Promise.all([
        fetch(`/api/staff-log?date=${today}`),
        fetch(`/api/leads?limit=200`),
      ]);

      // Process staff log — find active shift
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        const logs: Array<{
          log_id: string;
          staff_name: string;
          event_type: string;
          timestamp: string;
          shift_duration: number | null;
          location?: string;
        }> = staffData.logs ?? [];

        // Find most recent active shift (clock-in without subsequent clock-out)
        const byStaff = new Map<string, typeof logs[0]>();
        const sorted = [...logs].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        for (const entry of sorted) {
          const key = entry.staff_name.toLowerCase();
          if (entry.event_type === 'in' || entry.event_type === 'clock_in') {
            byStaff.set(key, entry);
          } else if (entry.event_type === 'out' || entry.event_type === 'clock_out') {
            byStaff.delete(key);
          }
        }

        // Pick the first active shift found (in a real app, this would be keyed to the logged-in user)
        const activeEntries = Array.from(byStaff.values());
        if (activeEntries.length > 0) {
          const active = activeEntries[0];
          setActiveShift({
            log_id: active.log_id,
            staff_name: active.staff_name,
            clock_in_time: active.timestamp,
            shift_duration: 0,
            location: active.location,
          });
          setStaffName(active.staff_name);
        } else {
          setActiveShift(null);
          // Derive name from most recent log entry
          if (logs.length > 0) {
            setStaffName(logs[0].staff_name);
          }
        }
      }
      setShiftLoading(false);

      // Process leads/queue
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        const rawLeads = (leadsData.leads ?? []) as LeadRecord[];
        const leads: QueueItem[] = rawLeads
          .filter((l) => {
            const type = String(l.type ?? '').toLowerCase();
            const hasAppointmentShape = type === 'appointment' || !!l.appointment_id || !!l.scheduled_time || !!l.preferred_time;
            if (!hasAppointmentShape) return false;

            const status = String(l.status ?? '').toLowerCase();
            return !['completed', 'cancelled', 'no-show', 'rejected', 'closed'].includes(status);
          })
          .map((l) => ({
          lead_id: l.lead_id,
          appointment_id: l.appointment_id,
          customer_name: l.customer_name ?? 'Walk-in',
          appointment_time: l.scheduled_time ?? l.appointment_time ?? l.preferred_time,
          item_description: l.item_description ?? l.item_interest ?? '',
          estimated_value: l.estimated_value,
          source: l.source ?? 'appointment',
          status: l.status ?? 'pending',
        }));
        setQueue(leads);
      }
      setQueueLoading(false);
    } catch (err) {
      console.error('Failed to fetch staff data:', err);
      setShiftLoading(false);
      setQueueLoading(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch available staff on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/staff-log?action=list-staff');
        if (res.ok) {
          const data = await res.json();
          setAvailableStaff(data.staff ?? []);
        }
      } catch (err) {
        console.error('Failed to fetch available staff:', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isClockedIn) {
      setShowPriceLookup(false);
      setShowItemEntry(false);
      setShowInventoryManager(false);
    }
  }, [isClockedIn]);

  /* ----------------------------------------------------------------
     Clock action handler
     ---------------------------------------------------------------- */
  const handleClockAction = useCallback(async (action: 'clock_in' | 'clock_out', pin: string) => {
    const name = staffName || 'Staff';

    const res = await fetch('/api/staff-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_name: name,
        pin,
        event_type: action === 'clock_in' ? 'in' : 'out',
        location: 'staff_portal',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      // API returns 401 for invalid PIN, 400 for bad request, 500 for server error
      throw new Error(data?.error ?? 'Clock action failed');
    }

    // Success - refresh data to show updated shift status
    await fetchData();
  }, [staffName, fetchData]);

  /* ----------------------------------------------------------------
     Mark queue item complete
     ---------------------------------------------------------------- */
  const handleMarkComplete = async (item: QueueItem) => {
    try {
      if (item.appointment_id) {
        await fetch('/api/schedule', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointment_id: item.appointment_id, status: 'completed' }),
        });
      } else {
        await fetch('/api/leads', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead_id: item.lead_id, status: 'completed' }),
        });
      }
      setQueue((prev) => prev.filter((queueItem) => queueItem.lead_id !== item.lead_id));
    } catch (err) {
      console.error('Failed to mark lead complete:', err);
    }
  };

  /* ----------------------------------------------------------------
     Render
     ---------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-vault-black-deep">
      {/* Header */}
      <div className="border-b border-vault-gold/10 bg-vault-surface-elevated/50">
        <div className="max-w-4xl mx-auto px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xl" aria-hidden="true">👔</span>
                <h1 className="font-display text-2xl font-bold text-vault-text-light">
                  Staff Portal
                </h1>
              </div>
              {staffName && (
                <p className="text-sm font-body text-vault-text-muted ml-9">
                  Welcome, <span className="text-vault-gold font-medium">{staffName}</span>
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-mono text-xs text-vault-text-muted">
                {new Date().toLocaleDateString([], {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Staff Name Input (if no active shift detected) */}
        {!loading && !activeShift && !staffName && (
          <Card className="rounded-xl border-vault-gold/15 bg-vault-surface-elevated">
            <CardContent className="p-5">
              <Label className="block text-xs font-body font-medium text-vault-text-muted uppercase tracking-wider mb-2">
                Select Your Name
              </Label>
              {availableStaff.length > 0 ? (
                <Select value={staffName} onValueChange={setStaffName}>
                  <SelectTrigger className="w-full px-4 py-3 rounded-xl bg-vault-surface border-vault-gold/15 text-vault-text-light font-body focus:outline-none focus:border-vault-gold/50 transition-colors">
                    <SelectValue placeholder="-- Choose your name --" />
                  </SelectTrigger>
                  <SelectContent className="bg-vault-surface border-vault-gold/15">
                    {availableStaff.map((staff) => (
                      <SelectItem key={staff.name} value={staff.name} className="text-vault-text-light font-body hover:bg-vault-gold/10">
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Enter your name to get started"
                  className="w-full px-4 py-3 rounded-xl bg-vault-surface border-vault-gold/15 text-vault-text-light font-body placeholder-vault-text-muted/50 focus:outline-none focus:border-vault-gold/50 transition-colors"
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Shift View */}
        <StaffShiftView
          shift={activeShift}
          onClockAction={handleClockAction}
          loading={shiftLoading}
          staffName={staffName}
        />

        {/* Quick Actions */}
        <div>
          <h2 className="font-display text-lg font-bold text-vault-text-light mb-3">
            Quick Actions
          </h2>
          {!isClockedIn && (
            <p className="mb-3 text-xs font-body text-vault-text-muted">
              Clock in to enable quick actions.
            </p>
          )}
          <div className="grid grid-cols-4 gap-3">
            <QuickActionCard
              icon="📦"
              label="Add Item"
              description="Log new item"
              disabled={!isClockedIn}
              onClick={() => {
                setShowItemEntry(true);
                setShowInventoryManager(false);
              }}
            />
            <QuickActionCard
              icon="🗂️"
              label="Manage Inventory"
              description="View & delete items"
              disabled={!isClockedIn}
              onClick={() => {
                setShowInventoryManager(true);
                setShowItemEntry(false);
              }}
            />
            <QuickActionCard
              icon="💰"
              label="Price Lookup"
              description="Check gold prices"
              disabled={!isClockedIn}
              onClick={() => {
                setShowPriceLookup(true);
                setShowItemEntry(false);
                setShowInventoryManager(false);
              }}
            />
            <QuickActionCard
              icon="📋"
              label="Queue"
              description="View appointments"
              disabled={!isClockedIn}
              onClick={() => {
                setShowItemEntry(false);
                setShowInventoryManager(false);
                document.getElementById('queue-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>
        </div>

        {/* Price Lookup Tool */}
        {isClockedIn && showPriceLookup && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-vault-text-light">
                💰 Price Lookup
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPriceLookup(false)}
                className="border-vault-gold/15 text-vault-text-light hover:bg-vault-hover-overlay"
              >
                Close
              </Button>
            </div>
            <PriceLookupTool onClose={() => setShowPriceLookup(false)} />
          </div>
        )}

        {/* Item Entry Form */}
        {isClockedIn && showItemEntry && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-vault-text-light">
                📦 Add New Item
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowItemEntry(false)}
                className="border-vault-gold/15 text-vault-text-light hover:bg-vault-hover-overlay"
              >
                Close
              </Button>
            </div>
            <ItemEntryForm
              onClose={() => setShowItemEntry(false)}
              onSuccess={(item) => {
                console.log('New item added:', item);
                setShowItemEntry(false);
              }}
            />
          </div>
        )}

        {/* Inventory Manager */}
        {isClockedIn && showInventoryManager && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-vault-text-light">
                🗂️ Manage Inventory
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInventoryManager(false)}
                className="border-vault-gold/15 text-vault-text-light hover:bg-vault-hover-overlay"
              >
                Close
              </Button>
            </div>
            <StaffInventoryManager staffName={staffName} />
          </div>
        )}

        {/* Queue Manager */}
        <div id="queue-section">
          <QueueManager
            queue={queue}
            loading={queueLoading}
            onMarkComplete={handleMarkComplete}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Quick Action Card
   ------------------------------------------------------------------ */
interface QuickActionCardProps {
  icon: string;
  label: string;
  description: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}

function QuickActionCard({ icon, label, description, href, onClick, disabled = false }: QuickActionCardProps) {
  const content = (
    <>
      <span className="text-2xl mb-2 block" aria-hidden="true">{icon}</span>
      <span className="font-body font-semibold text-sm text-vault-text-light block">{label}</span>
      <span className="font-body text-[10px] text-vault-text-muted">{description}</span>
    </>
  );

  const classes = disabled
    ? "flex flex-col items-center justify-center p-4 rounded-xl border-vault-gold/10 bg-vault-surface-elevated opacity-50 cursor-not-allowed min-h-[100px] h-auto"
    : "flex flex-col items-center justify-center p-4 rounded-xl border-vault-gold/10 bg-vault-surface-elevated hover:border-vault-gold/30 hover:bg-vault-gold/5 transition-all duration-200 active:scale-95 cursor-pointer min-h-[100px] h-auto";

  if (href && !disabled) {
    return (
      <Button variant="outline" asChild className={classes}>
        <a href={href}>
          {content}
        </a>
      </Button>
    );
  }

  return (
    <Button variant="outline" onClick={onClick} className={classes} disabled={disabled}>
      {content}
    </Button>
  );
}
