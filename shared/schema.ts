import { pgTable, text, integer, boolean, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { sqliteTable, text as sqliteText, integer as sqliteInteger, blob as sqliteBlob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// NOTE: We are using SQLite as requested, so we use sqliteTable.
// Timestamps in SQLite are typically stored as integers (unix epoch) or strings (ISO). 
// We will use ISO strings for readability and compatibility.

export const runners = sqliteTable("runners", {
  id: sqliteText("id").primaryKey(), // User provided ID or UUID
  name: sqliteText("name").notNull(),
  createdAt: sqliteText("created_at").notNull(), // ISO
  lastSeenAt: sqliteText("last_seen_at").notNull(), // ISO
  ttlSeconds: sqliteInteger("ttl_seconds").default(60),
  labels: sqliteText("labels", { mode: "json" }).default("{}"), // JSON
  factsRef: sqliteText("facts_ref", { mode: "json" }), // JSON { facts_id, order_id, evidence_id, checked_at }
});

export const orders = sqliteTable("orders", {
  id: sqliteText("id").primaryKey(), // UUID
  runnerId: sqliteText("runner_id").notNull(),
  type: sqliteText("type").notNull(), // 'runner.selftest' | 'runner.reconcile'
  status: sqliteText("status").notNull(), // 'queued' | 'running' | 'succeeded' | 'failed'
  createdAt: sqliteText("created_at").notNull(),
  startedAt: sqliteText("started_at"),
  finishedAt: sqliteText("finished_at"),
  exitCode: sqliteInteger("exit_code"),
  summary: sqliteText("summary"),
  evidenceId: sqliteText("evidence_id"),
  clientRequestId: sqliteText("client_request_id"), // For idempotence
});

export const evidences = sqliteTable("evidences", {
  id: sqliteText("id").primaryKey(), // UUID
  runnerId: sqliteText("runner_id").notNull(),
  orderId: sqliteText("order_id").notNull(),
  createdAt: sqliteText("created_at").notNull(),
  stdout: sqliteText("stdout"),
  stderr: sqliteText("stderr"),
  exitCode: sqliteInteger("exit_code"),
});

export const facts = sqliteTable("facts", {
  id: sqliteText("id").primaryKey(), // UUID
  component: sqliteText("component").default("runner"),
  runnerId: sqliteText("runner_id").notNull(),
  orderId: sqliteText("order_id"),
  evidenceId: sqliteText("evidence_id"),
  checkedAt: sqliteText("checked_at").notNull(),
  checks: sqliteText("checks", { mode: "json" }), // JSON { filesystem_ok, docker_ok, compose_ok }
  raw: sqliteText("raw", { mode: "json" }), // JSON PLATFORM_FACTS_JSON
});

// schemas
export const insertRunnerSchema = createInsertSchema(runners);
export const insertOrderSchema = createInsertSchema(orders);
export const insertEvidenceSchema = createInsertSchema(evidences);
export const insertFactsSchema = createInsertSchema(facts);

export type Runner = typeof runners.$inferSelect;
export type InsertRunner = typeof runners.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export type Evidence = typeof evidences.$inferSelect;
export type InsertEvidence = typeof evidences.$inferInsert;

export type Facts = typeof facts.$inferSelect;
export type InsertFacts = typeof facts.$inferInsert;

// Enums
export const OrderTypes = {
  SELFTEST: "runner.selftest",
  RECONCILE: "runner.reconcile",
} as const;

export const OrderStatus = {
  QUEUED: "queued",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
} as const;
