import { type LobeAgentChatConfig } from '@lobechat/types';
import { useMemo } from 'react';

import { projectMemoryService } from '@/services/projectMemory';
import { useAgentStore } from '@/store/agent';
import { useUserStore } from '@/store/user';
import { systemAgentSelectors } from '@/store/user/slices/settings/selectors/systemAgent';

import { type ConversationHooks } from '../types';

interface UseProjectMemoryParams {
  agentChatConfig: LobeAgentChatConfig | undefined;
  agentId: string | undefined;
  topicId: string | undefined;
}

export const useProjectMemory = ({
  agentChatConfig,
  agentId,
  topicId,
}: UseProjectMemoryParams): ConversationHooks => {
  const globalConfig = useUserStore(systemAgentSelectors.projectMemory);

  const effective = useMemo(() => {
    const globalEnabled = globalConfig.enabled === true;
    const hasValidModel = !!globalConfig.model && !!globalConfig.provider;
    const discoveryEnabled = agentChatConfig?.enableDiscoveryQuestions === true;
    return globalEnabled && hasValidModel && discoveryEnabled;
  }, [
    globalConfig.enabled,
    globalConfig.model,
    globalConfig.provider,
    agentChatConfig?.enableDiscoveryQuestions,
  ]);

  return useMemo<ConversationHooks>(() => {
    if (!effective || !agentId || !topicId) return {};

    return {
      onAssistantTurnSettled: async (_messageId, { reason }) => {
        if (reason === 'stopped') return;

        const existing = agentChatConfig?.projectMemory ?? '';

        const result = await projectMemoryService.extract({
          agentId,
          modelConfig: { model: globalConfig.model, provider: globalConfig.provider },
          topicId,
        });

        if (!result?.memory) return;

        const merged = existing
          ? `${existing}\n${result.memory}`
          : `# Project Memory\n\n${result.memory}`;

        await useAgentStore.getState().updateAgentChatConfigById(agentId, {
          projectMemory: merged,
        });
      },
    };
  }, [
    effective,
    agentId,
    topicId,
    globalConfig.model,
    globalConfig.provider,
    agentChatConfig?.projectMemory,
  ]);
};
