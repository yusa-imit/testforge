/**
 * Development script - runs both server and web concurrently
 */
import { spawn } from "bun";

const BUN = process.env.HOME + "/.bun/bin/bun";
const BUN_DIR = process.env.HOME + "/.bun/bin";

// Add bun to PATH for spawned processes
const env = {
  ...process.env,
  PATH: `${BUN_DIR}:${process.env.PATH}`,
};

async function main() {
  console.log("🚀 Starting TestForge development servers...\n");

  // Start server
  const server = spawn([BUN, "run", "dev"], {
    cwd: "./packages/server",
    stdout: "inherit",
    stderr: "inherit",
    env,
  });

  // Start web
  const web = spawn([BUN, "run", "dev"], {
    cwd: "./packages/web",
    stdout: "inherit",
    stderr: "inherit",
    env,
  });

  console.log("📦 Server: http://localhost:3001");
  console.log("🌐 Web: http://localhost:3000\n");

  // Wait for both processes
  await Promise.all([server.exited, web.exited]);
}

main().catch(console.error);
