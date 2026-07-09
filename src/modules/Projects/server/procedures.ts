import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateSlug } from "random-word-slugs";
import { inngest } from "@/inngest/client";

export const ProjectsRouter = createTRPCRouter({
    getmany: baseProcedure.query(async () => {
        const projects = await prisma.project.findMany({
            orderBy: { updatedAt: "desc" },
        });
        return projects;
    }),
    create: baseProcedure
        .input(z.object({
            content: z.string().min(1, { message: "Content cannot be empty" })
                .max(10000, { message: "Content cannot exceed 100 characters" })
        }))
        .mutation(async ({ input }) => {
            const createdproject = await prisma.project.create({
                data: {
                    name: generateSlug(2, { format: "kebab" }),
                    messages: {
                        create: {
                            content: input.content,
                            role: "USER",
                            type: "RESULT",
                        },
                    },
                },
            });
            await inngest.send(
                {
                    name: "code-agent/run",
                    data:
                    {
                        text: input.content,
                        projectId: createdproject.id
                    }
                }
            )
            return createdproject;
        }),

});
