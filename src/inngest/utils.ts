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

export const lastAssistantTextMessageContent = getLastAssistantMessage;

export function parseAgentOutput(output: unknown): string {
    if (typeof output === "string") return output;
    if (Array.isArray(output)) {
        return output
            .map((item) => {
                if (typeof item === "string") return item;
                if (item?.type === "text") {
                    if (typeof item.content === "string") return item.content;
                    if (typeof item.text === "string") return item.text;
                }
                return "";
            })
            .join("");
    }
    return "";
}


