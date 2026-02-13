'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

/* ------------------------------------------------------------------
   Item Entry Form Component
   Staff can upload photos and add new inventory items
   ------------------------------------------------------------------ */

interface ItemEntryFormProps {
  onClose?: () => void;
  onSuccess?: (item: any) => void;
}

const CATEGORIES = [
  'jewelry',
  'electronics',
  'tools',
  'firearms',
  'musical',
  'sporting',
  'collectibles',
];

const CONDITIONS = [
  { value: 'new', label: 'New - Mint Condition' },
  { value: 'excellent', label: 'Excellent - Like New' },
  { value: 'good', label: 'Good - Minor Wear' },
  { value: 'fair', label: 'Fair - Noticeable Wear' },
  { value: 'poor', label: 'Poor - Heavy Wear' },
];

export default function ItemEntryForm({ onClose, onSuccess }: ItemEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form fields
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('good');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Auto-evaluation state
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    itemType: string;
    name: string;
    description: string;
    category: string;
    brand?: string;
    condition: string;
    suggestedPrice: number;
    confidence: string;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  /* ----------------------------------------------------------------
     Image Upload Handlers
     ---------------------------------------------------------------- */
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setImages((prev) => [...prev, base64]);
        setUploadingImage(false);
      };
      reader.onerror = () => {
        setError('Failed to read image file');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload image');
      setUploadingImage(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setError('Camera access denied or unavailable');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      setImages((prev) => [...prev, base64]);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  /* ----------------------------------------------------------------
     Auto Evaluate with AI Vision
     ---------------------------------------------------------------- */
  const handleAutoEvaluate = async () => {
    if (images.length === 0) return;

    setEvaluating(true);
    setError(null);

    try {
      const res = await fetch('/api/evaluate-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: images[0] }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to evaluate item');
      }

      const result = await res.json();
      setEvaluationResult(result);

      // Auto-fill form fields
      if (result.category) setCategory(result.category);
      if (result.brand) setBrand(result.brand);
      if (result.description) setDescription(result.description);
      if (result.suggestedPrice) setPrice(result.suggestedPrice.toString());
      if (result.condition) setCondition(result.condition);

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEvaluating(false);
    }
  };

  /* ----------------------------------------------------------------
     Form Submit
     ---------------------------------------------------------------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const numPrice = parseFloat(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        throw new Error('Please enter a valid price');
      }

      const payload = {
        category,
        brand: brand.trim() || 'Unbranded',
        description: description.trim(),
        price: numPrice,
        condition,
        images,
        metadata: {
          added_by: 'staff',
          added_at: new Date().toISOString(),
        },
      };

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add item');
      }

      const newItem = await res.json();
      setSuccess(true);
      
      // Call success callback
      onSuccess?.(newItem);

      // Reset form after brief delay
      setTimeout(() => {
        setCategory('');
        setBrand('');
        setDescription('');
        setPrice('');
        setCondition('good');
        setImages([]);
        setEvaluationResult(null);
        setSuccess(false);
        onClose?.();
      }, 2000);

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------------
     Render
     ---------------------------------------------------------------- */
  return (
    <Card className="max-w-2xl mx-auto bg-vault-surface-elevated border-vault-gold/15 rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">📦</span>
          <CardTitle className="text-xl font-bold font-display text-vault-text-light">
            Add New Item
          </CardTitle>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-vault-text-muted hover:text-vault-text-light"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-6">
        {/* Success Message */}
        {success && (
          <Alert className="mb-6 bg-vault-success/10 border-vault-success/30">
            <AlertDescription className="text-sm text-vault-success font-body">
              ✓ Item added successfully! Redirecting...
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert className="mb-6 bg-vault-danger/10 border-vault-danger/30">
            <AlertDescription className="text-sm text-vault-danger font-body">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo Upload Section */}
          <div>
            <Label className="block mb-3 text-xs font-medium tracking-wider uppercase font-body text-vault-text-muted">
              Item Photos
            </Label>
            
            {/* Camera View */}
            {cameraActive && (
              <div className="relative mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 font-semibold bg-vault-gold text-vault-text-on-gold font-body hover:bg-vault-gold-light"
                  >
                    📸 Capture
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={stopCamera}
                    className="bg-vault-surface border-vault-gold/20 text-vault-text-light font-body hover:bg-vault-surface-elevated"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Upload Buttons */}
            {!cameraActive && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex items-center justify-center h-auto gap-2 px-4 py-3 border-2 border-dashed border-vault-gold/30 text-vault-text-light hover:border-vault-gold/60 hover:bg-vault-gold/5 disabled:opacity-50"
                >
                  <span className="text-xl">🖼️</span>
                  <span className="text-sm font-medium font-body">
                    {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={startCamera}
                  className="flex items-center justify-center h-auto gap-2 px-4 py-3 border-2 border-dashed border-vault-gold/30 text-vault-text-light hover:border-vault-gold/60 hover:bg-vault-gold/5"
                >
                  <span className="text-xl">📷</span>
                  <span className="text-sm font-medium font-body">Use Camera</span>
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Image Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt={`Item ${idx + 1}`}
                      className="object-cover w-full h-24 border rounded-lg border-vault-gold/15"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeImage(idx)}
                      className="absolute w-6 h-6 text-xs text-white transition-opacity rounded-full opacity-0 top-1 right-1 bg-vault-danger group-hover:opacity-100"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Auto Evaluate Button */}
            {images.length > 0 && (
              <div className="pt-3">
                <Button
                  type="button"
                  onClick={handleAutoEvaluate}
                  disabled={evaluating || uploadingImage}
                  className="w-full h-auto gap-2 px-4 py-3 font-semibold bg-vault-red text-vault-text-light font-body hover:bg-vault-red-hover disabled:opacity-50"
                >
                  {evaluating ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent" />
                      Analyzing Image...
                    </>
                  ) : (
                    <>
                      <span className="text-lg">🤖</span>
                      Auto Evaluate with AI
                    </>
                  )}
                </Button>
                {evaluationResult && (
                  <div className="px-3 py-2 mt-2 text-xs rounded-lg bg-vault-success/10 border-vault-success/30 border text-vault-success font-body">
                    ✓ AI Analysis Complete — {evaluationResult.confidence} confidence
                    <div className="mt-1 text-vault-text-muted">
                      Fields auto-filled. Review and adjust as needed.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <Label className="block mb-2 text-xs font-medium tracking-wider uppercase font-body text-vault-text-muted">
              Category *
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full h-auto px-4 py-3 bg-vault-surface border-vault-gold/15 text-vault-text-light font-body focus:border-vault-gold/50">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-vault-surface-elevated border-vault-gold/20">
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-vault-text-light font-body hover:bg-vault-gold/10 focus:bg-vault-gold/10">
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand */}
          <div>
            <Label className="block mb-2 text-xs font-medium tracking-wider uppercase font-body text-vault-text-muted">
              Brand
            </Label>
            <Input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g., Sony, DeWalt, Fender"
              className="w-full h-auto px-4 py-3 bg-vault-surface border-vault-gold/15 text-vault-text-light font-body placeholder-vault-text-muted/50 focus:border-vault-gold/50"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="block mb-2 text-xs font-medium tracking-wider uppercase font-body text-vault-text-muted">
              Description *
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="e.g., 42-inch LED TV with remote, excellent picture quality"
              className="w-full px-4 py-3 resize-none bg-vault-surface border-vault-gold/15 text-vault-text-light font-body placeholder-vault-text-muted/50 focus:border-vault-gold/50"
            />
          </div>

          {/* Price & Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block mb-2 text-xs font-medium tracking-wider uppercase font-body text-vault-text-muted">
                Price (USD) *
              </Label>
              <div className="relative">
                <span className="absolute -translate-y-1/2 left-4 top-1/2 text-vault-text-muted font-body">
                  $
                </span>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full h-auto py-3 pl-8 pr-4 bg-vault-surface border-vault-gold/15 text-vault-text-light font-body placeholder-vault-text-muted/50 focus:border-vault-gold/50"
                />
              </div>
            </div>
            <div>
              <Label className="block mb-2 text-xs font-medium tracking-wider uppercase font-body text-vault-text-muted">
                Condition *
              </Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="w-full h-auto px-4 py-3 bg-vault-surface border-vault-gold/15 text-vault-text-light font-body focus:border-vault-gold/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-vault-surface-elevated border-vault-gold/20">
                  {CONDITIONS.map((cond) => (
                    <SelectItem key={cond.value} value={cond.value} className="text-vault-text-light font-body hover:bg-vault-gold/10 focus:bg-vault-gold/10">
                      {cond.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit Button */}
          <Separator className="bg-vault-gold/10" />
          <div className="pt-1">
            <Button
              type="submit"
              disabled={loading || success}
              className="w-full h-auto px-6 py-3 font-semibold bg-vault-gold text-vault-text-on-gold font-body hover:bg-vault-gold-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding Item...' : success ? 'Item Added!' : 'Add to Inventory'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
