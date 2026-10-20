import { atom, read, update } from 'claude-code'
import type { ConfigRow, ConfigValue, EngineInterface, Register } from 'claude-code'

import type { Drafts, Notice } from '../types'
import { byPlugin, friendlyName, isBuiltin, parseValue, shown, suggestions } from './rows'
import type { PluginRows } from './rows'

const PANE = 'mods-config'
const TITLE = 'Configurações dos mods'
const RESTART_HINT = 'Alguns mods só usam o valor novo depois de desligados e ligados de novo.'
const revision = atom({ plugin: 'mods-config', key: 'revision' } as const, 0)
const notice = atom({ plugin: 'mods-config', key: 'notice' } as const, { text: '', isError: false } as Notice)
const drafts = atom({ plugin: 'mods-config', key: 'drafts' } as const, {} as Drafts)

async function say($: EngineInterface, text: string, isError = false) {
  await update($, notice, () => ({ text, isError }))
  await update($, revision, n => n + 1)
}

async function forget($: EngineInterface, key: string) {
  await update($, drafts, all => {
    const { [key]: _dropped, ...rest } = all
    return rest
  })
}

async function save($: EngineInterface, row: ConfigRow, value: ConfigValue): Promise<boolean> {
  const result = await $.config.set({ key: row.key, value })
  if ('deny' in result && result.deny !== undefined) {
    await say($, `Não salvei ${row.label}: ${result.deny}`, true)
    return false
  }
  await forget($, row.key)
  await say($, `Salvo: ${row.label}`)
  return true
}

async function saveTyped($: EngineInterface, row: ConfigRow, text: string): Promise<boolean> {
  const parsed = parseValue(row, text)
  if ('error' in parsed) {
    await say($, `${row.label}: ${parsed.error}`, true)
    return false
  }
  return save($, row, parsed.value)
}

async function saveCard($: EngineInterface, group: PluginRows) {
  const pending = await read($, drafts)
  const edited = group.rows.filter(row => pending[row.key] !== undefined && pending[row.key] !== shown(row.value))
  if (!edited.length) {
    await say($, `Nada a salvar em ${friendlyName(group.plugin)}.`)
    return
  }
  const saved: string[] = []
  for (const row of edited) {
    if (!(await saveTyped($, row, pending[row.key]!))) return
    saved.push(row.label)
  }
  await say($, `Salvo: ${saved.join(', ')}`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'mods-config', description: 'Abre o painel com as opções dos mods' })
    return next(e)
  })

  on('command.run', { command: 'mods-config' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Painel de configurações dos mods aberto.' }
  })

  on('config.set', async ($, e, next) => {
    const result = await next(e)
    await update($, revision, n => n + 1)
    return result
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props.hasSurvey) return below
    const { Box, Button } = $.ui.resolve(e)
    return (
      <Box gap={1}>
        {below}
        <Button key="mods-config" label="⚙ Config Mods" onPress={() => $.ui.open({ id: PANE, title: TITLE })} />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text, Button } = elements
    const editable = e.surface !== 'mobile'
    const Input = editable && 'Input' in elements ? elements.Input : undefined
    const Select = editable && 'Select' in elements ? elements.Select : undefined
    await read($, revision)
    const message = await read($, notice)
    const pending = await read($, drafts)
    const rows = await $.config.list()
    const groups = byPlugin(rows)
    const mine = groups.filter(group => !isBuiltin(group.plugin))
    const builtins = groups.filter(group => isBuiltin(group.plugin))

    const control = (row: ConfigRow) => {
      if (row.isLocked) return <Text dimColor>{`${shown(row.value)} (bloqueado)`}</Text>
      if (row.kind === 'boolean') {
        return <Button key={row.key} label={shown(row.value)} onPress={() => save($, row, !row.value)} />
      }
      if (row.kind === 'choice' && row.options?.length && Select) {
        return (
          <Select
            key={row.key}
            options={row.options.map(value => ({ value }))}
            value={String(row.value)}
            onSelect={(value: string) => save($, row, value)}
          />
        )
      }
      const listed = Select ? suggestions(row, rows) : undefined
      if (listed && Select) {
        return (
          <Select key={row.key} options={listed} value={String(row.value)} onSelect={(value: string) => save($, row, value)} />
        )
      }
      if (Input) {
        return (
          <Input
            key={row.key}
            value={pending[row.key] ?? shown(row.value)}
            submitLabel="salvar"
            onInput={(text: string) => update($, drafts, all => ({ ...all, [row.key]: text }))}
            onSubmit={(text: string) => saveTyped($, row, text)}
          />
        )
      }
      return <Text>{shown(row.value)}</Text>
    }

    const card = (group: PluginRows) => {
      const typed = group.rows.some(row => !row.isLocked && (row.kind === 'text' || row.kind === 'number'))
      return (
        <Box flexDirection="column" borderStyle="round" borderDimColor paddingX={2} paddingY={1} marginBottom={1} gap={1}>
          <Box gap={1} alignItems="center">
            <Text size="heading" weight="semibold">
              {friendlyName(group.plugin)}
            </Text>
            <Text size="caption" dimColor>
              {group.plugin}
            </Text>
          </Box>
          {group.rows.map(row => (
            <Box flexDirection="row" gap={2} alignItems="center">
              <Box flexDirection="column" width="40%">
                <Text weight="medium">{row.label}</Text>
                {row.description && (
                  <Text size="caption" dimColor>
                    {row.description}
                  </Text>
                )}
              </Box>
              <Box flexGrow={1}>{control(row)}</Box>
            </Box>
          ))}
          {typed && Input && (
            <Box justifyContent="flex-end">
              <Button key={`save:${group.plugin}`} label="Salvar" variant="primary" onPress={() => saveCard($, group)} />
            </Box>
          )}
        </Box>
      )
    }

    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        {message.text && (
          <Box marginBottom={1}>
            <Text color={message.isError ? 'error' : 'success'}>{message.text}</Text>
          </Box>
        )}
        {groups.length === 0 && <Text dimColor>Nenhum mod instalado tem opções.</Text>}
        {mine.length > 0 && (
          <Box marginBottom={1}>
            <Text size="caption" weight="semibold" dimColor>
              Seus mods
            </Text>
          </Box>
        )}
        {mine.map(card)}
        {builtins.length > 0 && (
          <Box marginBottom={1} marginTop={1}>
            <Text size="caption" weight="semibold" dimColor>
              Internos do Claude Code
            </Text>
          </Box>
        )}
        {builtins.map(card)}
        <Text size="caption" dimColor>
          {RESTART_HINT}
        </Text>
      </Box>
    )
  })
}
