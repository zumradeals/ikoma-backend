import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";
import { type Runner, type Order } from "@shared/schema";

// Type definitions for API responses based on schema
// The shared routes define responses as z.any() arrays inside envelopes for now to avoid circular refs in zod definition
// But we know the shape from schema.ts, so we cast the results for safe frontend usage.

export function useRunners() {
  return useQuery({
    queryKey: [api.runners.list.path],
    queryFn: async () => {
      const res = await fetch(api.runners.list.path);
      if (!res.ok) throw new Error("Failed to fetch runners");
      const envelope = await res.json();
      // Unwrap envelope
      if (!envelope.ok) throw new Error(envelope.error?.message || "Unknown error");
      return envelope.data as Runner[];
    },
    refetchInterval: 5000, // Poll every 5s for dashboard status
  });
}

export function useRunner(id: string) {
  // Using string substitution manually as buildUrl is not exported from routes manifest in this context
  // or we assume it is. Let's stick to template literals which are safe here.
  const path = api.runners.get.path.replace(":id", id);
  
  return useQuery({
    queryKey: [path],
    queryFn: async () => {
      const res = await fetch(path);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch runner");
      const envelope = await res.json();
      if (!envelope.ok) throw new Error(envelope.error?.message || "Unknown error");
      return envelope.data as Runner;
    },
  });
}

export function useRunnerOrders(runnerId: string) {
  const path = api.runners.listOrders.path.replace(":id", runnerId);

  return useQuery({
    queryKey: [path],
    queryFn: async () => {
      const res = await fetch(path);
      if (!res.ok) throw new Error("Failed to fetch runner orders");
      const envelope = await res.json();
      if (!envelope.ok) throw new Error(envelope.error?.message || "Unknown error");
      return envelope.data as Order[];
    },
    enabled: !!runnerId,
    refetchInterval: 5000,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ runnerId, type }: { runnerId: string, type: "runner.selftest" | "runner.reconcile" }) => {
      const path = api.runners.createOrder.path.replace(":id", runnerId);
      const res = await fetch(path, {
        method: api.runners.createOrder.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type, 
          client_request_id: crypto.randomUUID() 
        }),
      });
      
      if (!res.ok) throw new Error("Failed to create order");
      const envelope = await res.json();
      if (!envelope.ok) throw new Error(envelope.error?.message || "Unknown error");
      return envelope.data;
    },
    onSuccess: (_, variables) => {
      const listPath = api.runners.listOrders.path.replace(":id", variables.runnerId);
      queryClient.invalidateQueries({ queryKey: [listPath] });
    }
  });
}
