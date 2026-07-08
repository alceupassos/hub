import { lambdaClient } from '@/libs/trpc/client';

export interface ProjectMemoryExtractInput {
  agentId: string;
  modelConfig: { model: string; provider: string };
  topicId: string;
}

export interface ProjectMemoryExtractResult {
  memory: string;
}

class ProjectMemoryService {
  async extract(
    input: ProjectMemoryExtractInput,
    signal?: AbortSignal,
  ): Promise<ProjectMemoryExtractResult | null> {
    try {
      return await lambdaClient.projectMemory.extract.mutate(input, { signal });
    } catch (err) {
      if (signal?.aborted) return null;
      if (err instanceof DOMException && err.name === 'AbortError') return null;
      console.warn('[ProjectMemory] extract failed', err);
      return null;
    }
  }
}

export const projectMemoryService = new ProjectMemoryService();
