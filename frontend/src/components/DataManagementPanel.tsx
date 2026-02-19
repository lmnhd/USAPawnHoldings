'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  IconAlertTriangle,
  IconTrash,
  IconMessage,
  IconUsers,
  IconAntenna,
  IconPhoto,
  IconCheck,
  IconX,
  IconLoader2,
} from '@tabler/icons-react';

interface DataCategory {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  apiEndpoint: string;
  iconColor: string;
  borderColor: string;
}

const DATA_CATEGORIES: DataCategory[] = [
  {
    id: 'leads',
    label: 'Leads',
    description: 'All customer leads from chat, appraisals, SMS, and phone. Includes names, phone numbers, item descriptions, and estimated values.',
    icon: IconAntenna,
    apiEndpoint: '/api/leads?clear_all=true',
    iconColor: 'text-vault-red',
    borderColor: 'border-vault-red/30',
  },
  {
    id: 'staff-activity',
    label: 'Staff Activity Log',
    description: 'All clock-in/out records, shift durations, compliance flags, and location data for staff members.',
    icon: IconUsers,
    apiEndpoint: '/api/staff-log?clear_all=true',
    iconColor: 'text-vault-gold',
    borderColor: 'border-vault-gold/30',
  },
  {
    id: 'conversations',
    label: 'Chat History',
    description: 'All stored chat conversations from the web widget, SMS, and voice channels. Includes full message transcripts.',
    icon: IconMessage,
    apiEndpoint: '/api/conversations?clear_all=true',
    iconColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'appraisals',
    label: 'Appraisal History',
    description: 'All AI photo appraisal records AND appraisal leads. Clears both the appraisal metadata table and appraisal-source leads.',
    icon: IconPhoto,
    apiEndpoint: '/api/appraise?clear_all=true',
    iconColor: 'text-vault-success',
    borderColor: 'border-vault-success/30',
  },
];

type ClearState = 'idle' | 'confirm' | 'loading' | 'success' | 'error';

interface DataManagementPanelProps {
  onDataCleared?: () => void;
}

