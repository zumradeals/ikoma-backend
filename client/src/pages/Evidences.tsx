import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { format } from "date-fns";
import { Terminal, Check, X, Search } from "lucide-react";
import type { Evidence } from "@shared/schema";
import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";

export default function Evidences() {
  const [runnerIdFilter, setRunnerIdFilter] = useState("");

  const { data: evidences, isLoading } = useQuery({
    queryKey: [api.evidences.list.path, runnerIdFilter],
    queryFn: async () => {
      // Fetching without params gets nothing per schema validation?
      // Schema says "refine: either runner_id or order_id is required"
      // If no filter is set, this might fail unless backend allows list all.
      // Assuming for dashboard purposes we might want to list all, but if strict, we need input.
      // Let's assume we need to provide at least a dummy filter or handle the requirement.
      // For this UI, let's search by runner ID.
      
      if (!runnerIdFilter) return []; 

      const url = `${api.evidences.list.path}?runner_id=${runnerIdFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed");
      const envelope = await res.json();
      return envelope.data as Evidence[];
    },
    enabled: runnerIdFilter.length > 0
  });

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Evidence Log</h1>
          <p className="text-muted-foreground mt-1">Search execution logs by Runner ID.</p>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              placeholder="Enter Runner ID to fetch evidence..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200"
              value={runnerIdFilter}
              onChange={(e) => setRunnerIdFilter(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
           <div className="space-y-4">
             {[1,2,3].map(i => <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />)}
           </div>
        ) : evidences && evidences.length > 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/30 text-muted-foreground font-medium uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {evidences.map((ev) => (
                    <tr key={ev.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        {ev.exitCode === 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <Check className="w-3 h-3" /> Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                            <X className="w-3 h-3" /> Failed ({ev.exitCode})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">
                        {ev.orderId.substring(0, 12)}...
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {format(new Date(ev.createdAt), 'MMM dd, HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/orders/${ev.orderId}`}>
                          <span className="text-primary hover:underline font-medium cursor-pointer">View Output</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState 
            icon={Terminal} 
            title="No logs found" 
            description={runnerIdFilter ? "No evidence found for this Runner ID." : "Enter a Runner ID above to search logs."} 
          />
        )}
      </div>
    </Layout>
  );
}
