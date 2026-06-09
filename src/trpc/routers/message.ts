import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { prisma } from '@/lib/db';
import { generateCode } from '@/lib/gemini';
import { createOrUpdateSandbox } from '@/lib/e2b';

export const messagesRouter = createTRPCRouter({
    send: baseProcedure
        .input(z.object({
            projectId: z.string(),
            content: z.string(),
        }))
        .mutation(async ({ input }) => {
            // Step 1: save the user's message to the DB
            await prisma.message.create({
                data: {
                    role: 'user',
                    content: input.content,
                    projectId: input.projectId,
                },
            });

            // Step 2: load the full conversation history for this project
            const messages = await prisma.message.findMany({
                where: { projectId: input.projectId },
                orderBy: { createdAt: 'asc' },
            });

            // Step 3: call Gemini with the full history, get back HTML
            const html = await generateCode(
                messages.map((m) => ({ role: m.role, content: m.content }))
            );

            // Step 4: save the AI's response to the DB
            const assistantMessage = await prisma.message.create({
                data: {
                    role: 'assistant',
                    content: html,
                    projectId: input.projectId,
                },
            });

            // Step 5: get the project to check if it already has a sandbox
            const project = await prisma.project.findUnique({
                where: { id: input.projectId },
            });

            // Step 6: create or reuse the sandbox, write the HTML into it
            const { url } = await createOrUpdateSandbox(
                html,
                project?.sandboxUrl ?? undefined,
            );


            // Step 7: save the sandbox URL back to the project
            await prisma.project.update({
                where: { id: input.projectId },
                data: { sandboxUrl: url },
            });

            return { message: assistantMessage, sandboxUrl: url };
        }),
});
