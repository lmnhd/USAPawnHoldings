'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconChartBar,
  IconUsers,
  IconCoin,
  IconAntenna,
  IconClockHour4,
  IconMessage,
  IconRobot,
  IconLayoutDashboard,
  IconPhoto,
  IconTrash,
} from '@tabler/icons-react';
import ComplianceAlerts, { type ComplianceAlert } from '@/components/ComplianceAlerts';
import DashboardLeadFeed, { type Lead } from '@/components/DashboardLeadFeed';
import DashboardStaffLog, { type StaffEntry } from '@/components/DashboardStaffLog';
import DashboardChatHistory from '@/components/DashboardChatHistory';
import AgentConfigPanel from '@/components/AgentConfigPanel';
import DataManagementPanel from '@/components/DataManagementPanel';
import DashboardInventoryManager from '@/components/DashboardInventoryManager';
import StaffOnboarding from '@/components/StaffOnboarding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/* ------------------------------------------------------------------
   Bento Metric Skeletons — animated dashboard headers
   ------------------------------------------------------------------ */
const SkeletonLeadPulse = ({ value }: { value: string | number }) => {
  const widths = [70, 50, 85, 40, 65];
  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover="hover"
      className="flex flex-1 w-full h-full min-h-[5rem] flex-col justify-center gap-1.5 p-2"
    >
      <div className="mb-1 text-center">
        <span className="font-mono text-3xl font-bold text-vault-red">{value}</span>
      </div>
      {widths.map((w, i) => (
        <motion.div
          key={i}
          initial={{ width: 0 }}
          animate={{ width: `${w}%` }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="h-1.5 rounded-full bg-gradient-to-r from-vault-red/60 to-vault-red/20"
        />
      ))}
    </motion.div>
  );
};

const SkeletonStaffActive = ({ value }: { value: string | number }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="flex flex-1 w-full h-full min-h-[5rem] items-center justify-center"
    style={{ background: 'radial-gradient(circle at 50% 40%, rgba(46, 204, 113, 0.1), transparent 70%)' }}
  >
    <div className="text-center">
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="inline-block"
      >
        <span className="font-mono text-4xl font-bold text-vault-success">{value}</span>
      </motion.div>
      <div className="flex justify-center gap-2 mt-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, delay: i * 0.4, repeat: Infinity }}
            className="w-2.5 h-2.5 rounded-full bg-vault-success/60"
          />
        ))}
      </div>
    </div>
  </motion.div>
);

const SkeletonRevenue = ({ value }: { value: string }) => (
  <motion.div
    initial={{ backgroundPosition: '0 50%' }}
    animate={{ backgroundPosition: ['0 50%', '100% 50%', '0 50%'] }}
    transition={{ duration: 6, repeat: Infinity, repeatType: 'reverse' }}
    className="flex flex-1 w-full h-full min-h-[5rem] rounded-lg items-center justify-center"
    style={{
      background: 'linear-gradient(-45deg, rgba(201,168,76,0.15), rgba(13,13,13,0.8), rgba(201,168,76,0.1), rgba(26,26,26,0.9))',
      backgroundSize: '400% 400%',
    }}
  >
    <div className="text-center">
      <span className="font-mono text-3xl font-bold text-vault-gold">{value}</span>
      <p className="text-[10px] font-mono text-vault-gold/60 mt-2 uppercase tracking-widest">estimated today</p>
    </div>
  </motion.div>
);

/* ------------------------------------------------------------------
   Compliance alert derivation from staff log
   ------------------------------------------------------------------ */
