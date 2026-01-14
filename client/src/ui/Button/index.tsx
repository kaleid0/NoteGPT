import React from 'react'
import styles from './Button.module.css'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'default'
  size?: 'small' | 'normal'
}

export default function Button({
  variant = 'default',
  size = 'normal',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.root,
    variant === 'primary' ? styles.primary : '',
    variant === 'ghost' ? styles.ghost : '',
    size === 'small' ? styles.small : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
