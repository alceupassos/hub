import { z } from 'zod';

import { withScopedPermission } from '@/business/server/trpc-middlewares/rbacPermission';
import { wsCompatProcedure } from '@/business/server/trpc-middlewares/workspaceAuth';
import { router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';
import { ProjectMemoryService } from '@/server/services/projectMemory';

const ProjectMemoryExtractInputSchema = z.object({
  agentId: z.string(),
  modelConfig: z.object({
    model: z.string(),
    provider: z.string(),
  }),
  topicId: z.string(),
});

const projectMemoryProcedure = wsCompatProcedure.use(serverDatabase).use(async (opts) => {
  const { ctx } = opts;
  const wsId = ctx.workspaceId ?? undefined;
  return opts.next({
    ctx: {
      projectMemoryService: new ProjectMemoryService(ctx.serverDB, ctx.userId, wsId),
    },
  });
});

const projectMemoryWriteProcedure = projectMemoryProcedure.use(
  withScopedPermission('message:create'),
);

export const projectMemoryRouter = router({
  extract: projectMemoryWriteProcedure
    .input(ProjectMemoryExtractInputSchema)
    .mutation(async ({ input, ctx }) => ctx.projectMemoryService.extract(input)),
});
