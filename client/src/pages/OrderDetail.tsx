import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@shared/routes";
import { ArrowLeft, Clock, Terminal, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { Order, Evidence } from "@shared/schema";
import { cn } from "@/lib/utils";

// Special hook for single order since it wasn't in list
function useOrder(id: string) {
  return useQuery({
    queryKey: [`/api/orders/${id}`],
    queryFn: async () => {
      // Mocking because this specific endpoint wasn't in the provided routes manifest
      // In a real app we would add api.orders.get
      // For now, we fetch the runner's orders and find it, or assume an endpoint exists
      // BUT for safety, let's implement a direct fetch assuming standard REST pattern
      // If it fails, the error boundary catches it.
      
      // FALLBACK: Since we only have /api/runners/:id/orders, we might not be able to get a single order easily
      // without knowing the runner ID. 
      // Assumption: The backend likely exposes /api/evidences?order_id=... which we CAN use.
      return null;
    },
    enabled: false // disabling as we don't have the endpoint
  });
}

function useEvidence(orderId: string) {
  const path = `${api.evidences.list.path}?order_id=${orderId}`;
  return useQuery({
    queryKey: [path],
    queryFn: async () => {
      const res = await fetch(path);
      if (!res.ok) throw new Error("Failed to fetch evidence");
      const envelope = await res.json();
      if (!envelope.ok) throw new Error(envelope.error?.message);
      return envelope.data?.[0] as Evidence | undefined; // Expecting at least one evidence per order
    }
  });
}

export default function OrderDetail() {
  const [, params] = useRoute("/orders/:id");
  const id = params?.id || "";

  // Since we don't have a direct "get order" endpoint in the manifest provided,
  // we will rely on the evidence which contains the crucial logs.
  // In a real scenario, we'd add api.orders.get to routes.
  const { data: evidence, isLoading } = useEvidence(id);

  if (isLoading) return <Layout><div className="animate-pulse h-96 bg-card rounded-xl" /></Layout>;
  
  if (!evidence) return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <h2 className="text-xl font-bold">Evidence Not Found</h2>
        <p className="text-muted-foreground">Logs for this order are not available yet or the ID is invalid.</p>
        <Link href="/" className="text-primary hover:underline">Return Home</Link>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border/50 pb-6 shrink-0">
          <Link href={`/runners/${evidence.runnerId}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 w-fit transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Runner
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-center gap-3">
                Order Execution
                {evidence.exitCode === 0 
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  : <AlertTriangle className="w-6 h-6 text-red-500" />
                }
              </h1>
              <p className="font-mono text-sm text-muted-foreground mt-2">
                ID: {evidence.orderId}
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
               <div className={cn(
                 "px-3 py-1 rounded-full text-sm font-bold border",
                 evidence.exitCode === 0 
                   ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                   : "bg-red-50 text-red-700 border-red-200"
               )}>
                 Exit Code: {evidence.exitCode}
               </div>
               <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                 <Clock className="w-3.5 h-3.5" />
                 {format(new Date(evidence.createdAt), 'yyyy-MM-dd HH:mm:ss')} UTC
               </div>
            </div>
          </div>
        </div>

        {/* Console Output */}
        <div className="flex-1 bg-[#1e1e1e] rounded-xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col font-mono text-sm relative group">
          <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-gray-800 shrink-0">
             <div className="flex items-center gap-2">
               <Terminal className="w-4 h-4 text-gray-400" />
               <span className="text-gray-300 text-xs">console output</span>
             </div>
             <div className="flex gap-1.5">
               <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
               <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
               <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
             </div>
          </div>
          
          <div className="p-4 overflow-auto flex-1 custom-scrollbar">
            {evidence.stdout && (
              <div className="text-gray-300 whitespace-pre-wrap mb-4 font-mono-digits leading-relaxed">
                {evidence.stdout}
              </div>
            )}
            
            {evidence.stderr && (
              <div className="text-red-400 whitespace-pre-wrap font-mono-digits border-l-2 border-red-900/50 pl-3 leading-relaxed">
                {evidence.stderr}
              </div>
            )}

            {!evidence.stdout && !evidence.stderr && (
              <div className="text-gray-600 italic">No output captured.</div>
            )}
            
            <div className="mt-4 flex items-center gap-2 text-gray-500">
               <span className="animate-pulse">_</span>
            </div>
          </div>

          <div className="absolute top-12 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => navigator.clipboard.writeText((evidence.stdout || "") + "\n" + (evidence.stderr || ""))}
              className="bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1 rounded backdrop-blur-sm"
            >
              Copy Log
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
