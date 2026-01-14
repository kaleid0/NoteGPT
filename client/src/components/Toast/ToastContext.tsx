import React, { createContext, useContext, ReactNode } from 'react'
import { useToast, UseToastReturn } from './useToast'
import { ToastContainer } from './Toast'

const ToastContext = createContext<UseToastReturn | undefined>(undefined)

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const toastValues = useToast()

  return (
    <ToastContext.Provider value={toastValues}>
      {children}
      <ToastContainer toasts={toastValues.toasts} onRemove={toastValues.removeToast} />
    </ToastContext.Provider>
  )
}

export const useGlobalToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useGlobalToast must be used within a ToastProvider')
  }
  return context
}
