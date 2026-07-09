import { inngest } from "./client";
import { createAgent, createNetwork, anthropic, createTool, type Tool } from "@inngest/agent-kit";
import { Sandbox } from "e2b";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getLastAssistantMessage, getSandbox } from "./utils";
import { PROMPT } from "@/prompt";

interface AgentState {
    files: { [path: string]: string };
    summary: string;
}

export const codeAgentfunction = inngest.createFunction(
    { id: "code-agent", triggers: [{ event: "code-agent/run" }] },
    async ({ event, step }) => {
        const sandboxId = await step.run("get-sandbox-id", async () => {
            const sandbox = await Sandbox.create("yosaad1000/vibe-nextjs-test3", {
                timeoutMs: 1000 * 60 * 10, // 10 minutes
            });
            return sandbox.sandboxId;
        });

        const agent = createAgent<AgentState>({
            name: "Code writer",
            system: PROMPT,
            model: anthropic({
                model: "claude-haiku-4-5",
                defaultParameters: { max_tokens: 16000 },
            }),
            tools: [
                createTool({
                    name: "terminal",
                    description: "use the terminal to run commands",
                    parameters: z.object({
                        commands: z.string(),
                    }),
                    handler: async ({ commands }, { step }) => {
                        return await step?.run("terminal", async () => {
                            const buffers = { stdout: "", stderr: "" };
                            try {
                                const sandbox = await getSandbox(sandboxId);
                                const result = await sandbox.commands.run(commands, {
                                    onStdout: (data: string) => { buffers.stdout += data; },
                                    onStderr: (data: string) => { buffers.stderr += data; },
                                });
                                return result;
                            } catch (e) {
                                return String(e);
                            }
                        });
                    },
                }),
                createTool({
                    name: "createOrUpdateFiles",
                    description: "create or modify files in the sandbox",
                    parameters: z.object({
                        files: z.array(z.object({
                            path: z.string(),
                            content: z.string(),
                        })),
                    }),
                    handler: async ({ files }, { step, network }: Tool.Options<AgentState>) => {
                        console.log(`[createOrUpdateFiles] received ${files?.length ?? 0} files:`, files?.map(f => f.path));
                        const newFiles = await step?.run("createOrUpdateFiles", async () => {
                            try {
                                const updatedFiles = network?.state.data.files || {};
                                const sandbox = await getSandbox(sandboxId);
                                for (const file of files) {
                                    // Claude sometimes drops the opening quote of "use client" 
                                    // when it's the first thing in a file content string
                                    const content = file.content.startsWith('use client')
                                        ? `"use client"` + file.content.slice('use client'.length)
                                        : file.content;
                                    console.log(`[write] ${file.path} first 30 chars:`, JSON.stringify(content.slice(0, 30)));
                                    await sandbox.files.write(file.path, content);
                                    updatedFiles[file.path] = content;
                                }
                                if (network) network.state.data.files = updatedFiles;
                                return updatedFiles;
                            } catch (e) {
                                return String(e);
                            }
                        });
                        if (typeof newFiles === "object") {
                            network.state.data.files = newFiles;
                        }
                    },
                }),
                createTool({
                    name: "readFiles",
                    description: "Read the contents of a file",
                    parameters: z.object({
                        files: z.array(z.string()),
                    }),
                    handler: async ({ files }, { step }) => {
                        return await step?.run("readFiles", async () => {
                            try {
                                const sandbox = await getSandbox(sandboxId);
                                const contents: { path: string; content: string }[] = [];
                                for (const file of files) {
                                    const content = await sandbox.files.read(file)
                                    contents.push({ path: file, content });
                                }
                                return JSON.stringify(contents);
                            } catch (e) {
                                return String(e);
                            }
                        });
                    },
                })
            ],
            lifecycle: {
                onResponse: async ({ result, network }) => {
                    const iter = network?.state.results.length ?? 0;
                    console.log(`[agent iter ${iter}] output:`, JSON.stringify(result.output, null, 2));
                    const lastAssistantmessagetext = getLastAssistantMessage(result);
                    if (lastAssistantmessagetext && network) {
                        if (lastAssistantmessagetext.includes("<task_summary>")) {
                            network.state.data.summary = lastAssistantmessagetext;
                        }
                    }
                    return result;

                }
            }
        });

        const network = createNetwork<AgentState>({
            name: "coding-agent-network",
            agents: [agent],
            maxIter: 15,
            defaultRouter: ({ network }) => {
                const iter = network.state.results.length;
                const lastResult = network.state.results.at(-1);
                console.log(`[router] iteration ${iter}, last output:`, lastResult?.output.map(m => m.type).join(", "));
                if (!lastResult) return agent;
                const summary = getLastAssistantMessage(lastResult);
                if (summary?.includes("<task_summary>")) return undefined;
                return agent;
            },
        });

        const result = await network.run(event.data.text);

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await getSandbox(sandboxId);
            const host = sandbox.getHost(3000);
            return `https://${host}`;
        });

        const isError = !result.state.data.summary || Object.keys(result.state.data.files || {}).length === 0;

        await step.run("save-summary", async () => {

            if (isError) {
                return await prisma.message.create({
                    data: {
                        projectId: event.data.projectId,
                        content: "An error occurred, but no summary was provided.",
                        role: "ASSISTANT",
                        type: "ERROR",
                    },
                });
            }
            return await prisma.message.create({
                data: {
                    projectId: event.data.projectId,
                    content: result.state.data.summary,
                    role: "ASSISTANT",
                    type: "RESULT",
                    fragment: {
                        create: {
                            sandboxUrl: sandboxUrl,
                            title: "Fragment",
                            files: result.state.data.files,
                        }
                    }
                },
            })
        });

        return {
            url: sandboxUrl,
            title: "Fragment",
            files: result.state.data.files,
            summary: result.state.data.summary
        }

    }
);
