import React from 'react';
import styles from './Textarea.module.css';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  showFocusStyle?: boolean;
};

export default function Textarea({ showFocusStyle = true, className, ...rest }: TextareaProps) {
  const cls = [styles.root, showFocusStyle ? styles.focus : '', className].filter(Boolean).join(' ');
  return <textarea className={cls} {...rest} />;
}
