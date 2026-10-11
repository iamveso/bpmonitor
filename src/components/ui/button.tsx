import { cva, type VariantProps } from 'class-variance-authority'
import { type JSX, splitProps } from 'solid-js'

import { cn } from '../../lib/utils'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        gradient:
          'bg-gradient-to-r from-brand via-brand-2 to-brand-3 text-white shadow-lg shadow-brand/25 hover:brightness-110',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        outline:
          'border border-border bg-background/60 hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-brand underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-6 text-[0.95rem]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ['class', 'variant', 'size'])

  return (
    <button
      class={cn(
        buttonVariants({ variant: local.variant, size: local.size }),
        local.class,
      )}
      {...rest}
    />
  )
}
