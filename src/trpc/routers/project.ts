import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { prisma } from '@/lib/db';

export const projectsRouter = createTRPCRouter({
  create: baseProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      const project = await prisma.project.create({
        data: { name: input.name },
      });
      return project;
    }),

  getAll: baseProcedure
    .query(async () => {
      const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
      return projects;
    }),

  getbyId: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      return project;
    })
});
