
import React from 'react';
import { Step } from '../types';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: Step;
  onStepClick: (step: Step) => void;
}

const steps = [
  { id: 1, label: 'נושא' },
  { id: 2, label: 'רשת מילים' },
  { id: 3, label: 'הברקה' },
  { id: 4, label: 'טקסט' },
  { id: 5, label: 'תרגילים' },
  { id: 6, label: 'סיכום' },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, onStepClick }) => {
  return (
    <div className="flex items-center justify-center space-x-2 space-x-reverse mb-8 no-print overflow-x-auto py-2 px-4 scrollbar-hide">
      {steps.map((step) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <button
            key={step.id}
            onClick={() => onStepClick(step.id as Step)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all whitespace-nowrap ${
              isActive 
                ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                : isCompleted
                ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                : 'border-slate-200 text-slate-400 bg-white hover:border-blue-300'
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              isActive ? 'bg-white/30' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-100'
            }`}>
              {isCompleted ? <Check size={14} /> : step.id}
            </span>
            <span className="font-medium text-sm md:text-base">{step.label}</span>
          </button>
        );
      })}
    </div>
  );
};
