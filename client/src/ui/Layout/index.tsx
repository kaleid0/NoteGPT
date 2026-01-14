import React from 'react'
import styles from './Container.module.css'

type ContainerProps<T extends React.ElementType = 'div'> = {
  as?: T
  wide?: boolean
  children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'children'>

export function Container<T extends React.ElementType = 'div'>({
  wide = false,
  className,
  children,
  as,
  ...rest
}: ContainerProps<T>) {
  const Tag: React.ElementType = as || 'div'
  const cls = [styles.container, wide ? styles.wide : '', className].filter(Boolean).join(' ')
  const props = { ...(rest as React.ComponentPropsWithoutRef<T>), className: cls }
  return React.createElement(Tag, props, children)
}

export default Container
