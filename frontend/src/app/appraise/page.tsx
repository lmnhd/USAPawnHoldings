'use client';

import { useState, useRef, useCallback, useEffect, DragEvent, ClipboardEvent } from 'react';
import AppraisalCard from '@/components/AppraisalCard';
import type { AppraisalResult } from '@/components/AppraisalCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

/* ── Client-safe constants ── */

const CATEGORIES = [
  'Jewelry',
  'Firearms',
  'Electronics',
  'Tools',
  'Musical Instruments',
  'Collectibles',
  'Sporting Goods',
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  Jewelry: '💎',
  Firearms: '🔫',
  Electronics: '📱',
  Tools: '🔧',
  'Musical Instruments': '🎸',
  Collectibles: '🎨',
  'Sporting Goods': '⚾',
};

const PHOTO_LABELS = ['Front', 'Back', 'Detail', 'Serial/Hallmark', 'Clasp/Buckle', 'Scale Reference'] as const;

type PhotoEntry = {
  id: string;
  file: File;
  preview: string;
  label: string;
};

type PageState = 'idle' | 'uploading' | 'processing' | 'results' | 'error';

/* ── Helpers ── */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/* ── Processing Animation ── */

function ProcessingOverlay() {
  const [step, setStep] = useState(0);
  const steps = [
    'Analyzing your item…',
    'Checking market data…',
    'Calculating estimated value…',
    'Generating appraisal report…',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
      {/* Rotating vault icon */}
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 rounded-full border-2 border-vault-gold/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-vault-gold animate-spin" />
        <div className="absolute inset-3 rounded-full border border-vault-gold/10" />
        <div className="absolute inset-3 rounded-full border border-transparent border-b-vault-gold-light animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl">🔍</span>
        </div>
      </div>

      {/* Gold shimmer bar */}
      <div className="w-64 h-1.5 bg-vault-surface-elevated rounded-full overflow-hidden mb-6">
        <div className="h-full gold-shimmer rounded-full" />
      </div>

      {/* Status text */}
      <p className="text-vault-gold font-display text-lg font-semibold transition-all duration-500">
        {steps[step]}
      </p>
      <p className="text-vault-text-muted text-sm mt-2 font-body">
        Our AI is examining your item with GPT-4o Vision
      </p>
    </div>
  );
}

/* ── Main Page ── */

