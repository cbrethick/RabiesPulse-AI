// Bridge to the on-device model (Android LocalAiPlugin). On the web there is no model:
// the assistant answers from the offline knowledge base instead. Nothing is sent to any server.
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { Lang } from './i18n';
import { retrieve, type Chunk } from './kb';
import { INTENTS, matchIntents } from './intents';

export type AiState = 'web' | 'idle' | 'missing' | 'unsupported' | 'copying' | 'loading' | 'ready' | 'error';
export interface AiStatus {
  state: AiState;
  progress: number;
  error?: string | null;
  backend?: string | null;
  model?: string;
}

interface LocalAiPlugin {
  status(): Promise<AiStatus>;
  init(): Promise<AiStatus>;
  generate(o: { id: string; prompt: string; system: string; history: { role: 'user' | 'model'; text: string }[] }): Promise<void>;
  cancel(): Promise<void>;
  addListener(ev: 'aiStatus', fn: (s: AiStatus) => void): Promise<PluginListenerHandle>;
  addListener(ev: 'aiToken', fn: (e: { id: string; text: string }) => void): Promise<PluginListenerHandle>;
  addListener(ev: 'aiDone', fn: (e: { id: string }) => void): Promise<PluginListenerHandle>;
  addListener(ev: 'aiError', fn: (e: { id: string; error: string }) => void): Promise<PluginListenerHandle>;
}

export const native = Capacitor.isNativePlatform();
export const LocalAi = registerPlugin<LocalAiPlugin>('LocalAi');

const LANG_NAME: Record<Lang, string> = { en: 'English', ta: 'Tamil', hi: 'Hindi' };

/** Grounded, safety-first instructions for the small model. */
export function buildPrompt(question: string, lang: Lang, extra?: string): { system: string; chunks: Chunk[] } {
  const chunks = retrieve(question, 3);
  // checked answers from the offline answer bank come first in the context
  const intents = matchIntents(question);
  const facts = [...intents.map((it) => it.a.en.replace(/\n/g, ' ')), ...chunks.map((c) => `${c.title}: ${c.text}`)];
  const context = facts.map((f, i) => `[${i + 1}] ${f}`).join('\n');
  const system = [
    'You are the RabiesPulse assistant for people in Chennai, India.',
    `Reply in ${LANG_NAME[lang]} using very simple words, at most 80 words, short bullet points.`,
    'Use ONLY the facts in CONTEXT. If the answer is not there, say you do not know and advise seeing a doctor.',
    'Never diagnose. Never say someone is safe. Never give vaccine doses, numbers of injections or day schedules.',
    'For any bite, scratch or lick on broken skin: tell them to wash the wound with soap and running water for 15 minutes and see a doctor today.',
    'For heavy bleeding or face/head wounds: tell them to call 108.',
    'CONTEXT:',
    context,
    extra ? `USER LOCATION INFO: ${extra}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return { system, chunks };
}

/** Remove any <think>…</think> block a reasoning model might still emit. */
export const cleanModelText = (t: string) => t.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').replace(/^\s+/, '');

export const intentCount = INTENTS.length;

/** Fallback answer when no model is available: the matching guide entries, verbatim. */
export const guideAnswer = (chunks: Chunk[]) => chunks.map((c) => `• ${c.title}: ${c.text}`).join('\n\n');
