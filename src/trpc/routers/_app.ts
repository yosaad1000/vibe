
import { createTRPCRouter } from '../init';
import { projectsRouter } from './project';
import { messagesRouter } from './message';
import { baseProcedure } from '../init';
import { z } from 'zod'
import { inngest } from '@/inngest/client';
export const appRouter = createTRPCRouter({
  projects: projectsRouter,
  messages: messagesRouter,
  invoke: baseProcedure
    .input(z.object({
      text: z.string(),
    }))
    .mutation(async ({ input }) => {
      await inngest.send(
        {
          name: "app/task.created",
          data:
            { text: input.text }
        }
      )
    })

});
// export type definition of API
export type AppRouter = typeof appRouter;