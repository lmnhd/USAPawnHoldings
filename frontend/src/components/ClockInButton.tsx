'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ClockInButtonProps {
  action: 'clock_in' | 'clock_out';
  onSubmit: (pin: string) => Promise<void>;
  disabled?: boolean;
}

export default function ClockInButton({ action, onSubmit, disabled }: ClockInButtonProps) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Ref to prevent duplicate submissions
  const submittingRef = useRef(false);
  // Store onSubmit in a ref so the submit function never changes identity
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  // Store pin in a ref for the stable submit function
  const pinRef = useRef(pin);
  pinRef.current = pin;

  // Focus PIN input when modal opens; reset state only on open (not close)
  useEffect(() => {
    if (open) {
      setPin('');
      setError('');
      setLoading(false);
      submittingRef.current = false;
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handlePinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setPin(cleaned);
    setError('');
  };

  // Stable submit function — never changes identity
  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    const currentPin = pinRef.current;
    if (currentPin.length !== 4) return;
    submittingRef.current = true;
    setLoading(true);
    setError('');
    try {
      await onSubmitRef.current(currentPin);
      setOpen(false);
    } catch (err: any) {
      setError(err?.message ?? 'Clock action failed. Try again.');
      submittingRef.current = false;
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies — stable forever

  // Auto-submit once when pin reaches 4 digits (only while modal is open)
  useEffect(() => {
    if (open && pin.length === 4 && !submittingRef.current) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const isClockIn = action === 'clock_in';
  const label = isClockIn ? 'Clock In' : 'Clock Out';

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={`
          relative px-8 py-4 rounded-xl font-body font-semibold text-lg h-auto
          transition-all duration-200 active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed
          ${isClockIn
            ? 'bg-gradient-to-r from-vault-gold to-vault-gold-light text-vault-text-on-gold hover:shadow-lg hover:shadow-vault-gold/20'
            : 'bg-vault-red text-white hover:bg-vault-red-hover hover:shadow-lg hover:shadow-vault-red/20'
          }
        `}
      >
        <span className="flex items-center gap-2">
          {isClockIn ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          )}
          {label}
        </span>
      </Button>

      {/* PIN Modal */}
      <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
        <DialogContent className="sm:max-w-sm bg-vault-surface-elevated border-vault-gold/20 overflow-hidden p-0">
          {/* Modal Header */}
          <DialogHeader className="px-6 pt-6 pb-4 text-center">
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 mx-auto ${
              isClockIn ? 'bg-vault-gold/15' : 'bg-vault-red/15'
            }`}>
              <span className="text-2xl">{isClockIn ? '🔓' : '🔒'}</span>
            </div>
            <DialogTitle className="font-display text-xl font-bold text-vault-text-light">
              {label}
            </DialogTitle>
            <DialogDescription className="text-sm text-vault-text-muted mt-1 font-body">
              Enter your 4-digit staff PIN
            </DialogDescription>
          </DialogHeader>

          {/* PIN Input */}
          <div className="px-6 pb-4">
            <div className="flex justify-center gap-3 mb-4">
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

            {/* Hidden input for mobile numeric keyboard */}
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

            {/* Tap area to refocus input */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => inputRef.current?.focus()}
              className="w-full text-center text-xs text-vault-text-muted font-body py-1 hover:text-vault-gold transition-colors"
            >
              Tap to enter PIN
            </Button>

            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="mt-3 bg-vault-danger/10 border-vault-danger/30 text-center">
                <AlertDescription className="text-sm font-body text-vault-danger">{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Actions */}
          <DialogFooter className="flex-row gap-3 sm:flex-row px-6 pb-6">
            <Button
              variant="outline"
              onClick={() => !loading && setOpen(false)}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl font-body font-medium text-vault-text-muted bg-vault-surface border-vault-gold/10 hover:border-vault-gold/30 transition-colors disabled:opacity-40"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={pin.length !== 4 || loading}
              className={`
                flex-1 px-4 py-3 rounded-xl font-body font-semibold transition-all
                disabled:opacity-40 disabled:cursor-not-allowed
                ${isClockIn
                  ? 'bg-vault-gold text-vault-text-on-gold hover:bg-vault-gold-light'
                  : 'bg-vault-red text-white hover:bg-vault-red-hover'
                }
              `}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying…
                </span>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
