/**
 * Global subagent model-routing policy (user-configurable tiers + toggle).
 *
 * Registers a prompt section in the HOST (global) scope, so it is merged into
 * every agent's system-prompt assembly. The whole configuration — the enable
 * switch and the economy/high-end model lists — lives in the `routing-policy`
 * settings namespace, edited from the dedicated Web settings page. The section
 * text is generated from the LIVE resolved value on every assembly, so changes
 * apply without a restart.
 *
 * Only `z` (schemastery, a CommonJS package) is loaded through `createRequire`;
 * the settings namespace is registered directly against the injected `settings`
 * service, so this plugin never `require()`s an ESM package.
 */

import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const profileRequire = createRequire(join(DSH_HOME, 'profiles', 'web', 'package.json'))
const z = profileRequire('@deepseek-ai/schemastery')

const NS = 'routing-policy'
const SECTION_NAME = 'agent:routing-policy'
const SECTION_ORDER = 2

/** One routed model entry: the provider route plus its model id. */
const ModelEntry = z.object({
  provider: z.string().required(),
  model: z.string().required(),
})

/** Default cheap/economy tier used until the user edits the mapping. */
const DEFAULT_ECONOMY = [{ provider: 'zai', model: 'glm-4.7-flash' }]
/** Default expensive/high-end tier used until the user edits the mapping. */
const DEFAULT_HIGH_END = [{ provider: 'deepseek-official', model: 'deepseek-v4-pro' }]

/**
 * Settings namespace schema. Resolution is schema-defaults → base → user layer,
 * so a partial user section (e.g. only `enabled`) never wipes the tiers, and an
 * explicitly written empty list means "none configured" for that tier.
 */
const Config = z.object({
  enabled: z.boolean().default(true),
  economy: z.array(ModelEntry).default(DEFAULT_ECONOMY),
  highEnd: z.array(ModelEntry).default(DEFAULT_HIGH_END),
})

/** Composition base layer: the same defaults, so clearing a field restores them. */
const BASE = {
  enabled: true,
  economy: DEFAULT_ECONOMY,
  highEnd: DEFAULT_HIGH_END,
}

/** Format one tier's entries as `provider/model` list text. */
function formatTier(entries) {
  const list = (entries ?? []).map((entry) => `${entry.provider}/${entry.model}`)
  return list.length > 0 ? list.join(', ') : '(none configured)'
}

/** Generate the imperative policy text from the current mapping. */
function renderPolicy(config) {
  return [
    '### Subagent model routing policy (mandatory)',
    'When you delegate work to a subagent, you MUST declare an explicit provider+model in that subagent call. NEVER start a subagent without an explicit model (never inherit the conversation model).',
    '',
    'Choose the model by task difficulty and tell the subagent its tier inside its prompt:',
    `- SIMPLE / MECHANICAL (format, copy/convert, search/retrieve, translate, rename, single-step): use an ECONOMY model — ${formatTier(config.economy)}. Tell it: "You are the ECONOMY model. Do simple mechanical work; do not fabricate."`,
    `- COMPLEX / REASONING / MULTI-STEP / PLANNING / SOLUTION / WRITING CODE: use a HIGH-END model — ${formatTier(config.highEnd)}. Tell it: "You are the HIGH-END model. Handle this with full care."`,
    '',
    'Never start a subagent without explicitly choosing a provider+model from the matching tier.',
  ].join('\n')
}

export const inject = ['settings', 'systemPrompt']

export function apply(ctx) {
  const scope = ctx.settings.register(NS, Config, { base: BASE })
  ctx.effect(() => ctx.systemPrompt.section({
    name: SECTION_NAME,
    order: SECTION_ORDER,
    text: () => {
      const state = scope.get()
      if (state.enabled === false) return ''
      return renderPolicy(state)
    },
  }))
}
