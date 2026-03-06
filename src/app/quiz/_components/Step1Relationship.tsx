import { Heart, Users, Baby, User, HeartHandshake, Shield } from 'lucide-react';
import { z } from 'zod';
import type { QuizData, RelationshipType } from '@/lib/quiz-types';
import { SelectionCard } from './SelectionCard';

// ─── Validation schema ────────────────────────────────────────────────────────

export const step1Schema = z.object({
  relationshipType: z.string().min(1, 'Please select who this song is for'),
  recipientName: z
    .string()
    .min(1, 'Please enter their name')
    .max(50, 'Name must be under 50 characters'),
});

// ─── Relationship options ─────────────────────────────────────────────────────

const RELATIONSHIP_OPTIONS: {
  value: RelationshipType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: 'Mom', label: 'Mom', icon: <Heart className="w-6 h-6 text-primary" /> },
  { value: 'Dad', label: 'Dad', icon: <Shield className="w-6 h-6 text-primary" /> },
  { value: 'Partner', label: 'Partner', icon: <HeartHandshake className="w-6 h-6 text-primary" /> },
  { value: 'Friend', label: 'Friend', icon: <Users className="w-6 h-6 text-primary" /> },
  { value: 'Child', label: 'Child', icon: <Baby className="w-6 h-6 text-primary" /> },
  { value: 'Other', label: 'Other', icon: <User className="w-6 h-6 text-primary" /> },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Step1RelationshipProps {
  data: QuizData;
  errors: Record<string, string>;
  updateData: (fields: Partial<QuizData>) => void;
}

export function Step1Relationship({ data, errors, updateData }: Step1RelationshipProps) {
  return (
    <div className="space-y-6">
      {/* Relationship type cards */}
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {RELATIONSHIP_OPTIONS.map((option) => (
            <SelectionCard
              key={option.value}
              label={option.label}
              icon={option.icon}
              selected={data.relationshipType === option.value}
              onSelect={() => updateData({ relationshipType: option.value })}
            />
          ))}
        </div>
        {errors.relationshipType && (
          <p className="mt-2 text-destructive text-sm" role="alert">
            {errors.relationshipType}
          </p>
        )}
      </div>

      {/* Recipient name input */}
      <div>
        <input
          type="text"
          value={data.recipientName}
          onChange={(e) => updateData({ recipientName: e.target.value })}
          placeholder="Their first name"
          maxLength={50}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.recipientName && (
          <p className="mt-2 text-destructive text-sm" role="alert">
            {errors.recipientName}
          </p>
        )}
      </div>
    </div>
  );
}
