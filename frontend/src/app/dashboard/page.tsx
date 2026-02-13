'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconChartBar,
  IconUsers,
  IconCoin,
  IconAlertTriangle,
  IconAntenna,
  IconClockHour4,
  IconMessage,
  IconRobot,
  IconLayoutDashboard,
  IconActivity,
  IconPhoto,
  IconUserPlus,
} from '@tabler/icons-react';
import ComplianceAlerts, { type ComplianceAlert } from '@/components/ComplianceAlerts';
import DashboardLeadFeed, { type Lead } from '@/components/DashboardLeadFeed';
import DashboardStaffLog, { type StaffEntry } from '@/components/DashboardStaffLog';
import DashboardChatHistory from '@/components/DashboardChatHistory';
import AgentConfigPanel from '@/components/AgentConfigPanel';
import DashboardInventoryManager from '@/components/DashboardInventoryManager';
import StaffOnboarding from '@/components/StaffOnboarding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
      className="flex flex-1 w-full h-full min-h-[6rem] flex-col justify-center gap-2 p-3"
    >
      <div className="text-center mb-2">
        <span className="font-mono text-4xl font-bold text-vault-red">{value}</span>
      </div>
      {widths.map((w, i) => (
        <motion.div
          key={i}
          initial={{ width: 0 }}
          animate={{ width: `${w}%` }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="h-2 rounded-full bg-gradient-to-r from-vault-red/60 to-vault-red/20"
        />
      ))}
    </motion.div>
  );
};

const SkeletonStaffActive = ({ value }: { value: string | number }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="flex flex-1 w-full h-full min-h-[6rem] items-center justify-center"
    style={{ background: 'radial-gradient(circle at 50% 40%, rgba(46, 204, 113, 0.1), transparent 70%)' }}
  >
    <div className="text-center">
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="inline-block"
      >
        <span className="font-mono text-5xl font-bold text-vault-success">{value}</span>
      </motion.div>
      <div className="flex justify-center gap-2 mt-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, delay: i * 0.4, repeat: Infinity }}
            className="w-3 h-3 rounded-full bg-vault-success/60"
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
    className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl items-center justify-center"
    style={{
      background: 'linear-gradient(-45deg, rgba(201,168,76,0.15), rgba(13,13,13,0.8), rgba(201,168,76,0.1), rgba(26,26,26,0.9))',
      backgroundSize: '400% 400%',
    }}
  >
    <div className="text-center">
      <span className="font-mono text-4xl font-bold text-vault-gold">{value}</span>
      <p className="text-[10px] font-mono text-vault-gold/60 mt-2 uppercase tracking-widest">estimated today</p>
    </div>
  </motion.div>
);

