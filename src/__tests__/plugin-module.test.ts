import { describe, expect, test } from 'bun:test'
import pluginModule from '../index.js'
import { toV2Models } from '../plugin-v2.js'

describe('package plugin module', () => {
  test('uses the kiro provider id in the default export', () => {
    expect(pluginModule.id).toBe('kiro')
  })

  test('exposes setup for OpenCode 2 and server for OpenCode 1', () => {
    expect(typeof pluginModule.setup).toBe('function')
    expect(typeof pluginModule.server).toBe('function')
  })
})

describe('toV2Models', () => {
  const registry = {
    auto: {
      name: 'Auto (1.0x)',
      limit: { context: 200000, output: 64000 },
      modalities: { input: ['text', 'image', 'pdf'], output: ['text'] }
    },
    'claude-sonnet-5-5-thinking': {
      name: 'Claude Sonnet 5.5 Thinking (1.3x)',
      limit: { context: 1000000, output: 64000 },
      modalities: { input: ['text'], output: ['text'] },
      variants: { high: { thinkingConfig: { thinkingBudget: 65536 } } }
    }
  }

  test('maps limits, modalities and names', () => {
    const [auto] = toV2Models('kiro', registry)
    expect(String(auto?.id)).toBe('auto')
    expect(String(auto?.providerID)).toBe('kiro')
    expect(auto?.name).toBe('Auto (1.0x)')
    expect(auto?.limit).toEqual({ context: 200000, output: 64000 })
    expect(auto?.capabilities.input).toEqual(['text', 'image', 'pdf'])
    expect(auto?.variants).toEqual([])
  })

  test('maps variants to settings that carry thinkingConfig', () => {
    const thinking = toV2Models('kiro', registry).find(
      (m) => String(m.id) === 'claude-sonnet-5-5-thinking'
    )
    expect(thinking?.variants.map((v) => ({ ...v }))).toEqual([
      { id: 'high', settings: { thinkingConfig: { thinkingBudget: 65536 } } }
    ] as any)
  })
})
