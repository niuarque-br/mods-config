import { expect, test } from 'claude-code/testing'
import type { ConfigRow, On } from 'claude-code'

const PANE = {
  title: 'Configurações dos mods',
  isFocused: false,
  bodyColumns: 80,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
}
const SURFACES = ['terminal', 'desktop'] as const

function world(on: On, deny?: string) {
  const user = { tier: 'user' as never }
  const rows: ConfigRow[] = [
    { key: 'theme', label: 'Tema', kind: 'choice', value: 'dark', options: ['dark', 'light'], provider: { plugin: 'engine', tier: 'core' as never }, isLocked: false },
    { key: 'modo-conversa.ttsProvider', label: 'Voz da resposta', kind: 'choice', value: 'edge', options: ['edge', 'openai'], provider: { plugin: 'modo-conversa', ...user }, isLocked: false },
    { key: 'modo-conversa.ttsVoice', label: 'Nome da voz', kind: 'text', value: 'pt-BR-AntonioNeural', provider: { plugin: 'modo-conversa', ...user }, isLocked: false },
    { key: 'modo-conversa.silenceMs', label: 'Pausa que envia (ms)', kind: 'number', value: 1200, provider: { plugin: 'modo-conversa', ...user }, isLocked: false },
    { key: 'outro.ativo', label: 'Ativo', kind: 'boolean', value: false, provider: { plugin: 'outro', ...user }, isLocked: false },
    { key: 'outro.fixo', label: 'Fixo', kind: 'text', value: 'x', provider: { plugin: 'outro', ...user }, isLocked: true },
    { key: 'agents.mode', label: 'Project instructions', kind: 'choice', value: 'a', options: ['a', 'b'], provider: { plugin: 'cc-plugin-agents-md@builtin', ...user }, isLocked: false },
  ]
  const sets: { key: string; value: unknown }[] = []
  const opened: unknown[] = []
  const state = { ready: true }
  on('config.list', async () => ({ value: state.ready ? rows : [] }))
  on('config.set', async ($, e) => {
    if (deny) return { deny }
    sets.push({ key: e.key, value: e.value })
    const index = rows.findIndex(one => one.key === e.key)
    rows[index] = { ...rows[index]!, value: e.value }
    return { value: e.value }
  })
  on('command.register', async ($, e) => ({ value: { command: e.name } }))
  on('ui.open', async ($, e) => {
    opened.push(e)
    return { value: { isPlaced: true } }
  })
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>🎙 Modo Jarvis</Text>
  })
  return { sets, opened, state }
}

const BAND = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 9 }, view: {} }

for (const surface of SURFACES) {
  test(`o botão Config Mods na faixa abre o painel (${surface})`, async ($, on) => {
    const w = world(on)
    const ui = await $.ui.mount({ plugin: 'mods-config', surface, component: 'AbovePrompt', props: BAND })
    expect((await ui.find({ key: 'mods-config' }))?.text).toContain('Config Mods')
    expect(await ui.find({ text: '🎙 Modo Jarvis' })).toBeDefined()
    await ui.press({ key: 'mods-config' })
    expect(w.opened[0]).toMatchObject({ id: 'mods-config', title: 'Configurações dos mods' })
  })
}

test('a faixa some durante uma pesquisa', async ($, on) => {
  world(on)
  const ui = await $.ui.mount({ plugin: 'mods-config', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, hasSurvey: true } })
  expect(await ui.find({ key: 'mods-config' })).toBeUndefined()
  expect(await ui.find({ text: '🎙 Modo Jarvis' })).toBeDefined()
})

test('/mods-config abre o painel', async ($, on) => {
  const w = world(on)
  const ran = await $.command.run({ command: 'mods-config', args: '', origin: { kind: 'user' } as never, presentation: 'inline' as never })
  expect(ran).toMatchObject({ text: 'Painel de configurações dos mods aberto.' })
  expect(w.opened[0]).toMatchObject({ id: 'mods-config', title: 'Configurações dos mods' })
})

