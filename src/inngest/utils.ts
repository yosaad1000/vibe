import { Sandbox } from "e2b";
import { AgentResult } from "@inngest/agent-kit";

export async function getSandbox(sandboxId: string) {
    const sandbox = await Sandbox.connect(sandboxId)
    return sandbox;
}

export function getLastAssistantMessage(result: AgentResult): string | undefined {
    const messages = result.output;
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.type === "text" && msg.role === "assistant") {
            const content = msg.content;
            if (typeof content === "string") return content;
            if (Array.isArray(content)) {
                return content
                    .filter((p) => p.type === "text")
                    .map((p) => p.text)
                    .join("");
            }
        }
    }
    return undefined;
}

