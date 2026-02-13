'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export interface ComplianceAlert {
  alert_id: string;
  type: 'long_shift' | 'no_break' | 'missed_clockout' | 'suspicious_pattern';
  staff_name: string;
  message: string;
  severity: 'warning' | 'critical';
  timestamp: string;
}

interface ComplianceAlertsProps {
  alerts: ComplianceAlert[];
}

const SEVERITY_STYLES: Record<ComplianceAlert['severity'], { bg: string; border: string; icon: string }> = {
  warning: {
    bg: 'bg-vault-warning/10',
    border: 'border-vault-warning/40',
    icon: '⚠️',
  },
  critical: {
    bg: 'bg-vault-danger/10',
    border: 'border-vault-danger/40',
    icon: '🚨',
  },
};

export default function ComplianceAlerts({ alerts }: ComplianceAlertsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const visible = alerts
    .filter((a) => !dismissed.has(a.alert_id))
    .slice(0, 5);

  const handleDismiss = (alertId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });
  };

  if (visible.length === 0) {
    return null;
  }

  const criticalCount = visible.filter((a) => a.severity === 'critical').length;
  const warningCount = visible.filter((a) => a.severity === 'warning').length;

  return (
    <Card className="rounded-xl border border-vault-warning/30 bg-vault-surface-elevated/80 overflow-hidden">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-3 h-auto rounded-none hover:bg-vault-surface transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg" aria-hidden="true">
            {criticalCount > 0 ? '🚨' : '⚠️'}
          </span>
          <span className="font-body font-semibold text-vault-text-light text-sm">
            {visible.length} Compliance Alert{visible.length !== 1 ? 's' : ''}
          </span>
          {criticalCount > 0 && (
            <Badge variant="outline" className="text-xs font-mono bg-vault-danger/20 text-vault-danger border-vault-danger/30 px-2 py-0.5">
              {criticalCount} critical
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="text-xs font-mono bg-vault-warning/20 text-vault-warning border-vault-warning/30 px-2 py-0.5">
              {warningCount} warning
            </Badge>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-vault-text-muted transition-transform duration-200 ${
            collapsed ? '' : 'rotate-180'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {/* Alert List */}
      {!collapsed && (
        <CardContent className="p-0">
          <Separator className="bg-vault-gold/10" />
          <div className="divide-y divide-vault-gold/5">
            {visible.map((alert) => {
              const style = SEVERITY_STYLES[alert.severity];
              return (
                <div
                  key={alert.alert_id}
                  className={`flex items-start gap-3 px-5 py-3 ${style.bg} transition-colors`}
                >
                  <span className="text-sm mt-0.5 flex-shrink-0" aria-hidden="true">
                    {style.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body text-vault-text-light leading-snug">
                      <span className="font-semibold text-vault-gold">{alert.staff_name}:</span>{' '}
                      {alert.message}
                    </p>
                    <p className="text-xs font-mono text-vault-text-muted mt-1">
                      {new Date(alert.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(alert.alert_id);
                    }}
                    className="flex-shrink-0 h-8 w-8 text-vault-text-muted hover:text-vault-text-light hover:bg-vault-surface rounded transition-colors"
                    aria-label={`Dismiss alert for ${alert.staff_name}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
