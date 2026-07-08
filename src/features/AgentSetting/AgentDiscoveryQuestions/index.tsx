'use client';

import { Form } from '@lobehub/ui';
import { Button, Input, Slider, Space, Switch } from 'antd';
import isEqual from 'fast-deep-equal';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { FORM_STYLE } from '@/const/layoutTokens';

import { selectors, useStore } from '../store';

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const AgentDiscoveryQuestions = memo(() => {
  const { t } = useTranslation('setting');
  const [form] = Form.useForm();
  const [disabled, updateConfig] = useStore((s) => [s.disabled, s.setChatConfig]);
  const config = useStore(selectors.currentChatConfig, isEqual);

  const memory = config.projectMemory ?? '';

  const handleExportMd = useCallback(() => {
    downloadFile(
      memory || `# Project Memory\n\n${t('settingDiscoveryQuestions.memory.empty')}`,
      'project-memory.md',
      'text/markdown',
    );
  }, [memory, t]);

  const handleExportJson = useCallback(() => {
    downloadFile(
      JSON.stringify({ exportedAt: new Date().toISOString(), projectMemory: memory }, null, 2),
      'project-memory.json',
      'application/json',
    );
  }, [memory]);

  const handleClear = useCallback(() => {
    if (!window.confirm(t('settingDiscoveryQuestions.memory.clearConfirm'))) return;
    updateConfig({ projectMemory: '' });
  }, [updateConfig, t]);

  return (
    <Form
      disabled={disabled}
      footer={<Form.SubmitFooter />}
      form={form}
      initialValues={config}
      items={[
        {
          children: <Switch />,
          desc: t('settingDiscoveryQuestions.enabled.desc'),
          label: t('settingDiscoveryQuestions.enabled.title'),
          layout: 'horizontal' as const,
          minWidth: undefined,
          name: 'enableDiscoveryQuestions',
          valuePropName: 'checked',
        },
        {
          children: (
            <Slider
              max={8}
              min={1}
              marks={{ 1: '1', 2: '2', 4: '4', 6: '6', 8: '8' }}
              step={1}
              tooltip={{ formatter: (v) => t('settingDiscoveryQuestions.max.tooltip', { count: v }) }}
            />
          ),
          desc: t('settingDiscoveryQuestions.max.desc'),
          label: t('settingDiscoveryQuestions.max.title'),
          name: 'discoveryQuestionsMax',
        },
        {
          children: (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input.TextArea
                readOnly
                autoSize={{ maxRows: 12, minRows: 4 }}
                placeholder={t('settingDiscoveryQuestions.memory.empty')}
                value={memory}
              />
              <Space>
                <Button disabled={!memory} size="small" onClick={handleExportMd}>
                  {t('settingDiscoveryQuestions.memory.export.md')}
                </Button>
                <Button disabled={!memory} size="small" onClick={handleExportJson}>
                  {t('settingDiscoveryQuestions.memory.export.json')}
                </Button>
                <Button danger disabled={!memory} size="small" onClick={handleClear}>
                  {t('settingDiscoveryQuestions.memory.clear')}
                </Button>
              </Space>
            </Space>
          ),
          desc: undefined,
          label: t('settingDiscoveryQuestions.memory.title'),
          name: 'projectMemory',
        },
      ]}
      itemsType={'flat'}
      variant={'borderless'}
      onFinish={(values) => {
        if (disabled) return;
        updateConfig(values);
      }}
      {...FORM_STYLE}
    />
  );
});

export default AgentDiscoveryQuestions;
