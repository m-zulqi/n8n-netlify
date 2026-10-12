import { spawn } from "node:child_process";

const PORT = 5678;
let child = null;

function dbEnv() {
    const u = new URL(process.env.NETLIFY_DATABASE_URL);
    return {
        DB_TYPE: "postgresdb",
        DB_POSTGRESDB_HOST: u.hostname,
        DB_POSTGRESDB_PORT: u.port || "5432",
        DB_POSTGRESDB_DATABASE: u.pathname.slice(1),
        DB_POSTGRESDB_USER: decodeURIComponent(u.username),
        DB_POSTGRESDB_PASSWORD: decodeURIComponent(u.password),
        DB_POSTGRESDB_SSL_ENABLED: "true",
    };
}

function boot() {
    if (child) return;
    child = spawn(
        process.execPath,
        [`${process.cwd()}/node_modules/n8n/bin/n8n`, "start"],
        {
            stdio: "inherit",
            env: {
                ...process.env,
                ...dbEnv(),
                N8N_PORT: String(PORT),
                N8N_LISTEN_ADDRESS: "127.0.0.1",
                N8N_USER_FOLDER: "/tmp",
                N8N_PUSH_BACKEND: "sse",
                N8N_PROXY_HOPS: "1",
                N8N_DIAGNOSTICS_ENABLED: "false",
                EXECUTIONS_MODE: "regular",
            },
        }
    );
    child.on("exit", () => { child = null; });
}

async function isUp() {
    try {
        return (await fetch(`http://127.0.0.1:${PORT}/healthz`)).ok;
    } catch {
        return false;
    }
}

export default async (req) => {
    boot();
    if (!(await isUp())) {
        return new Response("n8n is starting, retry in a few seconds.", {
            status: 503,
            headers: { "retry-after": "5" },
        });
    }
    const url = new URL(req.url);
    return fetch(`http://127.0.0.1:${PORT}${url.pathname}${url.search}`, {
        method: req.method,
        headers: req.headers,
        body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
        duplex: "half",
        redirect: "manual",
    });
};

export const config = { path: "/*" };