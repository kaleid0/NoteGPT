// import React from 'react';

export default function AIButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      aria-label="Trigger AI"
      className="primary"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        border: 'none',
        color: 'white',
        padding: '0.6rem 1.2rem',
        fontWeight: 600,
        boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 6px 12px -1px rgba(99, 102, 241, 0.5)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(99, 102, 241, 0.4)';
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>✨</span>
      AI 处理
    </button>
  );
}
