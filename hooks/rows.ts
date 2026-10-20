import type { ConfigRow, ConfigValue } from 'claude-code'

export type PluginRows = { plugin: string; rows: ConfigRow[] }

const NAMES: Record<string, string> = {
  'modo-conversa': 'Modo Jarvis',
  'mods-config': 'Config Mods',
  'cc-plugin-agents-md': 'Instruções do projeto',
}

export type Suggestion = { value: string; label?: string }

const EDGE_VOICES: Suggestion[] = [
  { value: 'pt-BR-AntonioNeural', label: 'Antonio — masculina, Brasil' },
  { value: 'pt-BR-FranciscaNeural', label: 'Francisca — feminina, Brasil' },
  { value: 'pt-BR-ThalitaMultilingualNeural', label: 'Thalita — feminina, Brasil' },
  { value: 'pt-PT-DuarteNeural', label: 'Duarte — masculina, Portugal' },
  { value: 'pt-PT-RaquelNeural', label: 'Raquel — feminina, Portugal' },
]
const OPENAI_VOICES: Suggestion[] = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'].map(
  value => ({ value }),
)

// Lists for free-text fields whose good values depend on another field of the same mod.
const SUGGESTIONS: Record<string, { from: string; lists: Record<string, Suggestion[]> }> = {
  'ttsVoice': { from: 'ttsProvider', lists: { edge: EDGE_VOICES, openai: OPENAI_VOICES } },
}

function field(key: string): { prefix: string; name: string } {
  const at = key.lastIndexOf('.')
  return { prefix: key.slice(0, at), name: key.slice(at + 1) }
}

export function suggestions(row: ConfigRow, rows: readonly ConfigRow[]): Suggestion[] | undefined {
  const { prefix, name } = field(row.key)
  if (prefix.split('@')[0] !== 'modo-conversa') return undefined
  const rule = SUGGESTIONS[name]
  if (!rule) return undefined
  const source = rows.find(other => other.key === `${prefix}.${rule.from}`)
  const list = source ? rule.lists[String(source.value)] : undefined
  if (!list) return undefined
  const current = String(row.value)
  return list.some(item => item.value === current) || !current ? list : [{ value: current, label: `${current} (atual)` }, ...list]
}

export function isBuiltin(plugin: string): boolean {
  return plugin.endsWith('@builtin')
}

export function friendlyName(plugin: string): string {
  const bare = plugin.split('@')[0] ?? plugin
  const known = NAMES[bare]
  if (known) return known
  const words = bare.replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function byPlugin(rows: readonly ConfigRow[]): PluginRows[] {
  const groups = new Map<string, ConfigRow[]>()
  for (const row of rows) {
    const plugin = row.provider.plugin
    if (plugin === 'engine') continue
    groups.set(plugin, [...(groups.get(plugin) ?? []), row])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => Number(isBuiltin(a)) - Number(isBuiltin(b)) || a.localeCompare(b))
    .map(([plugin, list]) => ({ plugin, rows: list }))
}

export function parseValue(row: ConfigRow, text: string): { value: ConfigValue } | { error: string } {
  const trimmed = text.trim()
  if (row.kind === 'number') {
    const value = Number(trimmed)
    return trimmed && Number.isFinite(value) ? { value } : { error: 'precisa ser um número' }
  }
  if (Array.isArray(row.value)) {
    return { value: trimmed.split(',').map(part => part.trim()).filter(Boolean) }
  }
  return { value: trimmed }
}

export function shown(value: ConfigValue): string {
  if (typeof value === 'boolean') return value ? 'ligado' : 'desligado'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}
