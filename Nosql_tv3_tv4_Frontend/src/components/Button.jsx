import React from 'react';

const VARIANTS = {
  primary:
    'bg-[#172B4D] text-white hover:bg-[#245A85] border border-[#172B4D] shadow-sm',
  accent:
    'bg-[#245A85] text-white hover:bg-[#172B4D] border border-[#245A85] shadow-sm',
  secondary:
    'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm',
  success:
    'bg-[#16866B] text-white hover:bg-[#126b55] border border-[#16866B] shadow-sm',
  warning:
    'bg-[#D69A36] text-white hover:bg-[#b88229] border border-[#D69A36] shadow-sm',
  danger:
    'bg-[#D9534F] text-white hover:bg-[#c9302c] border border-[#D9534F] shadow-sm',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent',
};

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#245A85]/20 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