const SkeletonAlerts = ({ count }: { count: number }) => {
  const v1 = { initial: { x: 0 }, animate: { x: 6, rotate: 3, transition: { duration: 0.2 } } };
  const v2 = { initial: { x: 0 }, animate: { x: -6, rotate: -3, transition: { duration: 0.2 } } };
  return (
    <motion.div initial="initial" whileHover="animate" className="flex flex-1 w-full h-full min-h-[6rem] flex-col space-y-2 p-2">
      {count > 0 ? (
        <>
          <motion.div variants={v1} className="flex flex-row rounded-2xl border border-vault-danger/30 p-2 items-start space-x-2 bg-vault-surface">
            <span className="text-lg">⚠️</span>
            <p className="text-xs text-vault-danger">{count} active compliance {count === 1 ? 'alert' : 'alerts'}</p>
          </motion.div>
          <motion.div variants={v2} className="flex flex-row rounded-full border border-vault-warning/30 p-2 items-center justify-end space-x-2 w-3/4 ml-auto bg-vault-surface">
            <p className="text-xs text-vault-warning">Review now →</p>
            <div className="h-5 w-5 rounded-full bg-gradient-to-r from-vault-warning to-vault-danger shrink-0" />
          </motion.div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <span className="text-3xl">✅</span>
            <p className="text-xs text-vault-success mt-2 font-mono">All Clear</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const SkeletonLeadFeed = () => (
  <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl items-center justify-center"
    style={{ background: 'radial-gradient(circle at 30% 60%, rgba(204,0,0,0.06), transparent 70%)' }}>
    <div className="text-center">
      <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity }}>
        <span className="text-4xl">📊</span>
      </motion.div>
      <p className="text-[10px] font-mono text-vault-text-muted mt-2">LIVE FEED</p>
    </div>
  </div>
);

const SkeletonStaffFeed = () => (
  <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl items-center justify-center"
    style={{ background: 'radial-gradient(circle at 70% 40%, rgba(201,168,76,0.06), transparent 70%)' }}>
    <div className="text-center">
      <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
        <span className="text-4xl">👥</span>
      </motion.div>
      <p className="text-[10px] font-mono text-vault-text-muted mt-2">ACTIVITY LOG</p>
    </div>
  </div>
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

/* ------------------------------------------------------------------
   Dashboard Page
   ------------------------------------------------------------------ */
export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staffLog, setStaffLog] = useState<StaffEntry[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [metrics, setMetrics] = useState({ leads: 0, staff: 0, revenue: 0 });
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

      const fetchedLeads: Lead[] = leadsData.leads ?? [];
      const fetchedStaff: StaffEntry[] = staffData.logs ?? staffData.staff_log ?? [];

      // Derive metrics
      const todayLeads = fetchedLeads.filter((l) => {
        const ts = l.created_at ?? l.timestamp ?? '';
        return ts.startsWith(today);
      });

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

      const revenue = todayLeads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
      const alerts = deriveComplianceAlerts(fetchedStaff);

      setLeads(fetchedLeads);
      setStaffLog(fetchedStaff);
      setComplianceAlerts(alerts);
      setMetrics({
        leads: todayLeads.length,
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

  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'conversations' | 'agents' | 'inventory' | 'staff'>('overview');

  return (
    <div className="min-h-[calc(100vh-8rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-vault-gold tracking-wide">
            🏛️ USA Pawn — Owner Dashboard
          </h1>
          <p className="text-sm text-vault-text-muted font-body mt-1">
            Command Center for USA Pawn Holdings
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-vault-text-muted">
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
        <nav className="flex gap-1 p-1 rounded-xl bg-vault-surface border border-vault-border overflow-x-auto">
          {[
            { id: 'overview' as const, label: 'Overview', icon: IconLayoutDashboard, badge: complianceAlerts.length > 0 ? `${complianceAlerts.length}` : undefined, badgeColor: 'vault-danger' },
            { id: 'activity' as const, label: 'Leads & Staff', icon: IconActivity, badge: `${leads.length}` },
            { id: 'staff' as const, label: 'Staff Onboarding', icon: IconUserPlus },
            { id: 'inventory' as const, label: 'Inventory', icon: IconPhoto },
            { id: 'conversations' as const, label: 'Conversations', icon: IconMessage },
            { id: 'agents' as const, label: 'AI Agents', icon: IconRobot },
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
                  className="absolute inset-0 rounded-lg bg-vault-gold/10 border border-vault-gold/20"
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
            <BentoGrid className="md:auto-rows-[16rem] mb-8">
              <BentoGridItem
                title="Today's Leads"
                description="New customer interactions captured today"
                header={<SkeletonLeadPulse value={loading ? '—' : metrics.leads} />}
                className="md:col-span-1"
                icon={<IconChartBar className="h-4 w-4 text-vault-red" />}
              />
              <BentoGridItem
                title="Active Staff"
                description="Currently clocked in and on-site"
                header={<SkeletonStaffActive value={loading ? '—' : metrics.staff} />}
                className="md:col-span-1"
                icon={<IconUsers className="h-4 w-4 text-vault-success" />}
              />
              <BentoGridItem
                title="Est. Revenue"
                description="Projected revenue from today's leads"
                header={<SkeletonRevenue value={loading ? '—' : `$${metrics.revenue.toLocaleString()}`} />}
                className="md:col-span-1"
                icon={<IconCoin className="h-4 w-4 text-vault-gold" />}
              />
            </BentoGrid>

            {/* Quick glance: recent leads + staff in compact view */}
            <BentoGrid className="md:auto-rows-[22rem] md:grid-cols-5">
              <Card className={cn(
                "row-span-1 rounded-2xl group/bento hover:shadow-xl transition duration-300 shadow-vault border-vault-border bg-vault-surface-elevated flex flex-col hover:border-vault-red/40 md:col-span-3 overflow-hidden"
              )}>
                <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
                  <IconAntenna className="h-4 w-4 text-vault-red" />
                  <CardTitle className="font-display text-lg font-bold text-vault-text-light">Recent Leads</CardTitle>
                  <Badge variant="secondary" className="ml-auto font-mono text-vault-text-muted bg-vault-surface px-2 py-1 rounded-full">{leads.length} total</Badge>
                </CardHeader>
                <Separator className="bg-vault-border" />
                <CardContent className="flex-1 overflow-y-auto p-5">
                  <DashboardLeadFeed leads={leads.slice(0, 8)} loading={loading} />
                </CardContent>
              </Card>

              <Card className={cn(
                "row-span-1 rounded-2xl group/bento hover:shadow-xl transition duration-300 shadow-vault border-vault-border bg-vault-surface-elevated flex flex-col hover:border-vault-gold/40 md:col-span-2 overflow-hidden"
              )}>
                <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
                  <IconClockHour4 className="h-4 w-4 text-vault-gold" />
                  <CardTitle className="font-display text-lg font-bold text-vault-text-light">Staff Activity</CardTitle>
                  <Badge variant="secondary" className="ml-auto font-mono text-vault-text-muted bg-vault-surface px-2 py-1 rounded-full">{metrics.staff} active</Badge>
                </CardHeader>
                <Separator className="bg-vault-border" />
                <CardContent className="flex-1 overflow-y-auto p-5">
                  <DashboardStaffLog staffLog={staffLog.slice(0, 10)} loading={loading} />
                </CardContent>
              </Card>
            </BentoGrid>
          </motion.div>
        )}

        {/* ═══ LEADS & STAFF TAB ═══ */}
        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <BentoGrid className="md:auto-rows-[36rem] md:grid-cols-5">
              {/* Full Lead Feed */}
              <Card className={cn(
                "row-span-1 rounded-2xl group/bento hover:shadow-xl transition duration-300 shadow-vault border-vault-border bg-vault-surface-elevated flex flex-col hover:border-vault-red/40 md:col-span-3 overflow-hidden"
              )}>
                <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
                  <IconAntenna className="h-4 w-4 text-vault-red" />
                  <CardTitle className="font-display text-lg font-bold text-vault-text-light">All Leads</CardTitle>
                  <Badge variant="secondary" className="ml-auto font-mono text-vault-text-muted bg-vault-surface px-2 py-1 rounded-full">{leads.length} total</Badge>
                </CardHeader>
                <Separator className="bg-vault-border" />
                <CardContent className="flex-1 overflow-y-auto p-5">
                  <DashboardLeadFeed leads={leads} loading={loading} />
                </CardContent>
              </Card>

              {/* Full Staff Activity */}
              <Card className={cn(
                "row-span-1 rounded-2xl group/bento hover:shadow-xl transition duration-300 shadow-vault border-vault-border bg-vault-surface-elevated flex flex-col hover:border-vault-gold/40 md:col-span-2 overflow-hidden"
              )}>
                <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
                  <IconClockHour4 className="h-4 w-4 text-vault-gold" />
                  <CardTitle className="font-display text-lg font-bold text-vault-text-light">Staff Activity</CardTitle>
                  <Badge variant="secondary" className="ml-auto font-mono text-vault-text-muted bg-vault-surface px-2 py-1 rounded-full">{metrics.staff} active</Badge>
                </CardHeader>
                <Separator className="bg-vault-border" />
                <CardContent className="flex-1 overflow-y-auto p-5">
                  <DashboardStaffLog staffLog={staffLog} loading={loading} />
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

        {/* ═══ STAFF ONBOARDING TAB ═══ */}
        {activeTab === 'staff' && (
          <motion.div
            key="staff"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <StaffOnboarding />
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

        {/* ═══ 
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
                <IconMessage className="h-4 w-4 text-vault-red" />
                <CardTitle className="font-display text-lg font-bold text-vault-text-light">Chat History</CardTitle>
                <Badge variant="secondary" className="ml-auto font-mono text-vault-text-muted bg-vault-surface px-2 py-1 rounded-full">QA/Review</Badge>
              </CardHeader>
              <Separator className="bg-vault-border" />
              <CardContent className="flex-1 overflow-y-auto p-5">
                <DashboardChatHistory maxDisplay={50} />
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
      </AnimatePresence>
    </div>
  );
}
