'use client';

import { Flexbox } from '@lobehub/ui';
import { createStaticStyles, cssVar } from 'antd-style';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';

import { useConversationStore } from '../store';

const useStyles = createStaticStyles(({ css, keyframes }) => {
  const slideIn = keyframes`
    from { opacity: 0; transform: translateX(16px); }
    to   { opacity: 1; transform: translateX(0); }
  `;

  return {
    coin: css`
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      line-height: 1;
      flex-shrink: 0;
    `,
    container: css`
      animation: ${slideIn} 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;

      display: flex;
      flex-direction: row;
      gap: 12px;
      align-items: stretch;

      padding: 10px 14px;
      margin-block-start: 8px;
      border: 1px solid ${cssVar.colorBorderSecondary};
      border-radius: 12px;

      background: ${cssVar.colorFillQuaternary};
    `,
    counter: css`
      font-size: 11px;
      font-weight: 600;
      color: ${cssVar.colorTextTertiary};
      letter-spacing: 0.5px;
      text-transform: uppercase;
    `,
    divider: css`
      width: 1px;
      background: ${cssVar.colorBorderSecondary};
      flex-shrink: 0;
    `,
    label: css`
      font-size: 12px;
      color: ${cssVar.colorTextSecondary};
      line-height: 1.5;
    `,
    progressBar: css`
      height: 3px;
      border-radius: 2px;
      background: ${cssVar.colorFillSecondary};
      overflow: hidden;
      margin-block-start: 6px;
    `,
    progressFill: css`
      height: 100%;
      border-radius: 2px;
      background: ${cssVar.colorText};
      transition: width 0.4s ease;
    `,
    textBlock: css`
      display: flex;
      flex-direction: column;
      justify-content: center;
      flex: 1;
      min-width: 0;
    `,
  };
});

interface DiscoveryBannerProps {
  messageId: string;
}

const DiscoveryBanner = memo<DiscoveryBannerProps>(({ messageId }) => {
  const { t } = useTranslation('setting');
  const styles = useStyles();

  const agentId = useAgentStore(agentSelectors.currentAgentId);
  const chatConfig = useAgentStore((s) =>
    agentId ? s.agentMap[agentId]?.chatConfig : undefined,
  );

  const displayMessages = useConversationStore((s) => s.displayMessages);

  const discoveryState = useMemo(() => {
    if (!chatConfig?.enableDiscoveryQuestions) return null;

    const max = chatConfig.discoveryQuestionsMax ?? 8;
    const assistantMessages = displayMessages.filter((m) => m.role === 'assistant');
    const count = assistantMessages.length;

    if (count === 0 || count >= max) return null;

    const lastAssistantId = assistantMessages.at(-1)?.id;
    if (lastAssistantId !== messageId) return null;

    return { count, max };
  }, [chatConfig, displayMessages, messageId]);

  if (!discoveryState) return null;

  const { count, max } = discoveryState;
  const progress = Math.round((count / max) * 100);

  return (
    <div className={styles.container}>
      <div className={styles.coin}>🪙</div>
      <div className={styles.divider} />
      <div className={styles.textBlock}>
        <Flexbox horizontal align="center" justify="space-between">
          <span className={styles.label}>
            {t('settingDiscoveryQuestions.banner.label')}
          </span>
          <span className={styles.counter}>
            {count}/{max}
          </span>
        </Flexbox>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
});

DiscoveryBanner.displayName = 'DiscoveryBanner';

export default DiscoveryBanner;
