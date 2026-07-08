'use client';

import { Languages, Lightbulb, MessageSquareDot, Sparkles } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Action from '@/features/ChatInput/ActionBar/components/Action';

import { usePromptTransform } from './usePromptTransform';

interface PromptTransformActionProps {
  isDiscoveryMode?: boolean;
  mode: 'image' | 'video' | 'text';
  onPromptChange: (prompt: string) => void;
  prompt?: string | null;
}

const PromptTransformAction = memo<PromptTransformActionProps>(
  ({ isDiscoveryMode = false, mode, onPromptChange, prompt }) => {
    const { t } = useTranslation('common');

    const {
      isTransformDisabled,
      isTransforming,
      transformAction,
      isRewriteEnabled,
      refineDiscoveryAnswer,
      rewritePrompt,
      translatePrompt,
    } = usePromptTransform({
      isDiscoveryMode,
      mode,
      onPromptChange,
      prompt,
    });

    const menuItems = useMemo(
      () =>
        isDiscoveryMode
          ? [
              {
                icon: <MessageSquareDot size={16} />,
                key: 'discovery',
                label: t('promptTransform.actions.refineDiscovery'),
                onClick: refineDiscoveryAnswer,
              },
              {
                icon: <Languages size={16} />,
                key: 'translate',
                label: t('promptTransform.actions.translate'),
                onClick: translatePrompt,
              },
            ]
          : [
              {
                icon: <Sparkles size={16} />,
                key: 'rewrite',
                label: t('promptTransform.actions.rewrite'),
                onClick: rewritePrompt,
              },
              {
                icon: <Languages size={16} />,
                key: 'translate',
                label: t('promptTransform.actions.translate'),
                onClick: translatePrompt,
              },
            ],
      [isDiscoveryMode, refineDiscoveryAnswer, rewritePrompt, t, translatePrompt],
    );

    const handlePrimaryAction = useMemo(() => {
      if (isDiscoveryMode) return refineDiscoveryAnswer;
      return isRewriteEnabled ? rewritePrompt : translatePrompt;
    }, [isDiscoveryMode, isRewriteEnabled, refineDiscoveryAnswer, rewritePrompt, translatePrompt]);

    const dropdown = useMemo(() => {
      if (!isRewriteEnabled && !isDiscoveryMode) return undefined;

      return {
        menu: { items: menuItems },
        trigger: 'hover' as const,
      };
    }, [isDiscoveryMode, isRewriteEnabled, menuItems]);

    const primaryIcon = isDiscoveryMode ? MessageSquareDot : isRewriteEnabled ? Lightbulb : Languages;
    const isActionDisabled = isTransformDisabled || isTransforming;

    const statusKey = () => {
      if (!isTransforming) return null;
      if (transformAction === 'translate') return 'promptTransform.status.translate';
      if (transformAction === 'discovery') return 'promptTransform.status.refineDiscovery';
      return 'promptTransform.status.rewrite';
    };

    const titleKey = () => {
      if (isDiscoveryMode) return 'promptTransform.actions.refineDiscovery';
      return isRewriteEnabled ? 'promptTransform.action' : 'promptTransform.actions.translate';
    };

    return (
      <Action
        disabled={isActionDisabled}
        dropdown={dropdown}
        icon={primaryIcon}
        loading={isTransforming}
        title={isTransforming ? t(statusKey()!) : t(titleKey())}
        onClick={handlePrimaryAction}
      />
    );
  },
);

PromptTransformAction.displayName = 'PromptTransformAction';

export default PromptTransformAction;
