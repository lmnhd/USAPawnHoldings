'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

/* ------------------------------------------------------------------
   Clock-In Page Content (needs useSearchParams → Suspense boundary)
   ------------------------------------------------------------------ */
function ClockInContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [pin, setPin] = useState('');
  const [staffName, setStaffName] = useState('');
  const [mode, setMode] = useState<'clock_in' | 'clock_out'>('clock_in');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [resultName, setResultName] = useState('');
  const [resultTime, setResultTime] = useState('');
  const [resultDuration, setResultDuration] = useState('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    // We let the server validate the token on submit; just verify it's present and non-empty
    setTokenValid(true);
  }, [token]);

  const handlePinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setPin(cleaned);
    setMessage('');
  };

  const handleSubmit = useCallback(async () => {
    if (pin.length !== 4 || !staffName.trim()) return;
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/staff-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_name: staffName.trim(),
          pin,
          event_type: mode === 'clock_in' ? 'in' : 'out',
          token,
          location: 'qr_scan',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? 'Clock action failed');
      }

      // Check compliance flags for issues
      const flags: string[] = data.compliance_flags ?? [];
      if (flags.includes('pin_validation_failed')) {
        throw new Error('Invalid PIN. Please try again.');
      }
      if (flags.includes('invalid_qr_token')) {
        throw new Error('QR token expired or invalid. Please scan a fresh code.');
      }
      if (flags.includes('multiple_clock_ins_without_clock_out')) {
        // Still succeeded, but warn
        setMessage('Warning: You had an open shift. Previous shift may need review.');
      }

      setResultName(data.staff_name ?? staffName);
      setResultTime(new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      if (mode === 'clock_out' && data.shift_duration != null) {
        const h = Math.floor(data.shift_duration / 3600);
        const m = Math.floor((data.shift_duration % 3600) / 60);
        setResultDuration(h > 0 ? `${h}h ${m}m` : `${m}m`);
      } else {
        setResultDuration('');
      }

      setStatus('success');
    } catch (err: any) {
      setMessage(err?.message ?? 'Something went wrong');
      setStatus('error');
    }
  }, [pin, staffName, mode, token]);

  const resetForm = () => {
    setPin('');
    setStaffName('');
    setStatus('idle');
    setMessage('');
    setResultName('');
    setResultTime('');
    setResultDuration('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Invalid / missing token
  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-vault-black-deep flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-vault-danger/15 mb-6">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-vault-text-light mb-3">
            Invalid QR Code
          </h1>
          <p className="text-vault-text-muted font-body text-sm mb-6">
            This clock-in link is expired or invalid. Please scan today&apos;s QR code posted at the store.
          </p>
          <div className="p-4 rounded-xl bg-vault-surface-elevated border border-vault-gold/10 text-xs font-mono text-vault-text-muted">
            Token: {token || 'missing'}
          </div>
        </div>
      </div>
    );
  }

  // Loading state (token check)
  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-vault-black-deep flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-vault-gold/30 border-t-vault-gold rounded-full" />
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-vault-black-deep flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-vault-success/15 mb-6">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-vault-text-light mb-2">
            {mode === 'clock_in' ? 'Clocked In!' : 'Clocked Out!'}
          </h2>
          <p className="text-vault-gold font-body font-semibold text-lg mb-1">
            {resultName}
          </p>
          <p className="text-vault-text-muted font-body text-sm">
            {mode === 'clock_in' ? 'Started at' : 'Ended at'}{' '}
            <span className="font-mono text-vault-text-light">{resultTime}</span>
          </p>
          {resultDuration && (
            <p className="mt-2 text-vault-text-muted font-body text-sm">
              Shift duration: <span className="font-mono text-vault-gold text-lg font-bold">{resultDuration}</span>
            </p>
          )}
          {message && (
            <p className="mt-3 text-xs text-vault-warning font-body">{message}</p>
          )}
          <Button
            variant="outline"
            onClick={resetForm}
            className="mt-8 px-6 py-3 rounded-xl font-body font-medium text-vault-text-muted bg-vault-surface border-vault-gold/15 hover:border-vault-gold/30 transition-colors"
          >
            Clock Another
          </Button>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-vault-black-deep flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-vault-gold mb-1">
            USA Pawn Holdings
          </h1>
          <p className="text-vault-text-muted font-body text-sm">Staff Clock-In</p>
        </div>

        {/* Mode Toggle */}
        <Tabs
          value={mode}
          onValueChange={(v) => { setMode(v as 'clock_in' | 'clock_out'); setMessage(''); }}
          className="mb-6"
        >
          <TabsList className="w-full rounded-xl bg-vault-surface border border-vault-gold/15 p-1">
            <TabsTrigger
              value="clock_in"
              className="flex-1 py-2.5 rounded-lg font-body font-semibold text-sm transition-all data-[state=active]:bg-vault-gold data-[state=active]:text-vault-text-on-gold data-[state=active]:shadow-none text-vault-text-muted hover:text-vault-text-light"
            >
              Clock In
            </TabsTrigger>
            <TabsTrigger
              value="clock_out"
              className="flex-1 py-2.5 rounded-lg font-body font-semibold text-sm transition-all data-[state=active]:bg-vault-red data-[state=active]:text-white data-[state=active]:shadow-none text-vault-text-muted hover:text-vault-text-light"
            >
              Clock Out
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Staff Name */}
        <div className="mb-4">
          <Label className="block text-xs font-body font-medium text-vault-text-muted uppercase tracking-wider mb-2">
            Staff Name
          </Label>
          <Input
            type="text"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 rounded-xl bg-vault-surface border-vault-gold/15 text-vault-text-light font-body placeholder-vault-text-muted/50 focus:outline-none focus:border-vault-gold/50 transition-colors"
          />
        </div>

        {/* PIN Input */}
        <div className="mb-6">
          <Label className="block text-xs font-body font-medium text-vault-text-muted uppercase tracking-wider mb-2">
            4-Digit PIN
          </Label>
          <div className="flex justify-center gap-3 mb-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`
                  w-14 h-16 rounded-xl border-2 flex items-center justify-center
                  font-mono text-2xl font-bold transition-colors duration-150
                  ${pin.length > i
                    ? 'border-vault-gold bg-vault-gold/10 text-vault-gold'
                    : pin.length === i
                      ? 'border-vault-gold/50 bg-vault-surface'
                      : 'border-vault-gold/15 bg-vault-surface'
                  }
                `}
              >
                {pin[i] ? '●' : ''}
              </div>
            ))}
          </div>
          <Input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            className="sr-only"
            aria-label="Enter 4-digit PIN"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => inputRef.current?.focus()}
            className="w-full text-center text-xs text-vault-text-muted font-body py-1 hover:text-vault-gold transition-colors"
          >
            Tap to enter PIN
          </Button>
        </div>

        {/* Error Message */}
        {status === 'error' && message && (
          <Alert variant="destructive" className="mb-4 p-3 bg-vault-danger/10 border-vault-danger/30 text-center">
            <AlertDescription className="text-sm font-body text-vault-danger">{message}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={pin.length !== 4 || !staffName.trim() || status === 'loading'}
          className={`
            w-full py-4 rounded-xl font-body font-bold text-lg transition-all
            active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed
            ${mode === 'clock_in'
              ? 'bg-gradient-to-r from-vault-gold to-vault-gold-light text-vault-text-on-gold hover:shadow-lg hover:shadow-vault-gold/20'
              : 'bg-vault-red text-white hover:bg-vault-red-hover hover:shadow-lg hover:shadow-vault-red/20'
            }
          `}
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Verifying…
            </span>
          ) : (
            mode === 'clock_in' ? 'Clock In' : 'Clock Out'
          )}
        </Button>

        {/* Footer */}
        <p className="text-center text-[10px] text-vault-text-muted/50 font-body mt-6">
          6132 Merrill Rd Ste 1, Jacksonville, FL 32277
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Page Export with Suspense Boundary
   ------------------------------------------------------------------ */
export default function StaffClockInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-vault-black-deep flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-vault-gold/30 border-t-vault-gold rounded-full" />
        </div>
      }
    >
      <ClockInContent />
    </Suspense>
  );
}
