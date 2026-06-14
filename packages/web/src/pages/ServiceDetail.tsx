import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { Variable } from "@testforge/core";
import { getService, getFeatures, api, runService, getServiceStats, duplicateService } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "../hooks/use-toast";
import { VariableEditor } from "../components/VariableEditor";
import { Copy } from "lucide-react";

function FeatureLastRunBadge({ status, at }: { status: string | null; at: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">미실행</span>;
  const map: Record<string, { icon: string; cls: string }> = {
    passed:    { icon: "✅", cls: "text-green-600" },
    failed:    { icon: "❌", cls: "text-red-600" },
    healed:    { icon: "⚠️", cls: "text-yellow-600" },
    running:   { icon: "🔄", cls: "text-blue-600" },
    cancelled: { icon: "⏹️", cls: "text-gray-500" },
    pending:   { icon: "⏳", cls: "text-gray-400" },
  };
  const { icon, cls } = map[status] ?? { icon: "⏳", cls: "text-gray-400" };
  const rel = at ? formatDistanceToNow(new Date(at), { addSuffix: true, locale: ko }) : null;
  return (
    <span className={`flex items-center gap-1 text-xs ${cls}`}>
      {icon}
      {rel && <span className="text-muted-foreground">{rel}</span>}
    </span>
  );
}

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [featureName, setFeatureName] = useState("");
  const [isEditingVars, setIsEditingVars] = useState(false);
  const [editVars, setEditVars] = useState<Variable[]>([]);

  const { data: serviceData, isLoading: serviceLoading } = useQuery({
    queryKey: ["service", id],
    queryFn: () => getService(id!),
    enabled: !!id,
  });

  const { data: featuresData, isLoading: featuresLoading } = useQuery({
    queryKey: ["features", id],
    queryFn: () => getFeatures(id!),
    enabled: !!id,
  });

  const { data: serviceStatsData } = useQuery({
    queryKey: ["serviceStats", id],
    queryFn: () => getServiceStats(id!),
    enabled: !!id,
  });

  const duplicateServiceMutation = useMutation({
    mutationFn: () => duplicateService(id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      const newService = data?.data as any;
      toast({ title: "복제 완료", description: `"${newService?.name}" 서비스가 생성되었습니다.` });
      if (newService?.id) {
        navigate(`/services/${newService.id}`);
      }
    },
    onError: (error: Error) => {
      toast({ title: "복제 실패", description: error.message || "서비스 복제 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  const runServiceMutation = useMutation({
    mutationFn: () => runService(id!),
    onSuccess: (data) => {
      const responseData = data?.data;
      const total = responseData && 'total' in responseData ? responseData.total : responseData?.runIds?.length || 0;
      toast({
        title: "실행 시작",
        description: `${total}개 시나리오 실행이 시작되었습니다. 실행 이력 페이지에서 확인하세요.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "실행 실패",
        description: error.message || "서비스 실행 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.api.services[":serviceId"].features.$post({
        param: { serviceId: id! },
        json: { name, serviceId: id!, owners: [] },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features", id] });
      setIsCreating(false);
      setFeatureName("");
    },
  });

  const updateVarsMutation = useMutation({
    mutationFn: async (vars: Variable[]) => {
      const res = await api.api.services[":id"].$put({
        param: { id: id! },
        json: { defaultVariables: vars } as any,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service", id] });
      setIsEditingVars(false);
      toast({ title: "저장됨", description: "서비스 기본 변수가 업데이트되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "변수 저장에 실패했습니다.", variant: "destructive" });
    },
  });

  if (serviceLoading || featuresLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  if (!serviceData || !serviceData.success) {
    return <div className="text-center py-12">서비스를 찾을 수 없습니다.</div>;
  }

  const service = serviceData.data;
  const features = featuresData?.success ? featuresData.data : [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link to="/services" className="hover:text-foreground">
          서비스
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{service.name}</span>
      </nav>

      {/* Service Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{service.name}</CardTitle>
              {service.description && (
                <CardDescription>{service.description}</CardDescription>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => duplicateServiceMutation.mutate()}
              disabled={duplicateServiceMutation.isPending}
            >
              <Copy className="h-4 w-4 mr-1" />
              복제
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Base URL: <code className="bg-muted px-1 py-0.5 rounded">{service.baseUrl}</code>
          </p>
        </CardContent>
      </Card>

      {/* Service Default Variables (PRD Appendix B — priority 4 in variable resolution) */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">서비스 기본 변수</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditVars((service as any).defaultVariables ?? []);
                setIsEditingVars(true);
              }}
            >
              편집
            </Button>
          </div>
          <CardDescription className="text-xs">
            이 서비스의 모든 시나리오에 기본 적용되는 변수 (시나리오/실행 변수로 재정의 가능)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {((service as any).defaultVariables ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">설정된 기본 변수가 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {((service as any).defaultVariables as Variable[]).map((v) => (
                <div key={v.name} className="flex items-center gap-2 text-xs">
                  <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{`{{${v.name}}}`}</code>
                  <span className="text-muted-foreground">=</span>
                  <span className="font-medium">{v.defaultValue !== undefined ? String(v.defaultValue) : "(없음)"}</span>
                  <span className="text-muted-foreground ml-auto">{v.type}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Default Variables Dialog */}
      <Dialog open={isEditingVars} onOpenChange={setIsEditingVars}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>서비스 기본 변수 편집</DialogTitle>
          </DialogHeader>
          <VariableEditor variables={editVars} onChange={setEditVars} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingVars(false)}>취소</Button>
            <Button
              onClick={() => updateVarsMutation.mutate(editVars)}
              disabled={updateVarsMutation.isPending}
            >
              {updateVarsMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Run Stats */}
      {serviceStatsData?.data && serviceStatsData.data.totalRuns > 0 && (() => {
        const stats = serviceStatsData.data;
        const passRateCls = stats.passRate >= 0.9 ? "text-green-600" : stats.passRate >= 0.7 ? "text-yellow-600" : "text-red-600";
        const maxTrendTotal = Math.max(...stats.trend.map((d) => d.passed + d.failed + d.healed), 1);
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">서비스 실행 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalRuns}</div>
                  <div className="text-xs text-gray-500">전체 실행</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${passRateCls}`}>
                    {(stats.passRate * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">성공률</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{stats.failedRuns}</div>
                  <div className="text-xs text-gray-500">실패</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {stats.avgDuration != null ? `${(stats.avgDuration / 1000).toFixed(1)}s` : "—"}
                  </div>
                  <div className="text-xs text-gray-500">평균 소요</div>
                </div>
              </div>
              {stats.trend.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-2">일별 실행 현황 (최근 7일)</div>
                  <div className="flex items-end gap-1 h-12">
                    {stats.trend.map((day) => {
                      const total = day.passed + day.failed + day.healed;
                      const dayPassRate = total > 0 ? (day.passed + day.healed) / total : 0;
                      return (
                        <div
                          key={day.date}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${Math.round((total / maxTrendTotal) * 100)}%`,
                            minHeight: total > 0 ? "4px" : undefined,
                            backgroundColor: dayPassRate >= 0.9 ? "#22c55e" : dayPassRate >= 0.7 ? "#eab308" : "#ef4444",
                          }}
                          title={`${day.date}: ${day.passed}p ${day.failed}f ${day.healed}h`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Features Section */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">기능</h2>
        <div className="flex space-x-2">
          {features.length > 0 && (
            <Button
              variant="outline"
              onClick={() => runServiceMutation.mutate()}
              disabled={runServiceMutation.isPending}
            >
              {runServiceMutation.isPending ? "실행 중..." : "전체 실행"}
            </Button>
          )}
          <Button onClick={() => setIsCreating(true)}>
            + 기능 추가
          </Button>
        </div>
      </div>

      {/* Create Feature Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 기능</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(featureName);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
                placeholder="예: 로그인"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreating(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "생성 중..." : "생성"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Features List */}
      <Card>
        {features.length === 0 ? (
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-2">아직 기능이 없습니다.</p>
            <Button variant="link" onClick={() => setIsCreating(true)}>
              첫 기능 추가하기
            </Button>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="divide-y">
              {features.map((feature) => (
                <Link
                  key={feature.id}
                  to={`/features/${feature.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <h3 className="font-medium">{feature.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      {feature.description && (
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {(feature as any).scenarioCount ?? 0}개 시나리오
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FeatureLastRunBadge
                      status={(feature as any).lastRunStatus ?? null}
                      at={(feature as any).lastRunAt ?? null}
                    />
                    <span className="text-muted-foreground">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
