import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { storage } from "./storage";
import { OrderStatus } from "@shared/schema";
import { randomUUID } from "crypto";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

function parseJSONBlock(text: string, marker: string): any | null {
  // Simple extraction: find the marker, try to parse the JSON object following it?
  // Or is it embedded in the text?
  // "Extraire les blocs ORDER_RESULT_JSON et PLATFORM_FACTS_JSON depuis stdout (si présents)"
  // Usually this means looking for `ORDER_RESULT_JSON: { ... }` or similar.
  // We'll assume it might be printed as a JSON string on a line.
  
  try {
    const lines = text.split('\n');
    for (const line of lines) {
       // A robust implementation would look for the block boundaries. 
       // For this MVP, let's assume the script prints the JSON on its own line or after a marker.
       // Let's search for the first occurrence of the key in a JSON object structure.
       
       // Actually, let's look for a block that might be valid JSON if we strip text.
       // But simpler: The requirements say "Produire stdout contenant ORDER_RESULT_JSON: {...}".
       // We'll search for the string "ORDER_RESULT_JSON:" and then try to parse the rest of the line or block.
       
       const idx = line.indexOf(marker + ":");
       if (idx !== -1) {
         const jsonStr = line.substring(idx + marker.length + 1).trim();
         return JSON.parse(jsonStr);
       }
    }
  } catch (e) {
    // ignore parse errors
  }
  return null;
}

async function runShellCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { shell: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? -1 });
    });
  });
}

export async function processOrder(orderId: string) {
  const order = await storage.getOrder(orderId);
  if (!order) return;

  try {
    await storage.updateOrder(order.id, { 
      status: OrderStatus.RUNNING, 
      startedAt: new Date().toISOString() 
    });

    // Execute Checks
    // Test 1: Filesystem (write temp file)
    let filesystemOk = false;
    try {
      const tempFile = `temp_check_${randomUUID()}.txt`;
      await fs.writeFile(tempFile, "ok");
      await fs.unlink(tempFile);
      filesystemOk = true;
    } catch (e) {
      filesystemOk = false;
    }

    // Test 2: Docker
    const dockerResult = await runShellCommand("docker", ["--version"]);
    const dockerOk = dockerResult.exitCode === 0;

    // Test 3: Compose
    const composeResult = await runShellCommand("docker-compose", ["--version"]);
    const composeOk = composeResult.exitCode === 0;
    
    // Construct Output
    // We mimic the output required
    const checks = {
      filesystem_ok: filesystemOk,
      docker_ok: dockerOk,
      compose_ok: composeOk
    };

    const success = filesystemOk; // As per requirements "si filesystem_ok=false => exit_code!=0 et success=false"
    const exitCode = success ? 0 : 1;

    const platformFacts = {
      component: "runner",
      checks: checks
    };

    const orderResult = {
      success: success,
      type: order.type,
      checks: checks,
      timestamp: new Date().toISOString()
    };

    // Synthesize stdout
    let stdout = "";
    stdout += `Checking filesystem... ${filesystemOk ? 'OK' : 'FAIL'}\n`;
    stdout += `Checking docker... ${dockerOk ? 'OK' : 'FAIL'} (${dockerResult.stdout.trim()})\n`;
    stdout += `Checking compose... ${composeOk ? 'OK' : 'FAIL'} (${composeResult.stdout.trim()})\n`;
    stdout += `\nORDER_RESULT_JSON: ${JSON.stringify(orderResult)}\n`;
    stdout += `PLATFORM_FACTS_JSON: ${JSON.stringify(platformFacts)}\n`;

    const stderr = dockerResult.stderr + composeResult.stderr;

    // Create Evidence
    const evidence = await storage.createEvidence({
      id: randomUUID(),
      runnerId: order.runnerId,
      orderId: order.id,
      createdAt: new Date().toISOString(),
      stdout: stdout,
      stderr: stderr,
      exitCode: exitCode
    });

    // Update Order
    await storage.updateOrder(order.id, {
      status: success ? OrderStatus.SUCCEEDED : OrderStatus.FAILED,
      finishedAt: new Date().toISOString(),
      exitCode: exitCode,
      evidenceId: evidence.id,
      summary: success ? "Checks passed" : "Checks failed"
    });

    // Parse & Persist Facts if present
    const parsedFacts = parseJSONBlock(stdout, "PLATFORM_FACTS_JSON");
    let factsRefUpdate = {};
    
    if (parsedFacts) {
      const factsRecord = await storage.createFacts({
        id: randomUUID(),
        component: "runner",
        runnerId: order.runnerId,
        orderId: order.id,
        evidenceId: evidence.id,
        checkedAt: new Date().toISOString(),
        checks: JSON.stringify(checks),
        raw: JSON.stringify(parsedFacts)
      });
      
      factsRefUpdate = {
        facts_ref: {
          facts_id: factsRecord.id,
          order_id: order.id,
          evidence_id: evidence.id,
          checked_at: factsRecord.checkedAt
        }
      };
    }

    // Update Runner
    await storage.updateRunner(order.runnerId, {
      lastSeenAt: new Date().toISOString(),
      ...factsRefUpdate
    });

  } catch (err) {
    logger.error({ err, orderId }, "Order execution failed internally");
    await storage.updateOrder(orderId, {
      status: OrderStatus.FAILED,
      finishedAt: new Date().toISOString(),
      exitCode: 999,
      summary: "Internal Worker Error"
    });
  }
}
