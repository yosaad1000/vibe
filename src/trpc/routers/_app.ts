import { createTRPCRouter } from '../init';
import { messagesRouter } from '@/modules/messages/server/procedures';
import { ProjectsRouter } from '@/modules/Projects/server/procedures';



export const appRouter = createTRPCRouter({

  messages: messagesRouter,
  projects: ProjectsRouter,


});
// export type definition of API
export type AppRouter = typeof appRouter;