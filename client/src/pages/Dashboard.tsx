import { useRunners } from "@/hooks/use-runners";
import { Layout } from "@/components/Layout";
import { RunnerCard } from "@/components/RunnerCard";
import { EmptyState } from "@/components/EmptyState";
import { ServerCrash, Search } from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const { data: runners, isLoading, error } = useRunners();
  const [search, setSearch] = useState("");

  const filteredRunners = runners?.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.id.toLowerCase().includes(search.toLowerCase())
  );

  const activeRunners = runners?.filter(r => {
    const isOnline = new Date(r.lastSeenAt).getTime() > Date.now() - (r.ttlSeconds || 60) * 1000 * 2;
    return isOnline;
  }).length || 0;

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time overview of your infrastructure fleet.</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {activeRunners} Active Nodes
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input 
          placeholder="Search runners by name or ID..." 
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-card border border-border/50 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-red-50 border border-red-100 text-red-800 text-center">
          <p className="font-semibold">Failed to load runners</p>
          <p className="text-sm opacity-80 mt-1">{(error as Error).message}</p>
        </div>
      ) : filteredRunners?.length === 0 ? (
        <EmptyState 
          icon={ServerCrash} 
          title="No runners found" 
          description={search ? "Try adjusting your search query." : "No runners have connected to the gateway yet."} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRunners?.map(runner => (
            <RunnerCard key={runner.id} runner={runner} />
          ))}
        </div>
      )}
    </Layout>
  );
}
