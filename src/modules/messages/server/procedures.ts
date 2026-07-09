import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { inngest } from "@/inngest/client";

export const messagesRouter = createTRPCRouter({
    getmany: baseProcedure.query(async () => {
        const messages = await prisma.message.findMany({
            orderBy: { updatedAt: "desc" },
        });
        return messages;
    }),
    create: baseProcedure
        .input(z.object({
            content: z.string().min(1, { message: "Content cannot be empty" }).max(10000, { message: "Content too Big" }),
            projectId: z.string().min(1, { message: "ProjectId is required" })
        }))
        .mutation(async ({ input }) => {
            const createdmessage = await prisma.message.create({
                data: {
                    projectId: input.projectId,
                    content: input.content,
                    role: "USER",
                    type: "RESULT",
                },
            });
            await inngest.send(
                {
                    name: "code-agent/run",
                    data:
                    {
                        text: input.content,
                        projectId: input.projectId,
                    }

                }
            )
            return createdmessage;
        }),

});
