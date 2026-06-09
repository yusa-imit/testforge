import type { DuckDBDatabase, WebhookEvent } from "../db/database";
import type { TestRun } from "@testforge/core";
import { logger } from "../utils/logger";

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: {
    runId: string;
    scenarioId: string;
    scenarioName?: string;
    status: string;
    duration?: number;
    summary?: TestRun["summary"];
  };
}

function runStatusToEvent(status: string): WebhookEvent | null {
  switch (status) {
    case "passed": return "run.passed";
    case "failed": return "run.failed";
    case "healed": return "run.healed";
    case "cancelled": return null;
    default: return null;
  }
}

async function computeHmacSignature(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

export async function dispatchWebhooks(
  db: DuckDBDatabase,
  run: TestRun,
  scenarioName?: string
): Promise<void> {
  const specificEvent = runStatusToEvent(run.status);
  if (!specificEvent) return;

  const payload: WebhookPayload = {
    event: specificEvent,
    timestamp: new Date().toISOString(),
    data: {
      runId: run.id,
      scenarioId: run.scenarioId,
      scenarioName,
      status: run.status,
      duration: run.duration,
      summary: run.summary,
    },
  };

  // Collect webhooks subscribed to this specific event OR run.completed
  const [specificHooks, completedHooks] = await Promise.all([
    db.getEnabledWebhooksForEvent(specificEvent),
    db.getEnabledWebhooksForEvent("run.completed"),
  ]);

  // Deduplicate by id (a webhook may subscribe to both)
  const seen = new Set<string>();
  const hooks = [...specificHooks, ...completedHooks].filter((h) => {
    if (seen.has(h.id)) return false;
    seen.add(h.id);
    return true;
  });

  if (hooks.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    hooks.map(async (hook) => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": "TestForge-Webhook/1.0",
          "X-TestForge-Event": specificEvent,
        };

        if (hook.secret) {
          headers["X-TestForge-Signature"] = await computeHmacSignature(hook.secret, body);
        }

        const res = await fetch(hook.url, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          logger.warn("Webhook delivery failed", { hookId: hook.id, url: hook.url, status: res.status });
        } else {
          logger.debug("Webhook delivered", { hookId: hook.id, url: hook.url, event: specificEvent });
        }
      } catch (err) {
        logger.warn("Webhook delivery error", {
          hookId: hook.id,
          url: hook.url,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })
  );
}
