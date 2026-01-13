import React from 'react';
import styles from './Container.module.css';

type ContainerProps<T extends keyof JSX.IntrinsicElements = 'div'> = React.ComponentPropsWithoutRef<T> & {
  wide?: boolean;
  as?: T;
};

export function Container<T extends keyof JSX.IntrinsicElements = 'div'>({ wide = false, className, children, as, ...rest }: ContainerProps<T>) {
  const Tag = (as || 'div') as any;
  const cls = [styles.container, wide ? styles.wide : '', className].filter(Boolean).join(' ');
  return (
    <Tag className={cls} {...(rest as any)}>
      {children}
    </Tag>
  );
}

export default Container;
