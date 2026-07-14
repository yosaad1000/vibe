import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateSlug } from "random-word-slugs";
import { inngest } from "@/inngest/client";
import { TRPCError } from "@trpc/server";


export const ProjectsRouter = createTRPCRouter({
    getOne: baseProcedure
    .input(z.object({
            id: z.string().min(1, { message: "ProjectId is required" })
        }))
    .query(async ({ input }) => {
        const project = await prisma.project.findUnique({
            where: {
                id: input.id
            },
        });
        if(!project) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Project not found"
            });
        }
        return project;
    }),
    getMany: baseProcedure.query(async () => {
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
