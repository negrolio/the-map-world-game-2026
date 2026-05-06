import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant
  readonly isLoading?: boolean
  readonly children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'border-cyan-300/60 bg-cyan-400/20 text-cyan-100 hover:bg-cyan-300/25',
  secondary:
    'border-slate-500/50 bg-slate-700/40 text-slate-100 hover:bg-slate-700/60',
}

export function Button({
  variant = 'primary',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = [
    'inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300',
    variantStyles[variant],
    isLoading ? 'cursor-wait opacity-70' : '',
    disabled ? 'cursor-not-allowed opacity-50' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button {...props} className={classes} disabled={disabled ?? isLoading}>
      {isLoading ? 'Cargando...' : children}
    </button>
  )
}
