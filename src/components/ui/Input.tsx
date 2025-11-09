import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-dark-200 mb-2">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-11 w-full rounded-xl border border-dark-700 bg-dark-800/50 backdrop-blur-sm px-4 py-2.5 text-sm text-white',
            'placeholder:text-dark-400',
            'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-accent-purple/50',
            'hover:border-dark-600 transition-all duration-200',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500/50 focus:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-400">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