export default function AppraisePage() {
  /* State */
  const [pageState, setPageState] = useState<PageState>('idle');
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [appraisal, setAppraisal] = useState<AppraisalResult | null>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const MAX_PHOTOS = 6;

  /* ── Photo Handlers ── */

  const addPhoto = useCallback(async (file: File) => {
    if (!isImageFile(file)) {
      setError('Please select an image file (JPG, PNG, HEIC, etc.)');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Image must be under 20MB');
      return;
    }
    setError('');

    try {
      const base64 = await fileToBase64(file);
      const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setPhotos((prev) => {
        if (prev.length >= MAX_PHOTOS) return prev;
        // Auto-assign label based on position
        const nextLabel = PHOTO_LABELS[prev.length] ?? `Photo ${prev.length + 1}`;
        return [...prev, { id, file, preview: base64, label: nextLabel }];
      });
    } catch {
      setError('Failed to process image. Please try again.');
    }
  }, []);

  const addPhotos = useCallback(async (files: File[]) => {
    for (const file of files) {
      await addPhoto(file);
    }
  }, [addPhoto]);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePhotoLabel = useCallback((id: string, label: string) => {
    setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, label } : p));
  }, []);

  const reorderPhotos = useCallback((fromIndex: number, toIndex: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) addPhotos(files);
      // Reset so re-selecting same file triggers change
      if (e.target) e.target.value = '';
    },
    [addPhotos],
  );

  /* ── Drag & Drop (zone) ── */

  /* ── Drag & Drop (zone) ── */

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length > 0) addPhotos(files);
    },
    [addPhotos],
  );

  /* ── Drag Reorder within photo grid ── */

  const handlePhotoDragStart = useCallback((idx: number) => {
    setDraggedIndex(idx);
  }, []);

  const handlePhotoDragOver = useCallback((e: DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault();
    setDragOverIndex(idx);
  }, []);

  const handlePhotoDrop = useCallback((idx: number) => {
    if (draggedIndex !== null && draggedIndex !== idx) {
      reorderPhotos(draggedIndex, idx);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, reorderPhotos]);

  /* ── Paste Support ── */

  useEffect(() => {
    const onPaste = (e: Event) => {
      const ce = e as unknown as ClipboardEvent;
      const items = ce.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            addPhoto(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addPhoto]);

  /* ── Submit Appraisal ── */

  const handleSubmit = async () => {
    if (photos.length === 0 || !category) {
      setError('Please upload at least one photo and select a category.');
      return;
    }

    setError('');
    setPageState('processing');

    try {
      const res = await fetch('/api/appraise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrls: photos.map((p) => p.preview),
          photoLabels: photos.map((p) => p.label),
          description: description || undefined,
          category,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Appraisal failed');
      }

      const result: AppraisalResult = await res.json();
      setAppraisal(result);
      setPageState('results');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze item. Please try again.');
      setPageState('error');
    }
  };

  /* ── Reset ── */

  const handleReset = () => {
    setPageState('idle');
    setPhotos([]);
    setCategory('');
    setDescription('');
    setAppraisal(null);
    setError('');
    setIsDragging(false);
    setDraggedIndex(null);
    setDragOverIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  /* ── Render ── */

  return (
    <div className="min-h-screen">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-vault-black-deep via-vault-black to-vault-black-deep" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 20%, var(--vault-gold) 0%, transparent 50%), radial-gradient(circle at 70% 80%, var(--vault-gold) 0%, transparent 50%)',
          }}
        />
        {/* Top gold line */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-vault-gold/40 to-transparent" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <Badge variant="outline" className="px-4 py-1.5 text-xs font-mono font-semibold tracking-[0.2em] text-vault-gold border-vault-gold/30 rounded-full uppercase mb-6">
            Flagship Feature
          </Badge>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
            <span className="text-vault-text-light">AI-Powered</span>{' '}
            <span className="bg-gradient-to-r from-vault-gold via-vault-gold-light to-vault-gold bg-clip-text text-transparent">
              Instant Appraisals
            </span>
          </h1>
          <p className="mt-5 text-lg text-vault-text-muted max-w-xl mx-auto font-body leading-relaxed">
            Upload a photo of your item and our AI will analyze it using real-time market data
            and spot prices. Get an estimate in seconds.
          </p>
        </div>
      </section>

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      <section className="relative pb-24">
        <div className="max-w-3xl mx-auto px-4">
          {/* ── Processing State ── */}
          {pageState === 'processing' && <ProcessingOverlay />}

          {/* ── Results State ── */}
          {pageState === 'results' && appraisal && (
            <div className="animate-in fade-in duration-500">
              <AppraisalCard
                result={appraisal}
                photoPreview={photos[0]?.preview}
                photoPreviews={photos.map((p) => p.preview)}
                onReset={handleReset}
              />
            </div>
          )}

          {/* ── Idle / Error / Uploading States ── */}
          {(pageState === 'idle' || pageState === 'error' || pageState === 'uploading') && (
            <div className="space-y-8">
              {/* ── Error Banner ── */}
              {error && (
                <Alert variant="destructive" className="bg-vault-danger/10 border-vault-danger/30 rounded-xl px-5 py-4 flex items-start gap-3 animate-in fade-in duration-300">
                  <span className="text-vault-danger text-lg mt-0.5">⚠</span>
                  <AlertDescription>
                    <p className="text-vault-danger font-semibold text-sm">{error}</p>
                    <Button
                      variant="link"
                      onClick={() => { setError(''); setPageState('idle'); }}
                      className="text-vault-text-muted text-xs hover:text-vault-text-light mt-1 underline p-0 h-auto justify-start"
                    >
                      Dismiss
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* ── Photo Upload Zone ── */}
              <Card className="bg-vault-surface-elevated border-vault-gold/10 rounded-2xl">
                <CardHeader className="p-6 sm:p-8 pb-0 sm:pb-0">
                  <CardTitle className="font-display text-xl font-semibold text-vault-text-light">
                    Step 1: Upload Your Item
                  </CardTitle>
                  <CardDescription className="text-vault-text-muted text-sm font-body">
                    Add up to {MAX_PHOTOS} photos for the most accurate appraisal. Drag to reorder. More angles = better estimate.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 pt-6">

                {/* Hidden Inputs — accept multiple */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Upload photos"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Take photo"
                />

                {/* Photo Grid */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {photos.map((photo, idx) => (
                      <div
                        key={photo.id}
                        draggable
                        onDragStart={() => handlePhotoDragStart(idx)}
                        onDragOver={(e) => handlePhotoDragOver(e, idx)}
                        onDrop={() => handlePhotoDrop(idx)}
                        onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                        className={`
                          relative group rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-grab active:cursor-grabbing
                          ${dragOverIndex === idx ? 'border-vault-gold scale-[1.02] shadow-lg shadow-vault-gold/20' : 'border-vault-gold/10 hover:border-vault-gold/30'}
                          ${draggedIndex === idx ? 'opacity-50' : 'opacity-100'}
                        `}
                      >
                        {/* Photo */}
                        <img
                          src={photo.preview}
                          alt={photo.label}
                          className="w-full h-32 sm:h-36 object-cover bg-vault-black-deep"
                        />

                        {/* Label badge (editable) */}
                        <div className="absolute top-2 left-2">
                          <select
                            value={photo.label}
                            onChange={(e) => updatePhotoLabel(photo.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] font-mono font-semibold bg-vault-black/80 text-vault-gold border border-vault-gold/30 rounded-md px-1.5 py-0.5 backdrop-blur-sm cursor-pointer"
                          >
                            {PHOTO_LABELS.map((l) => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                            <option value={`Photo ${idx + 1}`}>Photo {idx + 1}</option>
                          </select>
                        </div>

                        {/* Order badge */}
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-vault-black/80 border border-vault-gold/30 flex items-center justify-center backdrop-blur-sm">
                          <span className="text-[10px] font-mono font-bold text-vault-gold">{idx + 1}</span>
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-vault-danger/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-vault-danger"
                          aria-label={`Remove ${photo.label}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        {/* Drag hint */}
                        <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-60 transition-opacity">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                      </div>
                    ))}

                    {/* Add More slot */}
                    {photos.length < MAX_PHOTOS && (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center h-32 sm:h-36 rounded-xl border-2 border-dashed border-vault-gold/20 hover:border-vault-gold/40 hover:bg-vault-gold/[0.02] transition-all cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                      >
                        <svg className="w-8 h-8 text-vault-gold/40 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-vault-text-muted text-xs font-mono">Add Photo</span>
                        <span className="text-vault-text-muted/40 text-[10px] font-mono">{photos.length}/{MAX_PHOTOS}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state — drop zone */}
                {photos.length === 0 && (
                  <div
                    ref={dropZoneRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                      relative flex flex-col items-center justify-center min-h-[260px] rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
                      ${isDragging
                        ? 'border-vault-gold bg-vault-gold/5 scale-[1.01]'
                        : 'border-vault-gold/20 hover:border-vault-gold/50 hover:bg-vault-gold/[0.02]'
                      }
                    `}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                    }}
                  >
                    {/* Upload icon */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-vault-gold/20' : 'bg-vault-gold/10'}`}>
                      <svg className="w-8 h-8 text-vault-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>

                    <p className="text-vault-text-muted font-body text-center">
                      {isDragging ? (
                        <span className="text-vault-gold font-semibold">Drop your images here</span>
                      ) : (
                        <>
                          <span className="text-vault-gold font-semibold">Click to upload</span>{' '}
                          or drag &amp; drop up to {MAX_PHOTOS} photos
                        </>
                      )}
                    </p>
                    <p className="text-vault-text-muted/60 text-xs mt-1 font-mono">
                      JPG, PNG, HEIC • Max 20MB each
                    </p>

                    {/* Camera button */}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        cameraInputRef.current?.click();
                      }}
                      className="mt-5 gap-2 rounded-xl gold-gradient text-vault-text-on-gold font-semibold text-sm hover:shadow-lg hover:shadow-vault-gold/20 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Take a Photo
                    </Button>
                  </div>
                )}

                {/* Photo tips — show when some photos added */}
                {photos.length > 0 && photos.length < 3 && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-vault-gold/5 border border-vault-gold/10">
                    <p className="text-xs text-vault-text-muted font-body">
                      <span className="text-vault-gold font-semibold">Tip:</span> Add more angles for a better estimate — front, back, and any serial numbers or hallmarks.
                    </p>
                  </div>
                )}
                </CardContent>
              </Card>

              {/* ── Item Details ── */}
              <Card className="bg-vault-surface-elevated border-vault-gold/10 rounded-2xl">
                <CardHeader className="p-6 sm:p-8 pb-0 sm:pb-0">
                  <CardTitle className="font-display text-xl font-semibold text-vault-text-light">
                    Step 2: Item Details
                  </CardTitle>
                  <CardDescription className="text-vault-text-muted text-sm font-body">
                    Select a category and optionally add a description for a more accurate appraisal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 pt-6">

                {/* Category Grid */}
                <Label className="block text-xs text-vault-text-muted uppercase tracking-wider mb-3 font-mono">
                  Category <span className="text-vault-danger">*</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`
                        flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 border
                        ${category === cat
                          ? 'bg-vault-gold/15 border-vault-gold text-vault-gold shadow-sm shadow-vault-gold/10'
                          : 'bg-vault-black border-vault-gold/10 text-vault-text-muted hover:border-vault-gold/30 hover:text-vault-text-light'
                        }
                      `}
                    >
                      <span className="text-lg">{CATEGORY_ICONS[cat] ?? '📦'}</span>
                      <span className="truncate">{cat}</span>
                    </button>
                  ))}
                </div>

                {/* Description */}
                <Label className="block text-xs text-vault-text-muted uppercase tracking-wider mb-1.5 font-mono">
                  Description <span className="text-vault-text-muted/50">(optional)</span>
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., 14k gold chain, approximately 20 inches, 15 grams, minor scratches…"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-vault-black border-vault-gold/20 text-vault-text-light placeholder:text-vault-text-muted/40 focus:border-vault-gold/60 focus:ring-1 focus:ring-vault-gold/30 transition-colors font-body text-sm resize-none"
                />
                </CardContent>
              </Card>

              {/* ── Submit Button ── */}
              <Button
                onClick={handleSubmit}
                disabled={photos.length === 0 || !category || pageState === 'uploading'}
                size="lg"
                className={`
                  w-full py-4 rounded-xl text-lg font-semibold font-body transition-all duration-300
                  ${photos.length > 0 && category
                    ? 'gold-gradient text-vault-text-on-gold hover:shadow-xl hover:shadow-vault-gold/30 hover:scale-[1.01] cursor-pointer'
                    : 'bg-vault-surface-elevated text-vault-text-muted border border-vault-gold/10 cursor-not-allowed'
                  }
                `}
              >
                {pageState === 'uploading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing Image…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span className="text-xl">🔍</span>
                    Get Instant Appraisal
                  </span>
                )}
              </Button>

              {/* ── Trust Elements ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                {[
                  { icon: '🤖', title: 'GPT-4o Vision', desc: 'Advanced AI image analysis' },
                  { icon: '📊', title: 'Live Market Data', desc: 'Real-time spot prices' },
                  { icon: '🔒', title: 'Private & Secure', desc: 'Photos not stored permanently' },
                ].map((feature) => (
                  <Card key={feature.title} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-vault-surface border-vault-gold/5">
                    <span className="text-xl">{feature.icon}</span>
                    <div>
                      <p className="text-vault-text-light text-sm font-semibold">{feature.title}</p>
                      <p className="text-vault-text-muted text-xs">{feature.desc}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════ FAQ / INFO ═══════════════ */}
      <section className="py-16 sm:py-20 bg-vault-surface/50 border-t border-vault-gold/10">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-vault-text-light text-center mb-10">
            How It <span className="text-vault-gold">Works</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Upload Photos',
                desc: 'Add up to 6 photos from different angles — front, back, detail shots, serial numbers.',
              },
              {
                step: '02',
                title: 'AI Analyzes It',
                desc: 'Our GPT-4o Vision AI identifies the item, checks market data, and calculates an estimate.',
              },
              {
                step: '03',
                title: 'Get Your Estimate',
                desc: 'Receive a detailed breakdown and schedule a visit for your official in-store offer.',
              },
            ].map((item) => (
              <Card key={item.step} className="text-center bg-transparent border-none shadow-none">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 mx-auto rounded-full bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center mb-4">
                    <span className="font-mono text-vault-gold font-bold text-sm">{item.step}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-vault-text-light mb-2">
                    {item.title}
                  </h3>
                  <p className="text-vault-text-muted text-sm font-body leading-relaxed">
                    {item.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Disclaimer */}
          <Separator className="mt-12 mb-6 bg-vault-gold/10" />
          <Card className="rounded-xl border-vault-gold/10 bg-vault-surface-elevated">
            <CardContent className="px-5 py-4">
              <p className="text-vault-text-muted text-xs leading-relaxed text-center">
                <span className="text-vault-gold font-semibold">Disclaimer:</span> AI appraisals are estimates based on visual analysis and current market data.
                Final offers are determined by in-store inspection. Actual values may differ based on condition, authenticity, and local market factors.
                Visit us at <span className="text-vault-text-light">6132 Merrill Rd Ste 1, Jacksonville, FL 32277</span> for your official appraisal.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
