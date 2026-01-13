// import React from 'react';

export default function AIButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Trigger AI">
      AI 处理
    </button>
  );
}
