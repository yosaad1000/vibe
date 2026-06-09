import { Sandbox } from 'e2b';

// This function spins up a cloud sandbox, writes your HTML into it, and returns the live preview URL.
// Think of a sandbox as a tiny cloud VM that runs your generated app.

export async function createOrUpdateSandbox(
    html: string,
    sandboxId?: string // Optional[str] in Python — if we already have a sandbox, reuse it
): Promise<{ url: string; sandboxId: string }> {
    // like Python: sandbox = reconnect(id) if sandbox_id else create_new()
    let sandbox;
    if (sandboxId) {
        sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });
    } else {
        sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY });
    }

    // write the HTML file into the sandbox filesystem
    await sandbox.files.write('/var/www/html/index.html', html);

    // return the live preview URL and sandbox ID so we can reuse it next message
    return {
        url: `https://${sandbox.getHost(80)}`,
        sandboxId: sandbox.sandboxId,
    };
}
