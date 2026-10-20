import { expect, test } from 'claude-code/testing'
import type { ConfigRow } from 'claude-code'
import { byPlugin, friendlyName, isBuiltin, parseValue, shown, suggestions } from './rows'

const row = (key: string, plugin: string, kind: ConfigRow['kind'], value: ConfigRow['value']): ConfigRow => ({
  key,
  label: key,
  kind,
  value,
  provider: { plugin, tier: 'user' as never },
  isLocked: false,
})

test('agrupa por mod, os internos no fim, sem as opções do próprio Claude Code', () => {
  const groups = byPlugin([
    row('theme', 'engine', 'choice', 'dark'),
    row('x.a', 'cc-plugin-agents-md@builtin', 'choice', 'a'),
    row('b.x', 'b@m', 'text', ''),
    row('a.y', 'a@m', 'number', 1),
    row('b.z', 'b@m', 'boolean', true),
  ])
  expect(groups.map(g => g.plugin)).toEqual(['a@m', 'b@m', 'cc-plugin-agents-md@builtin'])
  expect(groups[1]!.rows.map(r => r.key)).toEqual(['b.x', 'b.z'])
})

test('reconhece os mods internos', () => {
  expect(isBuiltin('cc-plugin-agents-md@builtin')).toBe(true)
  expect(isBuiltin('modo-conversa@mods-jarvis')).toBe(false)
})

test('nome amigável do mod', () => {
  expect(friendlyName('modo-conversa@mods-jarvis')).toBe('Modo Jarvis')
  expect(friendlyName('cc-plugin-agents-md@builtin')).toBe('Instruções do projeto')
  expect(friendlyName('meu-mod-novo@x')).toBe('Meu mod novo')
  expect(friendlyName('solto')).toBe('Solto')
})

test('converte o texto digitado para o tipo da opção', () => {
  expect(parseValue(row('a.n', 'a', 'number', 1), ' 1500 ')).toEqual({ value: 1500 })
  expect(parseValue(row('a.n', 'a', 'number', 1), 'abc')).toEqual({ error: 'precisa ser um número' })
  expect(parseValue(row('a.t', 'a', 'text', 'x'), 'pt-BR')).toEqual({ value: 'pt-BR' })
  expect(parseValue(row('a.l', 'a', 'text', ['a']), 'um, dois ,')).toEqual({ value: ['um', 'dois'] })
})

test('mostra o valor como texto', () => {
  expect(shown(true)).toBe('ligado')
  expect(shown(false)).toBe('desligado')
  expect(shown(['a', 'b'])).toBe('a, b')
  expect(shown(1200)).toBe('1200')
})

test('o nome da voz vira lista conforme a voz da resposta', () => {
  const voice = (value: string) => ({ ...row('modo-conversa.ttsVoice', 'modo-conversa@mods-jarvis', 'text', value) })
  const provider = (value: string) => row('modo-conversa.ttsProvider', 'modo-conversa@mods-jarvis', 'choice', value)
  const edge = suggestions(voice('pt-BR-AntonioNeural'), [provider('edge')])!
  expect(edge.map(o => o.value)).toContain('pt-BR-FranciscaNeural')
  expect(edge.find(o => o.value === 'pt-BR-AntonioNeural')?.label).toBe('Antonio — masculina, Brasil')
  const openai = suggestions(voice('onyx'), [provider('openai')])!
  expect(openai.map(o => o.value)).toContain('nova')
  expect(openai.map(o => o.value)).not.toContain('pt-BR-AntonioNeural')
  expect(suggestions(voice('abc123'), [provider('elevenlabs')])).toBeUndefined()
  expect(suggestions(voice('x'), [provider('browser')])).toBeUndefined()
  expect(suggestions(row('outro.nome', 'outro', 'text', 'x'), [])).toBeUndefined()
})

test('valor atual fora da lista continua como opção', () => {
  const voice = row('modo-conversa.ttsVoice', 'modo-conversa@mods-jarvis', 'text', 'pt-BR-AntonioNeural')
  const openai = suggestions(voice, [row('modo-conversa.ttsProvider', 'modo-conversa@mods-jarvis', 'choice', 'openai')])!
  expect(openai[0]).toEqual({ value: 'pt-BR-AntonioNeural', label: 'pt-BR-AntonioNeural (atual)' })
})
