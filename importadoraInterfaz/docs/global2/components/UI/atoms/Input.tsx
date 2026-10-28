import React from 'react';
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  error?: string
}

export const Input: React.FC<InputProps> = ({
  leftIcon,
  rightIcon,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full relative">
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
            {leftIcon}
          </span>
        )}
        <input
          className={`w-full bg-slate-900 border rounded-xl py-2 text-xs text-slate-100 placeholder:text-slate-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${leftIcon ? 'pl-9' : 'pl-3'
            } ${rightIcon ? 'pr-9' : 'pr-3'} ${error
              ? 'border-rose-500 focus:border-rose-500'
              : 'border-slate-800 focus:border-indigo-500/80 hover:border-slate-700'
            } ${className}`}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 text-slate-400 flex items-center">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-rose-400">{error}</p>}
    </div>
  )
}
