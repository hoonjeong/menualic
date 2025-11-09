import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group'

    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-glow-sm hover:shadow-glow-md',
      secondary: 'bg-dark-700 text-white hover:bg-dark-600 focus:ring-dark-500 border border-dark-600',
      outline: 'glass-hover text-white focus:ring-accent-purple',
      ghost: 'text-dark-200 hover:bg-white/5 focus:ring-accent-purple',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-glow-sm hover:shadow-glow-md',
      gradient: 'bg-gradient-to-r from-accent-purple to-accent-blue text-white shadow-neon-purple hover:shadow-neon-blue hover:scale-105',
    }

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-5 text-base',
      lg: 'h-13 px-7 text-lg',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {variant === 'gradient' && (
          <div className="absolute inset-0 bg-gradient-to-r from-accent-blue to-accent-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        )}
        <span className="relative z-10 flex items-center">
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              처리 중...
            </>
          ) : (
            children
          )}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
