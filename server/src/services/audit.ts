type Event = { type: string; payload: any; ts: number }

const events: Event[] = []

export function logEvent(type: string, payload: any) {
  events.push({ type, payload, ts: Date.now() })
}

export function getEvents() {
  return events.slice()
}

export function clearEvents() {
  events.length = 0
}
