import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Server, Clock, Cpu } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { Runner } from "@shared/schema";

export function RunnerCard({ runner }: { runner: Runner }) {
  const isOnline = new Date(runner.lastSeenAt).getTime() > Date.now() - (runner.ttlSeconds || 60) * 1000 * 2;
  
  return (
    <Link href={`/runners/${runner.id}`}>
      <div className="group bg-card hover:bg-card/50 border border-border/50 hover:border-primary/50 transition-all duration-300 rounded-2xl p-6 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                {runner.name}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">ID: {runner.id.substring(0, 8)}...</p>
            </div>
          </div>
          <StatusBadge status={isOnline ? "online" : "offline"} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              LAST SEEN
            </span>
            <p className="font-medium text-foreground">
              {formatDistanceToNow(new Date(runner.lastSeenAt), { addSuffix: true })}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              TTL
            </span>
            <p className="font-medium text-foreground">
              {runner.ttlSeconds} seconds
            </p>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t border-border/50">
           <div className="flex gap-2">
             {runner.labels && Object.entries(runner.labels as Record<string,string>).slice(0, 2).map(([k, v]) => (
               <span key={k} className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-mono text-secondary-foreground border border-border/50">
                 {k}={v}
               </span>
             ))}
             {(runner.labels && Object.keys(runner.labels).length > 2) && (
               <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-mono text-secondary-foreground border border-border/50">
                 +{Object.keys(runner.labels).length - 2}
               </span>
             )}
           </div>
           
           <span className="text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0">
             <ArrowRight className="w-5 h-5" />
           </span>
        </div>
      </div>
    </Link>
  );
}