export default function DataManagementPanel({ onDataCleared }: DataManagementPanelProps) {
  const [clearStates, setClearStates] = useState<Record<string, ClearState>>(
    Object.fromEntries(DATA_CATEGORIES.map((c) => [c.id, 'idle']))
  );
  const [results, setResults] = useState<Record<string, string>>({});
  const [clearAllState, setClearAllState] = useState<ClearState>('idle');

  const updateState = (id: string, state: ClearState) => {
    setClearStates((prev) => ({ ...prev, [id]: state }));
  };

  const handleClear = async (category: DataCategory) => {
    updateState(category.id, 'loading');
    try {
      const res = await fetch(category.apiEndpoint, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        updateState(category.id, 'success');
        setResults((prev) => ({
          ...prev,
          [category.id]: data.message || `Cleared ${data.deleted ?? 0} items`,
        }));
        onDataCleared?.();
        // Reset after 4s
        setTimeout(() => updateState(category.id, 'idle'), 4000);
      } else {
        updateState(category.id, 'error');
        setResults((prev) => ({
          ...prev,
          [category.id]: data.error || 'Failed to clear data',
        }));
        setTimeout(() => updateState(category.id, 'idle'), 5000);
      }
    } catch {
      updateState(category.id, 'error');
      setResults((prev) => ({
        ...prev,
        [category.id]: 'Network error — could not reach API',
      }));
      setTimeout(() => updateState(category.id, 'idle'), 5000);
    }
  };

  const handleClearAll = async () => {
    setClearAllState('loading');
    try {
      for (const category of DATA_CATEGORIES) {
        updateState(category.id, 'loading');
        try {
          const res = await fetch(category.apiEndpoint, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok) {
            updateState(category.id, 'success');
            setResults((prev) => ({
              ...prev,
              [category.id]: data.message || `Cleared ${data.deleted ?? 0} items`,
            }));
          } else {
            updateState(category.id, 'error');
            setResults((prev) => ({
              ...prev,
              [category.id]: data.error || 'Failed',
            }));
          }
        } catch {
          updateState(category.id, 'error');
        }
      }
      setClearAllState('success');
      onDataCleared?.();
      setTimeout(() => {
        setClearAllState('idle');
        setClearStates(Object.fromEntries(DATA_CATEGORIES.map((c) => [c.id, 'idle'])));
      }, 4000);
    } catch {
      setClearAllState('error');
      setTimeout(() => setClearAllState('idle'), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Warning Banner ───── */}
      <Card className="rounded-2xl bg-vault-danger/10 border-2 border-vault-danger/40 shadow-lg">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-2 rounded-xl bg-vault-danger/20">
              <IconAlertTriangle className="h-8 w-8 text-vault-danger" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold text-vault-danger mb-1">
                ⚠️ Data Management — Danger Zone
              </h2>
              <p className="text-sm text-vault-text-muted font-body leading-relaxed">
                This panel allows you to <strong className="text-vault-danger">permanently delete</strong> data from your DynamoDB tables.
                These actions <strong className="text-vault-danger">cannot be undone</strong>.
                Use this during development to reset test data, or in production to clear outdated records.
                Each action requires explicit confirmation.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="destructive" className="text-xs font-mono bg-vault-danger/20 text-vault-danger border border-vault-danger/30">
                  DESTRUCTIVE OPERATIONS
                </Badge>
                <Badge variant="secondary" className="text-xs font-mono bg-vault-warning/15 text-vault-warning border border-vault-warning/30">
                  DEV / ADMIN ONLY
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Individual Category Cards ───── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DATA_CATEGORIES.map((category) => {
          const state = clearStates[category.id] ?? 'idle';
          const result = results[category.id];
          const Icon = category.icon;

          return (
            <Card
              key={category.id}
              className={`rounded-2xl bg-vault-surface-elevated border ${category.borderColor} transition-all duration-300 ${
                state === 'success' ? 'border-vault-success/50' : state === 'error' ? 'border-vault-danger/50' : ''
              }`}
            >
              <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-2 space-y-0">
                <Icon className={`h-5 w-5 ${category.iconColor}`} />
                <CardTitle className="font-display text-lg font-bold text-vault-text-light">
                  {category.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-sm text-vault-text-muted font-body mb-4 leading-relaxed">
                  {category.description}
                </p>

                {/* Result Message */}
                {result && (state === 'success' || state === 'error') && (
                  <div
                    className={`mb-3 px-3 py-2 rounded-lg text-xs font-mono ${
                      state === 'success'
                        ? 'bg-vault-success/10 text-vault-success border border-vault-success/20'
                        : 'bg-vault-danger/10 text-vault-danger border border-vault-danger/20'
                    }`}
                  >
                    {state === 'success' ? <IconCheck className="inline h-3 w-3 mr-1" /> : <IconX className="inline h-3 w-3 mr-1" />}
                    {result}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {state === 'idle' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => updateState(category.id, 'confirm')}
                      className="bg-vault-danger/20 text-vault-danger border border-vault-danger/30 hover:bg-vault-danger/30 font-mono text-xs"
                    >
                      <IconTrash className="h-3.5 w-3.5 mr-1.5" />
                      Clear All {category.label}
                    </Button>
                  )}

                  {state === 'confirm' && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                      <span className="text-xs font-mono text-vault-danger font-bold animate-pulse">
                        Are you sure? This is permanent!
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleClear(category)}
                        className="bg-vault-danger text-white hover:bg-vault-danger/80 font-mono text-xs"
                      >
                        <IconTrash className="h-3.5 w-3.5 mr-1" />
                        Yes, Delete All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateState(category.id, 'idle')}
                        className="text-vault-text-muted hover:text-vault-text-light font-mono text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {state === 'loading' && (
                    <div className="flex items-center gap-2 text-vault-warning">
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs font-mono">Deleting...</span>
                    </div>
                  )}

                  {state === 'success' && (
                    <div className="flex items-center gap-2 text-vault-success">
                      <IconCheck className="h-4 w-4" />
                      <span className="text-xs font-mono">Cleared successfully</span>
                    </div>
                  )}

                  {state === 'error' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateState(category.id, 'idle')}
                      className="text-vault-text-muted hover:text-vault-text-light font-mono text-xs"
                    >
                      Try Again
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Nuclear Option: Clear Everything ───── */}
      <Separator className="bg-vault-danger/20" />
      <Card className="rounded-2xl bg-vault-surface border-2 border-dashed border-vault-danger/40">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-vault-danger flex items-center gap-2">
                <IconAlertTriangle className="h-5 w-5" />
                Clear ALL Data
              </h3>
              <p className="text-sm text-vault-text-muted font-body mt-1">
                Deletes leads, staff activity, conversations, and appraisals — <strong className="text-vault-danger">everything</strong>.
                Only use this to fully reset the system.
              </p>
            </div>

            <div className="flex-shrink-0">
              {clearAllState === 'idle' && (
                <Button
                  variant="destructive"
                  onClick={() => setClearAllState('confirm')}
                  className="bg-vault-danger text-white hover:bg-vault-danger/80 font-mono text-sm"
                >
                  <IconTrash className="h-4 w-4 mr-2" />
                  Reset Everything
                </Button>
              )}

              {clearAllState === 'confirm' && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-200">
                  <span className="text-xs font-mono text-vault-danger font-bold animate-pulse whitespace-nowrap">
                    ⚠️ LAST WARNING — No undo!
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearAll}
                    className="bg-vault-danger text-white hover:bg-vault-danger/80 font-mono text-xs whitespace-nowrap"
                  >
                    Delete Everything
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setClearAllState('idle')}
                    className="text-vault-text-muted hover:text-vault-text-light font-mono text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {clearAllState === 'loading' && (
                <div className="flex items-center gap-2 text-vault-warning">
                  <IconLoader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-mono">Clearing all data...</span>
                </div>
              )}

              {clearAllState === 'success' && (
                <div className="flex items-center gap-2 text-vault-success">
                  <IconCheck className="h-5 w-5" />
                  <span className="text-sm font-mono">All data cleared</span>
                </div>
              )}

              {clearAllState === 'error' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setClearAllState('idle')}
                  className="text-vault-text-muted hover:text-vault-text-light font-mono text-xs"
                >
                  Reset Failed — Try Again
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
