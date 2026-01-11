import { useRoute, Link } from "wouter";
import { useRunner, useRunnerOrders, useCreateOrder } from "@/hooks/use-runners";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button"; // Assuming standard shadcn-like button in base if available, but I will mock simple button
import { formatDistanceToNow, format } from "date-fns";
import { 
  ArrowLeft, Terminal, Cpu, Clock, Calendar, 
  PlayCircle, RefreshCcw, FileText, ChevronRight 
} from "lucide-react";
import type { Order } from "@shared/schema";
import { cn } from "@/lib/utils";

// Helper components
function DetailCard({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden h-full">
      <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3 bg-muted/20">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function KeyValue({ label, value, mono = false }: { label: string, value: string | React.ReactNode, mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium text-foreground", mono && "font-mono")}>{value}</span>
    </div>
  );
}

export default function RunnerDetail() {
  const [, params] = useRoute("/runners/:id");
  const id = params?.id || "";
  
  const { data: runner, isLoading: isLoadingRunner } = useRunner(id);
  const { data: orders, isLoading: isLoadingOrders } = useRunnerOrders(id);
  const createOrderMutation = useCreateOrder();

  if (isLoadingRunner) return <Layout><div className="animate-pulse h-96 bg-card rounded-xl" /></Layout>;
  if (!runner) return <Layout><div className="text-center py-20">Runner not found</div></Layout>;

  const handleRunTest = () => {
    createOrderMutation.mutate({ runnerId: id, type: "runner.selftest" });
  };

  const handleReconcile = () => {
    createOrderMutation.mutate({ runnerId: id, type: "runner.reconcile" });
  };

  const isOnline = new Date(runner.lastSeenAt).getTime() > Date.now() - (runner.ttlSeconds || 60) * 1000 * 2;

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col gap-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 w-fit transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">{runner.name}</h1>
              <StatusBadge status={isOnline ? "online" : "offline"} className="text-sm px-3 py-1" />
            </div>
            <p className="font-mono text-muted-foreground text-sm flex items-center gap-2">
              ID: <span className="bg-muted px-2 py-0.5 rounded text-foreground select-all">{runner.id}</span>
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleRunTest}
              disabled={createOrderMutation.isPending || !isOnline}
              className="px-4 py-2 bg-card border border-border text-foreground hover:bg-secondary rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayCircle className="w-4 h-4" />
              {createOrderMutation.isPending ? "Starting..." : "Run Self-Test"}
            </button>
            <button
              onClick={handleReconcile}
              disabled={createOrderMutation.isPending || !isOnline}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCcw className="w-4 h-4" />
              Reconcile
            </button>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Stats & Metadata */}
        <div className="space-y-6">
          <DetailCard title="Overview" icon={Cpu}>
            <KeyValue label="Status" value={isOnline ? "Connected" : "Disconnected"} />
            <KeyValue 
              label="Last Seen" 
              value={formatDistanceToNow(new Date(runner.lastSeenAt), { addSuffix: true })} 
            />
            <KeyValue label="Created" value={format(new Date(runner.createdAt), 'MMM dd, yyyy')} />
            <KeyValue label="TTL" value={`${runner.ttlSeconds}s`} mono />
          </DetailCard>

          <DetailCard title="Labels" icon={FileText}>
            <div className="flex flex-wrap gap-2">
              {runner.labels && Object.entries(runner.labels as Record<string, string>).map(([k, v]) => (
                <div key={k} className="bg-secondary/50 border border-border/50 rounded px-2 py-1 text-xs font-mono text-secondary-foreground">
                  <span className="opacity-50">{k}=</span>{v}
                </div>
              ))}
              {(!runner.labels || Object.keys(runner.labels).length === 0) && (
                <span className="text-sm text-muted-foreground italic">No labels attached</span>
              )}
            </div>
          </DetailCard>

          <DetailCard title="Facts" icon={Terminal}>
             {/* This would come from factsRef JSON usually, simplifying for this view */}
             <div className="space-y-3">
               <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground">OS</span>
                 <span className="font-mono">Linux 5.15</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground">Architecture</span>
                 <span className="font-mono">x86_64</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground">Docker</span>
                 <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-full">READY</span>
               </div>
             </div>
          </DetailCard>
        </div>

        {/* Right Column: Activity Feed */}
        <div className="lg:col-span-2">
          <DetailCard title="Recent Orders" icon={Calendar}>
            {isLoadingOrders ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />)}
              </div>
            ) : orders && orders.length > 0 ? (
              <div className="divide-y divide-border/50">
                {orders.map((order: Order) => (
                  <div key={order.id} className="py-4 first:pt-0 last:pb-0 group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={order.status} className="text-[10px] px-2 py-0.5" />
                        <span className="font-mono text-sm font-medium">{order.type}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt), 'HH:mm:ss')}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-end">
                       <p className="text-sm text-muted-foreground line-clamp-1">
                         {order.summary || "No summary available."}
                       </p>
                       <Link href={`/orders/${order.id}`}>
                         <span className="text-xs font-semibold text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:underline">
                           View Logs <ChevronRight className="w-3 h-3" />
                         </span>
                       </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No orders executed recently.
              </div>
            )}
          </DetailCard>
        </div>

      </div>
    </Layout>
  );
}
