import { spawn } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const children = new Set();

async function main() {
  ensureEnvFile("apps/api/.env");
  ensureEnvFile("apps/mobile/.env");

  await run("docker compose up -d postgres redis pgbouncer");
  await waitForPort("Postgres", 5432);
  await waitForPort("Redis", 6379);
  await waitForPort("PgBouncer", 6432);

  await ensurePortFree("API", 4000);
  await ensurePortFree("Expo Metro", 8081);

  await run("pnpm --filter @medconnect/api prisma:migrate");
  await run("pnpm --filter @medconnect/api prisma:seed");

  const api = spawnLongRunning("pnpm api", "api");
  await waitForUrl("API health", "http://localhost:4000/health");

  spawnLongRunning("pnpm mobile", "mobile");
  console.log("\nMedConnect is running.");
  console.log("- API: http://localhost:4000");
  console.log("- Swagger: http://localhost:4000/docs");
  console.log("- Expo: follow the QR/link in the mobile terminal output\n");

  await waitForever(api);
}

function ensureEnvFile(relativePath) {
  const target = resolve(root, relativePath);
  if (existsSync(target)) return;
  copyFileSync(resolve(root, ".env.example"), target);
  console.log(`Created ${relativePath} from .env.example`);
}

// Commands are static, controlled strings (no user input), so passing the whole
// command via `shell: true` with an empty args array is safe and, unlike an args
// array, avoids Node's DEP0190 warning while still supporting Windows `.cmd` shims.
function run(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: root,
      stdio: "inherit",
      shell: true
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}

function spawnLongRunning(command, label) {
  const child = spawn(command, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" }
  });

  children.add(child);
  child.on("exit", () => children.delete(child));
  console.log(`Started ${label}`);
  return child;
}

async function ensurePortFree(label, port) {
  if (!(await canConnect(port))) return;
  throw new Error(
    `${label} port ${port} is already in use. Stop the other instance first ` +
      `(Windows: netstat -ano | findstr :${port}  then  taskkill /PID <pid> /F).`
  );
}

async function waitForPort(label, port, timeoutMs = 60_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect(port)) {
      console.log(`${label} is ready on port ${port}`);
      return;
    }
    await delay(500);
  }
  throw new Error(`${label} did not become ready on port ${port}`);
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForUrl(label, url, timeoutMs = 60_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`${label} is ready: ${url}`);
        return;
      }
    } catch {
      // API is still booting.
    }
    await delay(1000);
  }
  throw new Error(`${label} did not become ready: ${url}`);
}

function waitForever(child) {
  return new Promise((resolve) => child.on("exit", resolve));
}

function shutdown() {
  for (const child of children) child.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((error) => {
  console.error(error);
  shutdown();
});

