import { inngest } from "./client";
import { createAgent, anthropic } from "@inngest/agent-kit";
import { Sandbox } from 'e2b'
import { getSandbox } from "./utils";

const sandbox = await Sandbox.create() // Needs E2B_API_KEY environment variable
const result = await sandbox.commands.run('echo "Hello from E2B Sandbox!"')
console.log(result.stdout)

export const processTask = inngest.createFunction(
    { id: "process-task", triggers: { event: "app/task.created" } },
    async ({ event, step }) => {
        const SandboxId = await step.run("get-sandbox-id", async () => {
            const sandbox = await Sandbox.create("yosaad1000/vibe-nextjs-test3");
            return sandbox.sandboxId
        })
        const agent = createAgent({
            name: "Code writer",
            system: "You are an expert TypeScript programmer.",
            model: anthropic({
                model: "claude-haiku-4-5",
                defaultParameters: { max_tokens: 4096 },
            }),
        });

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await getSandbox(SandboxId)
            const host = sandbox.getHost(3000);
            return `https://${host}`;
        });
        const result = await agent.run(event.data.text);
        return { result, sandboxUrl };
    }
);
