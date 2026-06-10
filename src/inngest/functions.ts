import { inngest } from "./client";
import { createAgent, anthropic } from "@inngest/agent-kit";

export const processTask = inngest.createFunction(
    { id: "process-task", triggers: { event: "app/task.created" } },
    async ({ event }) => {
        const agent = createAgent({
            name: "Code writer",
            system: "You are an expert TypeScript programmer.",
            model: anthropic({
                model: "claude-haiku-4-5",
                defaultParameters: { max_tokens: 4096 },
            }),
        });
        const result = await agent.run(event.data.text);
        return { result };
    }
);
