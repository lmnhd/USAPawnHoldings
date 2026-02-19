'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

/* ── Types ── */

export interface AppraisalResult {
  appraisal_id: string;
  item_category: string;
  metal_type: string;
  estimated_value: number;
  value_range: string;
  explanation: string;
  next_steps: string;
  confidence: 'high' | 'medium' | 'low';
}

interface BookingDetails {
  customer_name: string;
  phone: string;
  preferred_time: string;
  item_description: string;
  estimated_value: number;
}

interface AppraisalCardProps {
  result: AppraisalResult;
  photoPreview?: string;
  photoPreviews?: string[];
  onReset: () => void;
}

/* ── Helpers ── */

const CONFIDENCE_MAP: Record<string, { dots: number; label: string; color: string }> = {
  high: { dots: 5, label: 'High', color: 'text-vault-gold' },
  medium: { dots: 3, label: 'Medium', color: 'text-yellow-400' },
  low: { dots: 2, label: 'Low', color: 'text-vault-text-muted' },
};

function ConfidenceMeter({ level }: { level: string }) {
  const config = CONFIDENCE_MAP[level] ?? CONFIDENCE_MAP.medium;
  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i < config.dots ? 'bg-vault-gold' : 'bg-vault-surface-elevated'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const TIME_SLOTS = [
  'Today 2:00 PM',
  'Today 4:00 PM',
  'Tomorrow 10:00 AM',
  'Tomorrow 2:00 PM',
  'This Week',
];

function formatValueRange(range: string): string {
  const parts = range.split('-');
  if (parts.length !== 2) return `$${range}`;
  return `$${Number(parts[0]).toLocaleString()} – $${Number(parts[1]).toLocaleString()}`;
}

/* ── Component ── */

export default function AppraisalCard({ result, photoPreview, photoPreviews, onReset }: AppraisalCardProps) {
  const [showBooking, setShowBooking] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmationPhone, setConfirmationPhone] = useState('');
  const [smsSent, setSmsSent] = useState(false);

  /* ── Booking Form State ── */
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState(TIME_SLOTS[0]);

  const handleBookSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBookingSubmitting(true);
    setBookingError('');

    const details: BookingDetails = {
      customer_name: name,
      phone,
      preferred_time: preferredTime,
      item_description: `${result.item_category} — ${result.explanation.slice(0, 120)}`,
      estimated_value: result.estimated_value,
    };

    try {
      // Schedule appointment
      const scheduleRes = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });

      if (!scheduleRes.ok) {
        const data = await scheduleRes.json();
        throw new Error(data.error ?? 'Failed to book appointment');
      }

      const scheduleData = await scheduleRes.json();
      const smsWasSent = scheduleData?.sms_sent ?? false;

      // Log appraisal (separate from appointment) so we track all appraisals
      // Dashboard will deduplicate by customer to avoid double-counting in revenue
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name,
          phone,
          item_description: details.item_description,
          estimated_value: result.estimated_value,
          source: 'appraise_page',
          priority: result.estimated_value > 500 ? 'high' : 'normal',
          notes: `Appraisal ID: ${result.appraisal_id}`,
        }),
      });

      setConfirmationPhone(phone);
      setSmsSent(smsWasSent);
      setBookingSuccess(true);
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBookingSubmitting(false);
    }
  };

  /* ── Success State ── */
  if (bookingSuccess) {
    return (
      <Card className="grain-white bg-vault-surface-elevated border-vault-success/30 rounded-2xl animate-in fade-in duration-500">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-vault-success/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-vault-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-display text-2xl font-bold text-vault-success mb-2">
            Appointment Booked!
          </h3>
          <p className="text-vault-text-muted mb-1">
            {smsSent ? (
              <>
                ✓ SMS confirmation sent to <span className="text-vault-text-light font-mono">{confirmationPhone}</span>
              </>
            ) : (
              <>
                <span className="text-yellow-400">⚠ Appointment booked but SMS failed to {confirmationPhone}</span><br/>
                <span className="text-sm text-vault-text-muted">Call us at (904) 641-7296 to confirm</span>
              </>
            )}
          </p>
          <p className="text-vault-text-muted mb-6">
            See you at <span className="text-vault-gold font-semibold">{preferredTime}</span>!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              asChild
              className="px-6 py-3 h-auto rounded-xl border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10 font-medium"
            >
              <a href="/">Back to Home</a>
            </Button>
            <Button
              onClick={onReset}
              className="px-6 py-3 h-auto rounded-xl gold-gradient text-vault-text-on-gold font-semibold hover:shadow-lg hover:shadow-vault-gold/20"
            >
              New Appraisal
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ── Result Card ── */
  return (
    <Card className="grain-white bg-vault-surface-elevated border-vault-gold/20 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header with photo(s) */}
      <div className="flex flex-col sm:flex-row">
        {(photoPreviews && photoPreviews.length > 1) ? (
          <div className="sm:w-56 shrink-0 bg-vault-black-deep p-2 grid grid-cols-2 gap-1">
            {photoPreviews.slice(0, 4).map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Item photo ${i + 1}`}
                className="w-full h-24 object-cover rounded"
              />
            ))}
          </div>
        ) : photoPreview && (
          <div className="sm:w-48 h-48 sm:h-auto shrink-0 bg-vault-black-deep">
            <img
              src={photoPreview}
              alt="Appraised item"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader className="flex-1 p-6 sm:p-8">
          {/* Category Badge */}
          <div className="flex items-center gap-2 mb-4">
            <Badge className="px-3 py-1 text-xs font-mono font-semibold text-vault-gold bg-vault-gold/10 border border-vault-gold/20 rounded-full uppercase tracking-wider hover:bg-vault-gold/10">
              {result.item_category}
            </Badge>
            {result.metal_type && result.metal_type !== 'unknown' && (
              <Badge variant="outline" className="px-3 py-1 text-xs font-mono text-vault-text-muted bg-vault-surface border-vault-gold/10 rounded-full uppercase tracking-wider hover:bg-vault-surface">
                {result.metal_type}
              </Badge>
            )}
          </div>

          {/* Value */}
          <p className="text-sm text-vault-text-muted font-body uppercase tracking-wider mb-1">
            Estimated Value
          </p>
          <p className="font-display text-4xl sm:text-5xl font-bold text-vault-gold mb-2">
            {formatValueRange(result.value_range)}
          </p>

          {/* Confidence */}
          <div className="mt-3">
            <ConfidenceMeter level={result.confidence} />
          </div>
        </CardHeader>
      </div>

      {/* Divider */}
      <Separator className="bg-gradient-to-r from-transparent via-vault-gold/20 to-transparent" />

      {/* Explanation */}
      <CardContent className="p-6 sm:p-8">
        <h4 className="font-display text-lg font-semibold text-vault-text-light mb-3">
          Analysis Breakdown
        </h4>
        <p className="text-vault-text-muted text-sm leading-relaxed whitespace-pre-line">
          {result.explanation}
        </p>
      </CardContent>

      {/* Divider */}
      <Separator className="bg-gradient-to-r from-transparent via-vault-gold/20 to-transparent" />

      {/* Recommendations */}
      <CardContent className="p-6 sm:p-8">
        <h4 className="font-display text-lg font-semibold text-vault-text-light mb-3">
          Next Steps
        </h4>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-vault-text-muted">
            <span className="text-vault-success mt-0.5">✓</span>
            {result.next_steps}
          </li>
          <li className="flex items-start gap-2 text-sm text-vault-text-muted">
            <span className="text-vault-success mt-0.5">✓</span>
            Bring a valid ID for the final in-store appraisal
          </li>
          <li className="flex items-start gap-2 text-sm text-vault-text-muted">
            <span className="text-vault-success mt-0.5">✓</span>
            Mon–Fri 9 AM – 6 PM, Sat 9 AM – 5 PM
          </li>
          {result.estimated_value > 500 && (
            <li className="flex items-start gap-2 text-sm text-vault-gold font-semibold">
              <span className="mt-0.5">⭐</span>
              High-value item — our specialist will review your appraisal
            </li>
          )}
        </ul>
      </CardContent>

      {/* Divider */}
      <Separator className="bg-gradient-to-r from-transparent via-vault-gold/20 to-transparent" />

      {/* Actions */}
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => setShowBooking(!showBooking)}
            className="flex-1 px-6 py-3.5 h-auto rounded-xl gold-gradient text-vault-text-on-gold font-semibold hover:shadow-lg hover:shadow-vault-gold/20 transition-all duration-300 hover:scale-[1.01] text-center"
          >
            {showBooking ? 'Hide Booking' : '📅 Schedule a Visit'}
          </Button>
          <Button
            variant="outline"
            onClick={onReset}
            className="flex-1 px-6 py-3.5 h-auto rounded-xl border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10 font-medium text-center"
          >
            Start Over
          </Button>
        </div>

        {/* Booking Form */}
        {showBooking && (
          <form
            onSubmit={handleBookSubmit}
            className="mt-6 space-y-4 animate-in slide-in-from-top-2 fade-in duration-300"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="block text-xs text-vault-text-muted uppercase tracking-wider mb-1.5 font-mono">
                  Your Name
                </Label>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 h-auto rounded-lg bg-vault-black border-vault-gold/20 text-vault-text-light placeholder:text-vault-text-muted/50 focus:border-vault-gold/60 focus:ring-1 focus:ring-vault-gold/30 font-body"
                />
              </div>
              <div>
                <Label className="block text-xs text-vault-text-muted uppercase tracking-wider mb-1.5 font-mono">
                  Phone Number
                </Label>
                <Input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(904) 555-1234"
                  className="w-full px-4 py-3 h-auto rounded-lg bg-vault-black border-vault-gold/20 text-vault-text-light placeholder:text-vault-text-muted/50 focus:border-vault-gold/60 focus:ring-1 focus:ring-vault-gold/30 font-body"
                />
              </div>
            </div>
            <div>
              <Label className="block text-xs text-vault-text-muted uppercase tracking-wider mb-1.5 font-mono">
                Preferred Time
              </Label>
              <Select value={preferredTime} onValueChange={setPreferredTime}>
                <SelectTrigger className="w-full px-4 py-3 h-auto rounded-lg bg-vault-black border-vault-gold/20 text-vault-text-light focus:border-vault-gold/60 focus:ring-1 focus:ring-vault-gold/30 font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-vault-surface-elevated border-vault-gold/20">
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot} className="text-vault-text-light font-body hover:bg-vault-gold/10 focus:bg-vault-gold/10">
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {bookingError && (
              <Alert className="bg-vault-danger/10 border-vault-danger/30">
                <AlertDescription className="text-vault-danger text-sm font-medium">{bookingError}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={bookingSubmitting}
              className="w-full py-3.5 h-auto rounded-xl gold-gradient text-vault-text-on-gold font-semibold hover:shadow-lg hover:shadow-vault-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bookingSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Booking…
                </span>
              ) : (
                'Confirm Appointment'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