for (const surface of SURFACES) {
  test(`o painel lista só as opções dos mods (${surface})`, async ($, on) => {
    world(on)
    const ui = await $.ui.mount({ plugin: 'mods-config', surface, component: 'Pane', requestId: 'mods-config', props: PANE })
    expect(await ui.find({ text: 'Modo Jarvis' })).toBeDefined()
    expect(await ui.find({ text: 'Outro' })).toBeDefined()
    expect(await ui.find({ text: 'Seus mods' })).toBeDefined()
    expect(await ui.find({ text: 'Internos do Claude Code' })).toBeDefined()
    expect(await ui.find({ text: 'Instruções do projeto' })).toBeDefined()
    expect(await ui.find({ key: 'theme' })).toBeUndefined()
    expect(await ui.find({ key: 'modo-conversa.ttsProvider' })).toBeDefined()
    expect(await ui.find({ key: 'outro.fixo' })).toBeUndefined()
    expect(await ui.find({ text: 'x (bloqueado)' })).toBeDefined()
  })

  test(`escolher, digitar e alternar gravam a opção (${surface})`, async ($, on) => {
    const w = world(on)
    const ui = await $.ui.mount({ plugin: 'mods-config', surface, component: 'Pane', requestId: 'mods-config', props: PANE })
    await ui.select({ key: 'modo-conversa.ttsProvider', value: 'openai' })
    await ui.input({ key: 'modo-conversa.silenceMs', text: '1500', kind: 'submit' })
    await ui.press({ key: 'outro.ativo' })
    expect(w.sets).toEqual([
      { key: 'modo-conversa.ttsProvider', value: 'openai' },
      { key: 'modo-conversa.silenceMs', value: 1500 },
      { key: 'outro.ativo', value: true },
    ])
    expect((await ui.find({ key: 'outro.ativo' }))?.text).toContain('ligado')
    expect(await ui.find({ text: 'Salvo: Ativo' })).toBeDefined()
  })
}

test('no celular, sem campos, as opções aparecem só para leitura', async ($, on) => {
  world(on)
  const ui = await $.ui.mount({ plugin: 'mods-config', surface: 'mobile', component: 'Pane', requestId: 'mods-config', props: PANE })
  expect(await ui.find({ text: 'edge' })).toBeDefined()
  expect(await ui.find({ text: '1200' })).toBeDefined()
})

test('o Salvar do cartão grava o que foi digitado e não confirmado', async ($, on) => {
  const w = world(on)
  const ui = await $.ui.mount({ plugin: 'mods-config', surface: 'desktop', component: 'Pane', requestId: 'mods-config', props: PANE })
  await ui.input({ key: 'modo-conversa.silenceMs', text: '900', kind: 'change' })
  expect(w.sets).toEqual([])
  await ui.press({ key: 'save:modo-conversa' })
  expect(w.sets).toEqual([{ key: 'modo-conversa.silenceMs', value: 900 }])
  expect(await ui.find({ text: 'Salvo: Pausa que envia (ms)' })).toBeDefined()
})

test('o nome da voz é um combo que grava na hora', async ($, on) => {
  const w = world(on)
  const ui = await $.ui.mount({ plugin: 'mods-config', surface: 'desktop', component: 'Pane', requestId: 'mods-config', props: PANE })
  expect((await ui.find({ key: 'modo-conversa.ttsVoice' }))?.type).toBe('Select')
  await ui.select({ key: 'modo-conversa.ttsVoice', value: 'pt-BR-FranciscaNeural' })
  expect(w.sets).toEqual([{ key: 'modo-conversa.ttsVoice', value: 'pt-BR-FranciscaNeural' }])
})

test('abrir de novo relê as opções que ainda não existiam', async ($, on) => {
  const w = world(on)
  w.state.ready = false
  const pane = await $.ui.mount({ plugin: 'mods-config', surface: 'desktop', component: 'Pane', requestId: 'mods-config', props: PANE })
  const band = await $.ui.mount({ plugin: 'mods-config', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await pane.find({ text: 'Nenhum mod instalado tem opções.' })).toBeDefined()
  w.state.ready = true
  await band.press({ key: 'mods-config' })
  expect(await pane.find({ text: 'Modo Jarvis' })).toBeDefined()
})

test('o Recarregar do painel vazio relê as opções', async ($, on) => {
  const w = world(on)
  w.state.ready = false
  const pane = await $.ui.mount({ plugin: 'mods-config', surface: 'desktop', component: 'Pane', requestId: 'mods-config', props: PANE })
  w.state.ready = true
  await pane.press({ key: 'reload' })
  expect(await pane.find({ text: 'Modo Jarvis' })).toBeDefined()
})

test('número inválido não grava e avisa', async ($, on) => {
  const w = world(on)
  const ui = await $.ui.mount({ plugin: 'mods-config', surface: 'desktop', component: 'Pane', requestId: 'mods-config', props: PANE })
  await ui.input({ key: 'modo-conversa.silenceMs', text: 'rápido', kind: 'submit' })
  expect(w.sets).toEqual([])
  expect(await ui.find({ text: 'Pausa que envia (ms): precisa ser um número' })).toBeDefined()
})

test('recusa do Claude Code aparece no painel', async ($, on) => {
  world(on, 'valor fora da lista')
  const ui = await $.ui.mount({ plugin: 'mods-config', surface: 'desktop', component: 'Pane', requestId: 'mods-config', props: PANE })
  await ui.press({ key: 'outro.ativo' })
  expect(await ui.find({ text: 'Não salvei Ativo: valor fora da lista' })).toBeDefined()
})
