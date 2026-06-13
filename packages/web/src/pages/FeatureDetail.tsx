import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { MoreHorizontal, Play, Copy, Trash2 } from "lucide-react";
import { getFeature, getScenarios, api, runFeature, runScenario, deleteScenario, duplicateScenario, getFeatureStats, runScenariosByTag } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "../hooks/use-toast";

function PassRateBadge({ totalRuns, passCount }: { totalRuns: number; passCount: number }) {
  if (totalRuns === 0) return null;
  const rate = passCount / totalRuns;
  const cls =
    rate >= 0.9 ? "text-green-600 bg-green-50 border-green-200" :
    rate >= 0.7 ? "text-yellow-600 bg-yellow-50 border-yellow-200" :
    "text-red-600 bg-red-50 border-red-200";
  return (
    <span
      className={`text-xs font-mono px-1.5 py-0.5 rounded border ${cls}`}
      title={`성공률 ${(rate * 100).toFixed(0)}% (${passCount}/${totalRuns})`}
    >
      {passCount}/{totalRuns}
    </span>
  );
}

function LastRunBadge({ status, at }: { status: string | null; at: string | null }) {
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

export default function FeatureDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: featureData, isLoading: featureLoading } = useQuery({
    queryKey: ["feature", id],
    queryFn: () => getFeature(id!),
    enabled: !!id,
  });

  const { data: scenariosData, isLoading: scenariosLoading } = useQuery({
    queryKey: ["scenarios", id],
    queryFn: () => getScenarios(id!),
    enabled: !!id,
  });

  const { data: featureStatsData } = useQuery({
    queryKey: ["feature-stats", id],
    queryFn: () => getFeatureStats(id!),
    enabled: !!id,
  });

  const runFeatureMutation = useMutation({
    mutationFn: () => runFeature(id!),
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
        description: error.message || "기능 실행 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const runByTagMutation = useMutation({
    mutationFn: (tag: string) => runScenariosByTag(tag, { featureId: id }),
    onSuccess: (result) => {
      const { count, tag } = result.data;
      toast({
        title: "태그 실행 시작",
        description: count > 0
          ? `"${tag}" 태그 시나리오 ${count}개 실행이 시작되었습니다.`
          : `"${tag}" 태그에 해당하는 시나리오가 없습니다.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "실행 실패",
        description: error.message || "태그 실행 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.api.features[":featureId"].scenarios.$post({
        param: { featureId: id! },
        json: {
          name,
          featureId: id!,
          tags: [],
          priority: "medium" as const,
          variables: [],
          steps: [],
        },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", id] });
      setIsCreating(false);
      setScenarioName("");
    },
  });

  const runScenarioMutation = useMutation({
    mutationFn: (scenarioId: string) => runScenario(scenarioId),
    onSuccess: (result, scenarioId) => {
      const runId = (result as any)?.data?.runId;
      if (runId) {
        navigate(`/scenarios/${scenarioId}/runs/${runId}`);
      } else {
        toast({ title: "실행 시작", description: "시나리오 실행이 시작되었습니다." });
      }
    },
    onError: (error: Error) => {
      toast({ title: "실행 실패", description: error.message || "시나리오 실행 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  const duplicateScenarioMutation = useMutation({
    mutationFn: (scenarioId: string) => duplicateScenario(scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", id] });
      toast({ title: "복제 완료", description: "시나리오가 복제되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "복제 실패", description: error.message || "시나리오 복제 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: (scenarioId: string) => deleteScenario(scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", id] });
      setConfirmDeleteId(null);
      toast({ title: "삭제 완료", description: "시나리오가 삭제되었습니다." });
    },
    onError: (error: Error) => {
      setConfirmDeleteId(null);
      toast({ title: "삭제 실패", description: error.message || "시나리오 삭제 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  const scenarios = useMemo(
    () => (scenariosData?.success ? scenariosData.data : []),
    [scenariosData]
  );

  // Collect unique tags across all scenarios for the tag filter dropdown
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    scenarios.forEach((s) => s.tags?.forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [scenarios]);

  // Filter scenarios based on search query, priority, and tag
  const filteredScenarios = useMemo(() => {
    return scenarios.filter((scenario) => {
      const matchesSearch = !searchQuery.trim() ||
        scenario.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scenario.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scenario.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPriority = priorityFilter === "all" || scenario.priority === priorityFilter;

      const matchesTag = tagFilter === "all" || scenario.tags?.includes(tagFilter);

      return matchesSearch && matchesPriority && matchesTag;
    });
  }, [scenarios, searchQuery, priorityFilter, tagFilter]);

  if (featureLoading || scenariosLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  if (!featureData || !featureData.success) {
    return <div className="text-center py-12">기능을 찾을 수 없습니다.</div>;
  }

  const feature = featureData.data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link to="/services" className="hover:text-foreground">
          서비스
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{feature.name}</span>
      </nav>

      {/* Feature Info */}
      <Card>
        <CardHeader>
          <CardTitle>{feature.name}</CardTitle>
          {feature.description && (
            <CardDescription>{feature.description}</CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Feature Run Stats */}
      {featureStatsData?.data && featureStatsData.data.totalRuns > 0 && (() => {
        const stats = featureStatsData.data;
        const passRateCls = stats.passRate >= 0.9 ? "text-green-600" : stats.passRate >= 0.7 ? "text-yellow-600" : "text-red-600";
        const maxTrendTotal = Math.max(...stats.trend.map((d) => d.passed + d.failed + d.healed), 1);
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">기능 실행 통계</CardTitle>
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
                          className="flex-1 flex flex-col items-center gap-0.5"
                          title={`${day.date}: ${day.passed}통과 ${day.failed}실패 ${day.healed}치유`}
                        >
                          <div
                            className={`w-full rounded-sm ${dayPassRate >= 0.9 ? "bg-green-400" : dayPassRate > 0 ? "bg-yellow-400" : "bg-red-400"}`}
                            style={{ height: `${Math.max(4, (total / maxTrendTotal) * 40)}px` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Scenarios Section */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">시나리오</h2>
        <div className="flex space-x-2">
          {tagFilter !== "all" && filteredScenarios.length > 0 && (
            <Button
              variant="outline"
              onClick={() => runByTagMutation.mutate(tagFilter)}
              disabled={runByTagMutation.isPending}
              title={`"${tagFilter}" 태그 시나리오 ${filteredScenarios.length}개 실행`}
            >
              {runByTagMutation.isPending ? "실행 중..." : `"${tagFilter}" 태그 실행 (${filteredScenarios.length})`}
            </Button>
          )}
          {scenarios.length > 0 && (
            <Button
              variant="outline"
              onClick={() => runFeatureMutation.mutate()}
              disabled={runFeatureMutation.isPending}
            >
              {runFeatureMutation.isPending ? "실행 중..." : "전체 실행"}
            </Button>
          )}
          <Button onClick={() => setIsCreating(true)}>
            + 시나리오 추가
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      {scenarios.length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              placeholder="시나리오 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="우선순위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 우선순위</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          {availableTags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="태그" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 태그</SelectItem>
                {availableTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(searchQuery || priorityFilter !== "all" || tagFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setPriorityFilter("all");
                setTagFilter("all");
              }}
            >
              필터 초기화
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {filteredScenarios.length}/{scenarios.length}개 시나리오
          </span>
        </div>
      )}

      {/* Create Scenario Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 시나리오</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(scenarioName);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="예: 정상 로그인"
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

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>시나리오 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            이 시나리오를 삭제하면 모든 실행 기록도 함께 삭제됩니다. 계속하시겠습니까?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>취소</Button>
            <Button
              variant="destructive"
              disabled={deleteScenarioMutation.isPending}
              onClick={() => confirmDeleteId && deleteScenarioMutation.mutate(confirmDeleteId)}
            >
              {deleteScenarioMutation.isPending ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scenarios List */}
      <Card>
        {scenarios.length === 0 ? (
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-2">아직 시나리오가 없습니다.</p>
            <Button variant="link" onClick={() => setIsCreating(true)}>
              첫 시나리오 추가하기
            </Button>
          </CardContent>
        ) : filteredScenarios.length === 0 ? (
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-2">필터 조건에 맞는 시나리오가 없습니다.</p>
            <Button
              variant="link"
              onClick={() => {
                setSearchQuery("");
                setPriorityFilter("all");
                setTagFilter("all");
              }}
            >
              필터 초기화
            </Button>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
                >
                  <Link
                    to={`/scenarios/${scenario.id}`}
                    className="flex-1 min-w-0"
                  >
                    <h3 className="font-medium">{scenario.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          scenario.priority === "critical" ? "destructive" :
                          scenario.priority === "high" ? "default" :
                          "secondary"
                        }
                      >
                        {scenario.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {scenario.steps.length} 스텝
                      </span>
                      {scenario.tags?.map((tag: string) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-muted"
                          onClick={(e) => {
                            e.preventDefault();
                            setTagFilter(tag);
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                    <PassRateBadge
                      totalRuns={(scenario as any).totalRuns ?? 0}
                      passCount={(scenario as any).passCount ?? 0}
                    />
                    <LastRunBadge
                      status={(scenario as any).lastRunStatus ?? null}
                      at={(scenario as any).lastRunAt ?? null}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.preventDefault()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => runScenarioMutation.mutate(scenario.id)}
                          disabled={runScenarioMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          실행
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => duplicateScenarioMutation.mutate(scenario.id)}
                          disabled={duplicateScenarioMutation.isPending}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          복제
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setConfirmDeleteId(scenario.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
