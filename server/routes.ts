import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processOrder } from "./worker";
import { api, errorSchemas } from "@shared/routes";
import os from "os";
import { execSync } from "child_process";
import { OrderStatus, OrderTypes } from "@shared/schema";
import { randomUUID } from "crypto";
import { z } from "zod";

// Helper for Envelope Response
function respond(res: any, data: any = null, error: any = null, status: number = 200, version: string = "v1") {
  const meta = {
    request_id: randomUUID(), // In a real app, from req context
    server_time: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
    version: version
  };

  const body = {
    ok: !error,
    data: data,
    error: error ? {
      code: error.code || "UNKNOWN_ERROR",
      message: error.message || "An error occurred",
      details: error.details || {}
    } : null,
    meta
  };
  
  res.status(status).json(body);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Seed command logic (triggered via API or script, but here we can just ensure the local runner exists)
  // Check if seed needed
  const existingRunners = await storage.getRunners();
  if (existingRunners.length === 0) {
     await storage.createRunner({
       id: "r_local",
       name: "local-runner",
       createdAt: new Date().toISOString(),
       lastSeenAt: new Date().toISOString(),
       ttlSeconds: 60,
       labels: "{}", 
     });
     console.log("Seeded default runner: r_local");
  }

  // --- API Routes ---

  // 0) GET /api/health
  app.get("/api/health", (req, res) => {
    respond(res, { status: "ok", timestamp: new Date().toISOString() });
  });

  // 0.1) GET /api/platform/detect
  app.get("/api/platform/detect", async (req, res) => {
    const detectCommand = (cmd: string) => {
      try {
        execSync(cmd, { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    };

    const platformData = {
      os: {
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        arch: os.arch(),
      },
      systemd: {
        detected: detectCommand('systemctl --version'),
        active: detectCommand('systemctl is-system-running'),
      },
      docker: {
        detected: detectCommand('docker --version'),
        running: detectCommand('docker info'),
      },
      supabase: {
        detected: false, // Backend-only detection, usually not present on VPS
      },
      ports: {
        80: detectCommand('lsof -i :80'),
        443: detectCommand('lsof -i :443'),
        8080: true, // Current service port
      }
    };

    respond(res, platformData, null, 200);
  });

  // 1) GET /runners
  app.get(api.runners.list.path, async (req, res) => {
    try {
      const runners = await storage.getRunners();
      respond(res, runners);
    } catch (e) {
      respond(res, null, { code: "INTERNAL", message: String(e) }, 500);
    }
  });

  // 2) GET /runners/:id
  app.get(api.runners.get.path, async (req, res) => {
    try {
      const runner = await storage.getRunner(req.params.id);
      if (!runner) {
        return respond(res, null, { code: "NOT_FOUND", message: "Runner not found" }, 404);
      }
      respond(res, runner);
    } catch (e) {
      respond(res, null, { code: "INTERNAL", message: String(e) }, 500);
    }
  });

  // 3) GET /runners/:id/orders
  app.get(api.runners.listOrders.path, async (req, res) => {
    try {
      const runnerId = req.params.id;
      // Basic validation that runner exists
      const runner = await storage.getRunner(runnerId);
      if (!runner) {
        return respond(res, null, { code: "NOT_FOUND", message: "Runner not found" }, 404);
      }
      
      const limit = Number(req.query.limit) || 50;
      const orders = await storage.getOrders(runnerId, limit);
      respond(res, orders);
    } catch (e) {
      respond(res, null, { code: "INTERNAL", message: String(e) }, 500);
    }
  });

  // 4) GET /evidences
  app.get(api.evidences.list.path, async (req, res) => {
    try {
      const runnerId = req.query.runner_id as string | undefined;
      const orderId = req.query.order_id as string | undefined;

      if (!runnerId && !orderId) {
        return respond(res, null, { code: "BAD_REQUEST", message: "Either runner_id or order_id is required" }, 400);
      }

      const list = await storage.getEvidences({ runnerId, orderId });
      respond(res, list);
    } catch (e) {
      respond(res, null, { code: "INTERNAL", message: String(e) }, 500);
    }
  });

  // 5) POST /runners/:id/orders
  app.post(api.runners.createOrder.path, async (req, res) => {
    try {
      const runnerId = req.params.id;
      const body = api.runners.createOrder.input.parse(req.body);
      
      const runner = await storage.getRunner(runnerId);
      if (!runner) {
        return respond(res, null, { code: "NOT_FOUND", message: "Runner not found" }, 404);
      }

      // Idempotence check
      if (body.client_request_id) {
        const existing = await storage.getOrderByClientRequestId(runnerId, body.type, body.client_request_id);
        if (existing) {
          return respond(res, existing, null, 200);
        }
      }

      const newOrder = await storage.createOrder({
        id: randomUUID(),
        runnerId: runnerId,
        type: body.type,
        status: OrderStatus.QUEUED,
        createdAt: new Date().toISOString(),
        clientRequestId: body.client_request_id,
        summary: "Queued for execution"
      });

      // Trigger Async Worker
      // In a real message queue system, we'd push to queue.
      // Here we just fire and forget (or setImmediate)
      setImmediate(() => processOrder(newOrder.id));

      respond(res, newOrder, null, 201);

    } catch (e) {
      if (e instanceof z.ZodError) {
        return respond(res, null, { code: "VALIDATION_ERROR", message: "Invalid input", details: e.errors }, 400);
      }
      respond(res, null, { code: "INTERNAL", message: String(e) }, 500);
    }
  });

  // 6) DELETE /runners/:id
  app.delete(api.runners.delete.path, async (req, res) => {
    try {
      const runnerId = req.params.id;
      const runner = await storage.getRunner(runnerId);
      if (!runner) {
        return respond(res, null, { code: "NOT_FOUND", message: "Runner not found" }, 404);
      }
      
      await storage.deleteRunner(runnerId);
      respond(res, { deleted: true, id: runnerId });
    } catch (e) {
      respond(res, null, { code: "INTERNAL", message: String(e) }, 500);
    }
  });

  return httpServer;
}
