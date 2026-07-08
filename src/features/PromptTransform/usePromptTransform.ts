import { chainRewriteGenerationPrompt, chainTranslate } from '@lobechat/prompts';
import type { ChatStreamPayload } from '@lobechat/types';
import { useCallback, useState } from 'react';

import { chatService } from '@/services/chat';
import { useUserStore } from '@/store/user';
import { systemAgentSelectors } from '@/store/user/selectors';
import { merge } from '@/utils/merge';

interface UsePromptTransformParams {
  isDiscoveryMode?: boolean;
  mode: 'image' | 'video' | 'text';
  onPromptChange: (prompt: string) => void;
  prompt?: string | null;
}

type PromptTransformAction = 'rewrite' | 'translate' | 'discovery';

const DISCOVERY_REFINE_SYSTEM_PROMPT = `You are helping a user craft a detailed, structured answer to a discovery question posed by an AI assistant.

Your job: expand and enrich the user's reply while keeping their core intent exactly intact.

Rules:
- Keep the same language as the user's input
- Expand vague or short answers with specific, concrete details about goals, constraints, timeline, audience, or stakeholders — if implied or inferable
- Keep the result natural and in first person
- Do NOT introduce new requirements the user did not hint at
- Output ONLY the refined answer — no commentary, no meta-text`;

const chainRefineDiscoveryAnswer = (prompt: string): Partial<ChatStreamPayload> => ({
  messages: [
    { content: DISCOVERY_REFINE_SYSTEM_PROMPT, role: 'system' as const },
    { content: prompt, role: 'user' as const },
  ],
});

export const usePromptTransform = ({
  isDiscoveryMode = false,
  mode,
  prompt,
  onPromptChange,
}: UsePromptTransformParams) => {
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformAction, setTransformAction] = useState<PromptTransformAction>('rewrite');

  const rewriteConfig = useUserStore(systemAgentSelectors.promptRewrite);
  const translateConfig = useUserStore(systemAgentSelectors.translation);
  const isRewriteActionEnabled = rewriteConfig?.enabled ?? false;

  const getConfigByAction = useCallback(
    (action: PromptTransformAction) => {
      // Strip config-only fields (enabled, customPrompt); strict upstreams reject unknown OpenAI params.
      const config = action === 'translate' ? translateConfig : rewriteConfig;
      if (!config) return {};
      return { model: config.model, provider: config.provider };
    },
    [rewriteConfig, translateConfig],
  );

  const runTransform = useCallback(
    async (action: PromptTransformAction) => {
      if (isTransforming || !prompt?.trim()) return;
      if (action === 'rewrite' && !isRewriteActionEnabled) return;

      let transformedPrompt = '';
      setTransformAction(action);

      try {
        await chatService.fetchPresetTaskResult({
          onError: () => {
            setIsTransforming(false);
          },
          onFinish: async (text) => {
            const nextPrompt = text.trim() || transformedPrompt.trim();
            if (nextPrompt) onPromptChange(nextPrompt);
          },
          onLoadingChange: setIsTransforming,
          onMessageHandle: (chunk) => {
            if (chunk.type === 'text') transformedPrompt += chunk.text;
          },
          params: merge(
            getConfigByAction(action),
            action === 'discovery'
              ? chainRefineDiscoveryAnswer(prompt)
              : action === 'rewrite'
                ? chainRewriteGenerationPrompt({ mode, prompt })
                : chainTranslate(prompt, 'English'),
          ),
        });
      } finally {
        setIsTransforming(false);
        setTransformAction('rewrite');
      }
    },
    [getConfigByAction, isRewriteActionEnabled, isTransforming, mode, onPromptChange, prompt],
  );

  const rewritePrompt = useCallback(async () => {
    await runTransform('rewrite');
  }, [runTransform]);

  const translatePrompt = useCallback(async () => {
    await runTransform('translate');
  }, [runTransform]);

  const refineDiscoveryAnswer = useCallback(async () => {
    await runTransform('discovery');
  }, [runTransform]);

  return {
    isDiscoveryMode,
    isRewriteEnabled: isRewriteActionEnabled,
    isTransformDisabled: !prompt?.trim(),
    isTransforming,
    refineDiscoveryAnswer,
    rewritePrompt,
    transformAction,
    translatePrompt,
  };
};
