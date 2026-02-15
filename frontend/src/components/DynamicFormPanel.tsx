'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type FormField = {
  name: string;
  label: string;
  type: 'text' | 'tel' | 'email' | 'select' | 'textarea';
  placeholder?: string;
  required?: boolean;
  options?: string[];
};

type FormSpec = {
  title: string;
  description?: string;
  fields: FormField[];
  submitLabel?: string;
};

type DynamicFormPanelProps = {
  formSpec: FormSpec;
  onSubmit: (data: Record<string, string>) => void;
  onCancel: () => void;
};

export default function DynamicFormPanel({ formSpec, onSubmit, onCancel }: DynamicFormPanelProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validate required fields
    formSpec.fields.forEach((field) => {
      if (field.required && !formData[field.name]?.trim()) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="border-t border-vault-border-accent bg-vault-surface-elevated p-4 animate-in slide-in-from-bottom-4 duration-300">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div className="pb-3 border-b border-vault-border">
          <h3 className="text-lg font-semibold text-vault-text-light font-display">{formSpec.title}</h3>
          {formSpec.description && (
            <p className="text-sm text-vault-text-muted mt-1">{formSpec.description}</p>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {formSpec.fields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-sm font-medium text-vault-text-light mb-1.5">
                {field.label}
                {field.required && <span className="text-vault-red ml-1">*</span>}
              </label>

              {field.type === 'textarea' ? (
                <Textarea
                  id={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="bg-vault-surface border-vault-border-accent text-vault-text-light placeholder:text-vault-text-muted focus:border-vault-gold/50 focus-visible:ring-vault-gold/30 min-h-[80px]"
                />
              ) : field.type === 'select' ? (
                <select
                  id={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full bg-vault-surface border border-vault-border-accent rounded-md px-3 py-2 text-vault-text-light focus:border-vault-gold/50 focus-visible:ring-vault-gold/30"
                >
                  <option value="">Select...</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={field.name}
                  type={field.type}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="bg-vault-surface border-vault-border-accent text-vault-text-light placeholder:text-vault-text-muted focus:border-vault-gold/50 focus-visible:ring-vault-gold/30"
                />
              )}

              {errors[field.name] && (
                <p className="text-xs text-vault-danger mt-1">{errors[field.name]}</p>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 bg-vault-surface border-vault-border-accent text-vault-text-light hover:bg-vault-surface-elevated"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-vault-red text-white hover:bg-vault-red-hover"
          >
            {formSpec.submitLabel || 'Submit'}
          </Button>
        </div>
      </form>
    </div>
  );
}
