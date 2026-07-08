import { z } from 'zod';

import debug from 'debug';

import type { LobeChatDatabase } from '@/database/type';
import { AiGenerationService } from '@/server/services/aiGeneration';

const log = debug('lobe-server:project-memory-service');

const SYSTEM_PROMPT = `You are a context-extraction assistant for project memory.

Given a conversation excerpt, extract ONLY new, concrete, non-obvious facts about the user's project, goals, constraints, or decisions that are worth remembering for future conversations.

Rules:
- Return a concise markdown bullet list (each item starts with "- ")
- Focus on: project goals, key decisions, constraints, stakeholders, timelines, success criteria
- Skip generic statements or anything already obvious from context
- If nothing meaningful is worth saving, return an empty string
- Do NOT add headers or extra formatting — only bullet points`;

const OUTPUT_SCHEMA = {
  properties: {
    text: { description: 'Markdown bullet list of extracted facts, or empty string', type: 'string' },
  },
  required: ['text'],
  type: 'object',
};

const OutputSchema = z.object({ text: z.string() });

export class ProjectMemoryService {
  private readonly db: LobeChatDatabase;
  private readonly userId: string;
  private readonly workspaceId?: string;

  constructor(db: LobeChatDatabase, userId: string, workspaceId?: string) {
    this.db = db;
    this.userId = userId;
    this.workspaceId = workspaceId;
  }

  async extract({
    topicId,
    modelConfig,
  }: {
    agentId: string;
    modelConfig: { model: string; provider: string };
    topicId: string;
  }): Promise<{ memory: string }> {
    const rows = await this.db.query.messages.findMany({
      columns: { content: true, role: true },
      limit: 20,
      orderBy: (m, { desc }) => desc(m.createdAt),
      where: (m, { and, eq, inArray, isNull }) =>
        and(
          this.workspaceId
            ? eq(m.workspaceId, this.workspaceId)
            : and(eq(m.userId, this.userId), isNull(m.workspaceId)),
          eq(m.topicId, topicId),
          isNull(m.threadId),
          inArray(m.role, ['user', 'assistant']),
        ),
    });

    if (rows.length === 0) return { memory: '' };

    const excerpt = rows
      .reverse()
      .map((r) => `${r.role === 'user' ? 'User' : 'Assistant'}: ${r.content ?? ''}`)
      .join('\n\n');

    const ai = new AiGenerationService(this.db, this.userId, this.workspaceId);
    let text = '';
    try {
      const raw = await ai.generateObject<{ text: string }>({
        messages: [
          { content: SYSTEM_PROMPT, role: 'system' as const },
          { content: `Conversation:\n\n${excerpt}`, role: 'user' as const },
        ],
        model: modelConfig.model,
        provider: modelConfig.provider,
        schema: OUTPUT_SCHEMA,
      });
      const parsed = OutputSchema.safeParse(raw);
      text = parsed.success ? (parsed.data.text ?? '').trim() : '';
    } catch (error) {
      log('LLM call failed: %O', error);
      return { memory: '' };
    }

    return { memory: text };
  }
}
