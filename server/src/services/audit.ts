type EventPayload = Record<string, unknown>

interface AuditEvent {
  type: string
  payload: EventPayload
  ts: number
}

const events: AuditEvent[] = []

export function logEvent(type: string, payload: EventPayload): void {
  events.push({ type, payload, ts: Date.now() })
}

export function getEvents(): AuditEvent[] {
  return events.slice()
}

export function clearEvents(): void {
  events.length = 0
}