function deriveComplianceAlerts(staffLog: StaffEntry[]): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = [];
  const clockIns = new Map<string, StaffEntry>();

  // Sort chronologically
  const sorted = [...staffLog].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const entry of sorted) {
    const key = entry.staff_name.toLowerCase();
    const isIn = entry.event_type === 'clock_in' || entry.event_type === 'in';
    const isOut = entry.event_type === 'clock_out' || entry.event_type === 'out';

    if (isIn) {
      // Check for double clock-in (suspicious)
      if (clockIns.has(key)) {
        alerts.push({
          alert_id: `suspicious-${entry.log_id}`,
          type: 'suspicious_pattern',
          staff_name: entry.staff_name,
          message: 'Multiple clock-in attempts detected without clock-out.',
          severity: 'warning',
          timestamp: entry.timestamp,
        });
      }
      clockIns.set(key, entry);
    } else if (isOut) {
      if (!clockIns.has(key)) {
        alerts.push({
          alert_id: `missed-${entry.log_id}`,
          type: 'missed_clockout',
          staff_name: entry.staff_name,
          message: 'Clock-out recorded without a matching clock-in.',
          severity: 'warning',
          timestamp: entry.timestamp,
        });
      }
      clockIns.delete(key);
    }
  }

  // Check for long shifts (active clock-ins > 10 hours)
  const now = Date.now();
  for (const [, entry] of clockIns) {
    const elapsed = now - new Date(entry.timestamp).getTime();
    const hours = elapsed / 3_600_000;
    if (hours >= 10) {
      const h = Math.floor(hours);
      const m = Math.floor((hours - h) * 60);
      alerts.push({
        alert_id: `long-shift-${entry.log_id}`,
        type: 'long_shift',
        staff_name: entry.staff_name,
        message: `Shift exceeds 10 hours (${h}h ${m}m) without clock-out.`,
        severity: 'critical',
        timestamp: entry.timestamp,
      });
    }
  }

  return alerts.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function formatDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------
   Dashboard Page
   ------------------------------------------------------------------ */
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-vault-black" />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staffLog, setStaffLog] = useState<StaffEntry[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [metrics, setMetrics] = useState({ leads: 0, staff: 0, revenue: 0 });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchDashboardData = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);

      const [leadsRes, staffRes] = await Promise.all([
        fetch(`/api/leads?limit=50`),
        fetch(`/api/staff-log?date=${today}`),
      ]);

      const leadsData = leadsRes.ok ? await leadsRes.json() : { leads: [], count: 0 };
      const staffData = staffRes.ok ? await staffRes.json() : { logs: [] };

      // Deduplicate by primary key to prevent duplicate entries in UI
      const rawLeads: Lead[] = leadsData.leads ?? [];
      const fetchedLeads = Array.from(
        new Map(rawLeads.map((l) => [l.lead_id, l])).values()
      );

      const rawStaff: StaffEntry[] = staffData.logs ?? staffData.staff_log ?? [];
      const fetchedStaff = Array.from(
        new Map(rawStaff.map((s) => [s.log_id, s])).values()
      );

      // Derive metrics
      const todayLeads = fetchedLeads.filter((l) => {
        const ts = l.created_at ?? l.timestamp ?? '';
        return ts.startsWith(today);
      });

      // Deduplicate by (customer_name + phone) for revenue calculation
      // This prevents counting the same customer twice if they have both an appraisal and appointment
      const uniqueCustomers = Array.from(
        new Map(
          todayLeads.map((l) => [
            `${(l.customer_name ?? '').toLowerCase()}|${l.phone ?? ''}`,
            l,
          ])
        ).values()
      );

      // Count active staff (clocked in but not out)
      const activeSet = new Map<string, boolean>();
      const sortedStaff = [...fetchedStaff].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      for (const entry of sortedStaff) {
        const key = entry.staff_name.toLowerCase();
        const isIn = entry.event_type === 'clock_in' || entry.event_type === 'in';
        if (isIn) {
          activeSet.set(key, true);
        } else {
          activeSet.delete(key);
        }
      }

      // Revenue from unique customers only (not double-counted)
      const revenue = uniqueCustomers.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
      const alerts = deriveComplianceAlerts(fetchedStaff);

      setLeads(fetchedLeads);
      setStaffLog(fetchedStaff);
      setComplianceAlerts(alerts);
      setMetrics({
        leads: uniqueCustomers.length,
        staff: activeSet.size,
        revenue,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  /* ----------------------------------------------------------------
     Force Clock-out Handler (for dashboard admin)
     ---------------------------------------------------------------- */
  const handleForceClockOut = useCallback(async (staffName: string) => {
    try {
      const res = await fetch('/api/staff-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_name: staffName,
          pin: '0000', // Admin override PIN
          event_type: 'out',
          location: 'dashboard_force',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? 'Force clock-out failed');
      }

      // Refresh dashboard data
      await fetchDashboardData();
    } catch (err) {
      console.error('Force clock-out error:', err);
      throw err;
    }
  }, [fetchDashboardData]);

  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'conversations' | 'agents' | 'inventory' | 'staff' | 'data-management'>('overview');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (
      tab === 'overview'
      || tab === 'leads'
      || tab === 'conversations'
      || tab === 'agents'
      || tab === 'inventory'
      || tab === 'staff'
      || tab === 'data-management'
    ) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const selectedLeadSource = String(selectedLead?.source ?? selectedLead?.source_channel ?? 'web');
  const selectedLeadMethod = String(selectedLead?.contact_method ?? 'web');
  const selectedLeadAppointmentTime =
    selectedLead?.scheduled_time ?? selectedLead?.appointment_time ?? selectedLead?.preferred_time;
  const selectedLeadCreated = selectedLead?.created_at ?? selectedLead?.timestamp;

  return (
    <div className="min-h-[calc(100vh-8rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-wide font-display md:text-4xl text-vault-gold">
            <span>
              {/* <Image src="/logo-symbol-2.png" alt="USA Pawn Holdings Logo" width={48} height={48} className="inline-block w-auto h-12 mr-2 align-middle" /> */}
              </span>USA Pawn — Owner Dashboard
          </h1>
          <p className="mt-1 text-sm text-vault-text-muted font-body">
            Command Center for USA Pawn Holdings
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-vault-text-muted">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              loading ? 'bg-vault-warning animate-pulse' : 'bg-vault-success'
            }`}
          />
          Last updated:{' '}
          {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          <span className="text-vault-text-muted/50">(auto-refresh 30s)</span>
        </div>
      </div>

      {/* ── Navigation Tabs ────────────────────────────── */}
      <div className="mb-8">
        <nav className="flex gap-1 p-1 overflow-x-auto border rounded-xl bg-vault-surface border-vault-border">
          {[
            { id: 'overview' as const, label: 'Overview', icon: IconLayoutDashboard, badge: complianceAlerts.length > 0 ? `${complianceAlerts.length}` : undefined, badgeColor: 'vault-danger' },
            { id: 'leads' as const, label: 'Lead Pipeline', icon: IconAntenna, badge: `${leads.length}` },
            { id: 'staff' as const, label: 'Staff Ops', icon: IconUsers, badge: `${metrics.staff}` },
            { id: 'inventory' as const, label: 'Inventory', icon: IconPhoto },
            { id: 'conversations' as const, label: 'Conversations', icon: IconMessage },
            { id: 'agents' as const, label: 'AI Agents', icon: IconRobot },
            { id: 'data-management' as const, label: 'Data Mgmt', icon: IconTrash, badge: undefined, badgeColor: 'vault-danger' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold font-body transition-all duration-200 whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-vault-gold/15 text-vault-gold border border-vault-gold/30 shadow-sm'
                  : 'text-vault-text-muted hover:text-vault-text-light hover:bg-vault-hover-overlay'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-bold',
                    tab.badgeColor === 'vault-danger'
                      ? 'bg-vault-danger/20 text-vault-danger'
                      : 'bg-vault-gold/15 text-vault-gold'
                  )}
                >
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="dashboard-tab-indicator"
                  className="absolute inset-0 border rounded-lg bg-vault-gold/10 border-vault-gold/20"
                  style={{ zIndex: -1 }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab Content ────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Compliance Alerts */}
            {complianceAlerts.length > 0 && (
              <div className="mb-6">
                <ComplianceAlerts alerts={complianceAlerts} />
              </div>
            )}

            {/* Bento Grid Overview */}
            <BentoGrid className="md:auto-rows-[13rem] mb-6">
              <BentoGridItem
                title="Today's Leads"
                description="New customer interactions captured today"
                header={<SkeletonLeadPulse value={loading ? '—' : metrics.leads} />}
                className="md:col-span-1 p-3 space-y-2"
                icon={<IconChartBar className="w-4 h-4 text-vault-red" />}
              />
              <BentoGridItem
                title="Active Staff"
                description="Currently clocked in and on-site"
                header={<SkeletonStaffActive value={loading ? '—' : metrics.staff} />}
                className="md:col-span-1 p-3 space-y-2"
                icon={<IconUsers className="w-4 h-4 text-vault-success" />}
              />
              <BentoGridItem
                title="Est. Revenue"
                description="Projected revenue from today's leads"
                header={<SkeletonRevenue value={loading ? '—' : `$${metrics.revenue.toLocaleString()}`} />}
                className="md:col-span-1 p-3 space-y-2"
                icon={<IconCoin className="w-4 h-4 text-vault-gold" />}
              />
            </BentoGrid>

            {/* Quick glance: recent leads + staff in compact view */}
            <BentoGrid className="md:auto-rows-[20rem] md:grid-cols-5">
              <Card className={cn(
                "row-span-1 rounded-2xl group/bento hover:shadow-xl transition duration-300 shadow-vault border-vault-border bg-vault-surface-elevated flex flex-col hover:border-vault-red/40 md:col-span-3 overflow-hidden"
              )}>
                <CardHeader className="flex flex-row items-center gap-3 px-4 pt-4 pb-2 space-y-0">
                  <IconAntenna className="w-4 h-4 text-vault-red" />
                  <CardTitle className="text-lg font-bold font-display text-vault-text-light">Recent Leads</CardTitle>
                  <Badge variant="secondary" className="px-2 py-1 ml-auto font-mono rounded-full text-vault-text-muted bg-vault-surface">{leads.length} total</Badge>
                </CardHeader>
                <Separator className="bg-vault-border" />
                <CardContent className="flex-1 p-4 overflow-y-auto">
                  <DashboardLeadFeed
                    leads={leads.slice(0, 8)}
                    loading={loading}
                    onLeadSelect={setSelectedLead}
                    selectedLeadId={selectedLead?.lead_id}
                  />
                </CardContent>
              </Card>

              <Card className={cn(
                "row-span-1 rounded-2xl group/bento hover:shadow-xl transition duration-300 shadow-vault border-vault-border bg-vault-surface-elevated flex flex-col hover:border-vault-gold/40 md:col-span-2 overflow-hidden"
              )}>
                <CardHeader className="flex flex-row items-center gap-3 px-4 pt-4 pb-2 space-y-0">
                  <IconClockHour4 className="w-4 h-4 text-vault-gold" />
                  <CardTitle className="text-lg font-bold font-display text-vault-text-light">Staff Activity</CardTitle>
                  <Badge variant="secondary" className="px-2 py-1 ml-auto font-mono rounded-full text-vault-text-muted bg-vault-surface">{metrics.staff} active</Badge>
                </CardHeader>
                <Separator className="bg-vault-border" />
                <CardContent className="flex-1 p-4 overflow-y-auto">
                  <DashboardStaffLog staffLog={staffLog.slice(0, 8)} loading={loading} onForceClockOut={handleForceClockOut} />
                </CardContent>
              </Card>
            </BentoGrid>
          </motion.div>
        )}

        {/* ═══ LEADS TAB ═══ */}
        {activeTab === 'leads' && (
          <motion.div
            key="leads"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <BentoGrid className="md:auto-rows-[36rem] md:grid-cols-1">
              <Card className={cn(
                "row-span-1 rounded-2xl group/bento hover:shadow-xl transition duration-300 shadow-vault border-vault-border bg-vault-surface-elevated flex flex-col hover:border-vault-red/40 overflow-hidden"
              )}>
                <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
                  <IconAntenna className="w-4 h-4 text-vault-red" />
                  <CardTitle className="text-lg font-bold font-display text-vault-text-light">All Leads</CardTitle>
                  <Badge variant="secondary" className="px-2 py-1 ml-auto font-mono rounded-full text-vault-text-muted bg-vault-surface">{leads.length} total</Badge>
                </CardHeader>
                <Separator className="bg-vault-border" />
                <CardContent className="flex-1 p-5 overflow-y-auto">
                  <DashboardLeadFeed
                    leads={leads}
                    loading={loading}
                    onLeadSelect={setSelectedLead}
                    selectedLeadId={selectedLead?.lead_id}
                  />
                </CardContent>
              </Card>
            </BentoGrid>

            {/* Compliance Section */}
            {complianceAlerts.length > 0 && (
              <div className="mt-6">
                <ComplianceAlerts alerts={complianceAlerts} />
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ STAFF OPS TAB ═══ */}
        {activeTab === 'staff' && (
          <motion.div
            key="staff"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <BentoGrid className="md:auto-rows-[30rem] md:grid-cols-5">
              <Card className={cn(
                "row-span-1 rounded-2xl group/bento hover:shadow-xl transition duration-300 shadow-vault border-vault-border bg-vault-surface-elevated flex flex-col hover:border-vault-gold/40 md:col-span-3 overflow-hidden"
              )}>
                <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
                  <IconClockHour4 className="w-4 h-4 text-vault-gold" />
                  <CardTitle className="text-lg font-bold font-display text-vault-text-light">Staff Activity</CardTitle>
                  <Badge variant="secondary" className="px-2 py-1 ml-auto font-mono rounded-full text-vault-text-muted bg-vault-surface">{metrics.staff} active</Badge>
                </CardHeader>
                <Separator className="bg-vault-border" />
                <CardContent className="flex-1 p-5 overflow-y-auto">
                  <DashboardStaffLog staffLog={staffLog} loading={loading} onForceClockOut={handleForceClockOut} />
                </CardContent>
              </Card>

              <Card className={cn(
                "row-span-1 rounded-2xl group/bento hover:shadow-xl transition duration-300 shadow-vault border-vault-border bg-vault-surface-elevated flex flex-col hover:border-vault-success/40 md:col-span-2 overflow-hidden"
              )}>
                <CardHeader className="px-5 pt-5 pb-3">
                  <CardTitle className="text-lg font-bold font-display text-vault-text-light">Staff Onboarding</CardTitle>
                </CardHeader>
                <Separator className="bg-vault-border" />
                <CardContent className="flex-1 p-5 overflow-y-auto">
                  <StaffOnboarding />
                </CardContent>
              </Card>
            </BentoGrid>

            {complianceAlerts.length > 0 && (
              <div className="mt-6">
                <ComplianceAlerts alerts={complianceAlerts} />
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ INVENTORY TAB ═══ */}
        {activeTab === 'inventory' && (
          <motion.div
            key="inventory"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <DashboardInventoryManager />
          </motion.div>
        )}

        {/* ═══ CONVERSATIONS TAB ═══ */}
        {activeTab === 'conversations' && (
          <motion.div
            key="conversations"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Card className={cn(
              "rounded-2xl group/bento hover:shadow-xl transition duration-300 shadow-vault border-vault-border bg-vault-surface-elevated flex flex-col hover:border-vault-red/40 overflow-hidden"
            )}>
              <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
                <IconMessage className="w-4 h-4 text-vault-red" />
                <CardTitle className="text-lg font-bold font-display text-vault-text-light">Chat History</CardTitle>
                <Badge variant="secondary" className="px-2 py-1 ml-auto font-mono rounded-full text-vault-text-muted bg-vault-surface">QA/Review</Badge>
              </CardHeader>
              <Separator className="bg-vault-border" />
              <CardContent className="flex-1 p-5 overflow-y-auto">
                <DashboardChatHistory maxDisplay={0} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ AI AGENTS TAB ═══ */}
        {activeTab === 'agents' && (
          <motion.div
            key="agents"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <AgentConfigPanel />
          </motion.div>
        )}

        {/* ═══ DATA MANAGEMENT TAB ═══ */}
        {activeTab === 'data-management' && (
          <motion.div
            key="data-management"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <DataManagementPanel onDataCleared={fetchDashboardData} />
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={Boolean(selectedLead)} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden border-vault-border bg-vault-surface-elevated text-vault-text-light">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-vault-text-light">Lead Details</DialogTitle>
            <DialogDescription className="font-body text-vault-text-muted">
              Full interaction record including source, timing, and appraisal metadata.
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="max-h-[calc(85vh-8rem)] overflow-y-auto pr-1 space-y-5 font-body">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="p-3 border rounded-lg bg-vault-surface border-vault-border">
                  <p className="font-mono text-xs text-vault-text-muted">Customer</p>
                  <p className="mt-1 text-sm font-semibold text-vault-text-light">{selectedLead.customer_name || 'Anonymous'}</p>
                  <p className="text-xs text-vault-text-muted">{selectedLead.phone || 'No phone on file'}</p>
                </div>
                <div className="p-3 border rounded-lg bg-vault-surface border-vault-border">
                  <p className="font-mono text-xs text-vault-text-muted">Lead Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-vault-gold/20 text-vault-gold">
                      {selectedLead.status || 'new'}
                    </Badge>
                    <Badge variant="secondary" className="border bg-vault-surface-elevated text-vault-text-muted border-vault-border">
                      {selectedLead.priority || 'normal'} priority
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="p-3 border rounded-lg bg-vault-surface border-vault-border">
                  <p className="font-mono text-xs text-vault-text-muted">Source</p>
                  <p className="mt-1 text-sm text-vault-text-light">{selectedLeadSource}</p>
                </div>
                <div className="p-3 border rounded-lg bg-vault-surface border-vault-border">
                  <p className="font-mono text-xs text-vault-text-muted">Method</p>
                  <p className="mt-1 text-sm text-vault-text-light">{selectedLeadMethod}</p>
                </div>
                <div className="p-3 border rounded-lg bg-vault-surface border-vault-border">
                  <p className="font-mono text-xs text-vault-text-muted">Lead Created</p>
                  <p className="mt-1 text-sm text-vault-text-light">{formatDateTime(selectedLeadCreated)}</p>
                </div>
                <div className="p-3 border rounded-lg bg-vault-surface border-vault-border">
                  <p className="font-mono text-xs text-vault-text-muted">Appointment Time</p>
                  <p className="mt-1 text-sm text-vault-text-light">{formatDateTime(selectedLeadAppointmentTime)}</p>
                </div>
              </div>

              <div className="p-3 border rounded-lg bg-vault-surface border-vault-border">
                <p className="font-mono text-xs text-vault-text-muted">Item / Inquiry</p>
                <p className="mt-1 text-sm text-vault-text-light">{selectedLead.item_description || 'No description provided'}</p>
                <div className="flex flex-wrap gap-3 mt-3 font-mono text-xs text-vault-text-muted">
                  <span>Est. Value: {selectedLead.estimated_value != null ? `$${Number(selectedLead.estimated_value).toLocaleString()}` : '—'}</span>
                  <span>Range: {selectedLead.value_range ?? '—'}</span>
                  <span>Category: {selectedLead.item_category ?? '—'}</span>
                </div>
              </div>

              {selectedLead.photo_url && (
                <div className="p-3 border rounded-lg bg-vault-surface border-vault-border">
                  <p className="font-mono text-xs text-vault-text-muted">Uploaded Appraisal Photo</p>
                  <div className="mt-2 overflow-hidden border rounded-lg border-vault-border bg-vault-black-deep">
                    <Image
                      src={selectedLead.photo_url}
                      alt="Uploaded appraisal item"
                      width={1200}
                      height={800}
                      unoptimized
                      className="object-contain w-full h-auto max-h-72"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="p-3 border rounded-lg bg-vault-surface border-vault-border">
                  <p className="font-mono text-xs text-vault-text-muted">Lead ID</p>
                  <p className="mt-1 text-xs break-all text-vault-text-light">{selectedLead.lead_id}</p>
                </div>
                <div className="p-3 border rounded-lg bg-vault-surface border-vault-border">
                  <p className="font-mono text-xs text-vault-text-muted">Appraisal / Appointment</p>
                  <p className="mt-1 text-xs break-all text-vault-text-light">
                    appraisal: {selectedLead.appraisal_id ?? '—'}
                    <br />
                    appointment: {selectedLead.appointment_id ?? '—'}
                  </p>
                </div>
              </div>

              {selectedLead.notes && (
                <div className="p-3 border rounded-lg bg-vault-surface border-vault-border">
                  <p className="font-mono text-xs text-vault-text-muted">Notes</p>
                  <p className="mt-1 text-sm text-vault-text-light">{selectedLead.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
