export type Notice = { text: string; isError: boolean }
export type Drafts = Record<string, string>

declare module 'claude-code' {
  interface PluginState {
    'mods-config': { revision: number; notice: Notice; drafts: Drafts }
  }
}
