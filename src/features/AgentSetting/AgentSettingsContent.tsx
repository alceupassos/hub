import { type ReactNode } from 'react';
import { memo } from 'react';

import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { ChatSettingsTabs } from '@/store/global/initialState';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';

import AgentConnectors from './AgentConnectors';
import AgentDiscoveryQuestions from './AgentDiscoveryQuestions';
import AgentOpening from './AgentOpening';
import AgentSelfIteration from './AgentSelfIteration';

export interface AgentSettingsContentProps {
  loadingSkeleton: ReactNode;
  tab: ChatSettingsTabs;
}

const AgentSettingsContent = memo<AgentSettingsContentProps>(({ tab, loadingSkeleton }) => {
  const loading = useAgentStore(agentSelectors.isAgentConfigLoading);
  const { enableAgentSelfIteration, enableDiscoveryQuestions } = useServerConfigStore(featureFlagsSelectors);

  if (loading) return loadingSkeleton;

  return (
    <>
      {tab === ChatSettingsTabs.Opening && <AgentOpening />}
      {enableDiscoveryQuestions && tab === ChatSettingsTabs.DiscoveryQuestions && <AgentDiscoveryQuestions />}
      {enableAgentSelfIteration && tab === ChatSettingsTabs.SelfIteration && <AgentSelfIteration />}
      {tab === ChatSettingsTabs.Connector && <AgentConnectors />}
    </>
  );
});

export default AgentSettingsContent;
