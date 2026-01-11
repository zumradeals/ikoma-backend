import { db } from "./db";
import {
  runners, orders, evidences, facts,
  type Runner, type InsertRunner,
  type Order, type InsertOrder,
  type Evidence, type InsertEvidence,
  type Facts, type InsertFacts
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Runner ops
  getRunners(): Promise<Runner[]>;
  getRunner(id: string): Promise<Runner | undefined>;
  createRunner(runner: InsertRunner): Promise<Runner>;
  updateRunner(id: string, updates: Partial<Runner>): Promise<Runner>;
  deleteRunner(id: string): Promise<void>;

  // Order ops
  getOrders(runnerId: string, limit?: number): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByClientRequestId(runnerId: string, type: string, clientRequestId: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order>;

  // Evidence ops
  getEvidences(filters: { runnerId?: string; orderId?: string }): Promise<Evidence[]>;
  createEvidence(evidence: InsertEvidence): Promise<Evidence>;

  // Facts ops
  createFacts(fact: InsertFacts): Promise<Facts>;
  getLatestFacts(runnerId: string): Promise<Facts | undefined>;
}

export class SQLiteStorage implements IStorage {
  async getRunners(): Promise<Runner[]> {
    return await db.select().from(runners).orderBy(desc(runners.lastSeenAt));
  }

  async getRunner(id: string): Promise<Runner | undefined> {
    const [runner] = await db.select().from(runners).where(eq(runners.id, id));
    return runner;
  }

  async createRunner(runner: InsertRunner): Promise<Runner> {
    const [created] = await db.insert(runners).values(runner).returning();
    return created;
  }

  async updateRunner(id: string, updates: Partial<Runner>): Promise<Runner> {
    const [updated] = await db.update(runners)
      .set(updates)
      .where(eq(runners.id, id))
      .returning();
    return updated;
  }

  async deleteRunner(id: string): Promise<void> {
    await db.delete(runners).where(eq(runners.id, id));
  }

  async getOrders(runnerId: string, limit: number = 50): Promise<Order[]> {
    return await db.select()
      .from(orders)
      .where(eq(orders.runnerId, runnerId))
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrderByClientRequestId(runnerId: string, type: string, clientRequestId: string): Promise<Order | undefined> {
    const [order] = await db.select()
      .from(orders)
      .where(and(
        eq(orders.runnerId, runnerId),
        eq(orders.type, type),
        eq(orders.clientRequestId, clientRequestId)
      ));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const [updated] = await db.update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async getEvidences(filters: { runnerId?: string; orderId?: string }): Promise<Evidence[]> {
    let query = db.select().from(evidences);
    
    if (filters.orderId) {
      query = query.where(eq(evidences.orderId, filters.orderId)) as any;
    } else if (filters.runnerId) {
      query = query.where(eq(evidences.runnerId, filters.runnerId)) as any;
    }
    
    return await query.orderBy(desc(evidences.createdAt));
  }

  async createEvidence(evidence: InsertEvidence): Promise<Evidence> {
    const [created] = await db.insert(evidences).values(evidence).returning();
    return created;
  }

  async createFacts(fact: InsertFacts): Promise<Facts> {
    const [created] = await db.insert(facts).values(fact).returning();
    return created;
  }

  async getLatestFacts(runnerId: string): Promise<Facts | undefined> {
    const [fact] = await db.select()
      .from(facts)
      .where(eq(facts.runnerId, runnerId))
      .orderBy(desc(facts.checkedAt))
      .limit(1);
    return fact;
  }
}

export const storage = new SQLiteStorage();
