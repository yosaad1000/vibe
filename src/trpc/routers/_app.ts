import { createTRPCRouter } from '../init';
import { messagesRouter } from '@/modules/messages/server/procedures';
import { ProjectsRouter } from '@/modules/Projects/server/procedures';
import { usageRouter } from '@/modules/usage/server/procedure';



export const appRouter = createTRPCRouter({

  messages: messagesRouter,
  projects: ProjectsRouter,
  usage: usageRouter,

});
// export type definition of API
export type AppRouter = typeof appRouter;