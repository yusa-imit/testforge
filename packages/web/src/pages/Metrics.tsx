import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, AlertTriangle, TrendingUp } from "lucide-react";

interface EndpointSummary {
  endpoint: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
}

interface RecentMetric {
  path: string;
  method: string;
  duration: number;
  timestamp: string;
  statusCode?: number;
}

interface MetricsData {
  totalRequests: number;
  averageDuration: number;
  slowRequests: number;
  slowRequestThreshold: number;
  summary: EndpointSummary[];
  recentMetrics: RecentMetric[];
}

interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
}

export default function Metrics() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<MetricsData>({
    queryKey: ["metrics"],
    queryFn: async () => {
      const res = await fetch("/api/metrics");
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const { data: health, isLoading: healthLoading } = useQuery<HealthData>({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch("/api/metrics/health");
      if (!res.ok) throw new Error("Failed to fetch health");
      return res.json();
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  if (metricsLoading || healthLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading metrics...</div>
      </div>
    );
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getStatusColor = (statusCode?: number) => {
    if (!statusCode) return "default";
    if (statusCode >= 200 && statusCode < 300) return "default";
    if (statusCode >= 300 && statusCode < 400) return "secondary";
    if (statusCode >= 400 && statusCode < 500) return "destructive";
    return "destructive";
  };

  const getDurationColor = (duration: number, threshold: number) => {
    if (duration > threshold) return "text-destructive";
    if (duration > threshold * 0.7) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Metrics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor API performance and identify bottlenecks
          </p>
        </div>
        {health && (
          <Badge variant={health.status === "ok" ? "default" : "destructive"}>
            {health.status === "ok" ? "Healthy" : "Unhealthy"}
          </Badge>
        )}
      </div>

      {/* Health Summary */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="text-2xl font-bold capitalize">{health.status}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Uptime</div>
                <div className="text-2xl font-bold">{formatUptime(health.uptime)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Last Check</div>
                <div className="text-2xl font-bold">
                  {new Date(health.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Summary Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalRequests}</div>
              <p className="text-xs text-muted-foreground">Last 100 requests tracked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(metrics.averageDuration)}</div>
              <p className="text-xs text-muted-foreground">Across all endpoints</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Slow Requests</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.slowRequests}</div>
              <p className="text-xs text-muted-foreground">
                &gt;{formatDuration(metrics.slowRequestThreshold)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Endpoints Tracked</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.summary.length}</div>
              <p className="text-xs text-muted-foreground">Unique endpoints</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Endpoint Performance Summary */}
      {metrics && metrics.summary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Endpoint Performance</CardTitle>
            <CardDescription>Sorted by average response time (slowest first)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-medium">Endpoint</th>
                    <th className="text-right py-2 px-4 font-medium">Requests</th>
                    <th className="text-right py-2 px-4 font-medium">Avg</th>
                    <th className="text-right py-2 px-4 font-medium">Min</th>
                    <th className="text-right py-2 px-4 font-medium">Max</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.summary.map((endpoint, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-4 font-mono text-sm">{endpoint.endpoint}</td>
                      <td className="text-right py-2 px-4">{endpoint.count}</td>
                      <td
                        className={`text-right py-2 px-4 font-semibold ${getDurationColor(
                          endpoint.avgDuration,
                          metrics.slowRequestThreshold
                        )}`}
                      >
                        {formatDuration(endpoint.avgDuration)}
                      </td>
                      <td className="text-right py-2 px-4 text-muted-foreground">
                        {formatDuration(endpoint.minDuration)}
                      </td>
                      <td className="text-right py-2 px-4 text-muted-foreground">
                        {formatDuration(endpoint.maxDuration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Requests */}
      {metrics && metrics.recentMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>Last 20 requests (newest first)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-medium">Time</th>
                    <th className="text-left py-2 px-4 font-medium">Method</th>
                    <th className="text-left py-2 px-4 font-medium">Path</th>
                    <th className="text-right py-2 px-4 font-medium">Duration</th>
                    <th className="text-right py-2 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentMetrics.map((metric, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-4 text-sm text-muted-foreground">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-4">
                        <Badge variant="outline" className="font-mono text-xs">
                          {metric.method}
                        </Badge>
                      </td>
                      <td className="py-2 px-4 font-mono text-sm">{metric.path}</td>
                      <td
                        className={`text-right py-2 px-4 font-semibold ${getDurationColor(
                          metric.duration,
                          metrics.slowRequestThreshold
                        )}`}
                      >
                        {formatDuration(metric.duration)}
                      </td>
                      <td className="text-right py-2 px-4">
                        {metric.statusCode && (
                          <Badge variant={getStatusColor(metric.statusCode)}>
                            {metric.statusCode}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {metrics && metrics.totalRequests === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No metrics data available yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Make some API requests to see performance metrics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
