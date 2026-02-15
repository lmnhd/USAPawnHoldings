'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ScheduleFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; phone: string; preferredTime: string }) => void;
  isLoading?: boolean;
};

export default function ScheduleFormModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: ScheduleFormModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }
    if (!preferredTime.trim()) {
      setError('Please select a preferred time');
      return;
    }

    onSubmit({ name: name.trim(), phone: phone.trim(), preferredTime: preferredTime.trim() });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-0">
        <form
          onSubmit={handleSubmit}
          className="w-full sm:w-96 bg-vault-surface-elevated rounded-t-2xl sm:rounded-2xl border border-vault-border-accent shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 p-5 bg-gradient-to-r from-vault-gold to-vault-gold-light rounded-t-2xl sm:rounded-t-2xl">
            <h2 className="text-xl font-bold text-white font-display">Schedule Your Visit</h2>
            <p className="mt-1 text-sm text-blue-100">Let's get you on the calendar</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block mb-2 text-sm font-medium text-vault-text-light">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                className="px-4 py-3 rounded-lg bg-vault-surface border-vault-border-accent text-vault-text-light placeholder:text-vault-text-muted focus:border-vault-gold/50 focus-visible:ring-vault-gold/30"
                disabled={isLoading}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block mb-2 text-sm font-medium text-vault-text-light">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(904) 555-1234"
                className="px-4 py-3 rounded-lg bg-vault-surface border-vault-border-accent text-vault-text-light placeholder:text-vault-text-muted focus:border-vault-gold/50 focus-visible:ring-vault-gold/30"
                disabled={isLoading}
              />
            </div>

            {/* Preferred Time */}
            <div>
              <label htmlFor="time" className="block mb-2 text-sm font-medium text-vault-text-light">
                Preferred Time
              </label>
              <div className="space-y-2">
                <select
                  id="time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg appearance-none cursor-pointer bg-vault-surface border-vault-border-accent text-vault-text-light focus:border-vault-gold/50 focus-visible:ring-vault-gold/30"
                  disabled={isLoading}
                >
                  <option value="">Select a time...</option>
                  <option value="Tomorrow 10am">Tomorrow at 10:00 AM</option>
                  <option value="Tomorrow 2pm">Tomorrow at 2:00 PM</option>
                  <option value="Friday 10am">Friday at 10:00 AM</option>
                  <option value="Friday 2pm">Friday at 2:00 PM</option>
                  <option value="Next Week">Next Week (flexible)</option>
                  <option value="Other">Other (I'll call)</option>
                </select>
              </div>
              <p className="mt-2 text-xs text-vault-text-muted">
                💡 We're open Mon–Fri 9–6, Sat 9–5, Sun closed
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-3 border rounded-lg bg-vault-danger/10 border-vault-danger/30">
                <p className="text-sm text-vault-danger">{error}</p>
              </div>
            )}

            {/* Store Info Callout */}
            <div className="px-4 py-3 mt-4 border rounded-lg bg-vault-gold/10 border-vault-gold/30">
              <p className="text-xs text-vault-text-muted">
                📍 <strong>6132 Merrill Rd Ste 1</strong>, Jacksonville, FL 32277
              </p>
              <p className="mt-2 text-xs text-vault-text-muted">
                You'll receive an SMS confirmation with directions and details.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex gap-3 p-4 border-t bg-vault-surface border-vault-border-accent">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-vault-surface border-vault-border-accent text-vault-text-light hover:bg-vault-surface-elevated"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 text-white bg-vault-red hover:bg-vault-red-hover disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Scheduling...' : 'Schedule Visit'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
