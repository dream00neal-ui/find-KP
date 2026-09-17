const STORAGE_KEY = 'kp-agent.mvp-sessions.v1'
const MAX_SESSIONS = 30

function isValidEntry(entry) {
  return Boolean(
    entry &&
    typeof entry.id === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.savedAt === 'string' &&
    typeof entry.rounds === 'number' &&
    entry.summary &&
    Array.isArray(entry.messages),
  )
}

export function loadKpSessions() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidEntry).slice(0, MAX_SESSIONS)
  } catch {
    return []
  }
}

export function saveKpSessions(entries) {
  const next = entries.filter(isValidEntry).slice(0, MAX_SESSIONS)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // localStorage unavailable: history stays in the current session only.
  }
  return next
}

export function upsertKpSession(entries, entry) {
  return saveKpSessions([entry, ...entries.filter((item) => item.id !== entry.id)])
}

export function formatSessionTime(value) {
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} 分钟前`
  if (diff < 24 * 60 * 60 * 1000 && new Date().getDate() === date.getDate()) {
    return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(date)
  }
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
}
