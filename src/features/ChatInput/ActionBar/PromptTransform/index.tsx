'use client';

import { memo, useCallback } from 'react';

import PromptTransformAction from '@/features/PromptTransform/PromptTransformAction';
import { useAgentStore } from '@/store/agent';
import { chatConfigSelectors } from '@/store/agent/selectors';

import { useChatInputStore } from '../../store';

const PromptTransform = memo(() => {
  const [editor, markdownContent] = useChatInputStore((s) => [s.editor, s.markdownContent]);
  const isDiscoveryMode = useAgentStore(
    (s) => chatConfigSelectors.currentChatConfig(s).enableDiscoveryQuestions === true,
  );

  const onPromptChange = useCallback(
    (prompt: string) => {
      if (!editor) return;
      // `keepHistory` prevents setDocument from wiping the undo/redo stacks.
      editor.setDocument('markdown', prompt, { keepHistory: true });
    },
    [editor],
  );

  // Image mode expands vague inputs; text mode forbids expansion.
  return (
    <PromptTransformAction
      isDiscoveryMode={isDiscoveryMode}
      mode={'image'}
      prompt={markdownContent}
      onPromptChange={onPromptChange}
    />
  );
});

PromptTransform.displayName = 'PromptTransform';

export default PromptTransform;
