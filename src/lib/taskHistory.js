const STORAGE_KEY = 'kp-agent.task-history.v1'
const MAX_HISTORY = 20

function isValidEntry(entry) {
  return Boolean(
    entry &&
    typeof entry.id === 'string' &&
    typeof entry.completedAt === 'string' &&
    entry.brief &&
    Array.isArray(entry.results) &&
    entry.trace &&
    entry.outcome,
  )
}

export function loadTaskHistory() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidEntry).slice(0, MAX_HISTORY)
  } catch {
    return []
  }
}

export function saveTaskHistory(entries) {
  const next = entries.filter(isValidEntry).slice(0, MAX_HISTORY)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // History remains available for the current page when storage is unavailable.
  }
  return next
}

export function prependTaskHistory(entries, entry) {
  return saveTaskHistory([entry, ...entries.filter((item) => item.id !== entry.id)])
}
