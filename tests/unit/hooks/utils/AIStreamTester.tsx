import React from 'react'
import { useAIStream } from '../../../../client/src/hooks/useAIStream'

export default function AIStreamTester({ onDelta }: { onDelta: (d: string) => void }) {
  const { start } = useAIStream()
  return (
    <div>
      <button data-testid="start-btn" onClick={() => start('input', { onDelta: onDelta })}>start</button>
    </div>
  )
}
