import React from 'react';

const STYLES = {
  success: 'bg-[#16866B]/10 text-[#16866B] border-[#16866B]/30',
  danger: 'bg-[#D9534F]/10 text-[#D9534F] border-[#D9534F]/30',
  warning: 'bg-[#D69A36]/10 text-[#D69A36] border-[#D69A36]/30',
  primary: 'bg-[#172B4D]/10 text-[#172B4D] border-[#172B4D]/30 font-semibold',
  info: 'bg-[#245A85]/10 text-[#245A85] border-[#245A85]/30',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${STYLES[variant] || STYLES.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
