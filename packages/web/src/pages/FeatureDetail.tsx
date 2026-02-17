import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFeature, getScenarios, api, runFeature } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FeatureDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

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

  const runFeatureMutation = useMutation({
    mutationFn: () => runFeature(id!),
    onSuccess: (data) => {
      const responseData = data?.data;
      const total = responseData && 'total' in responseData ? responseData.total : responseData?.runIds?.length || 0;
      alert(`${total}개 시나리오 실행이 시작되었습니다. 실행 이력 페이지에서 확인하세요.`);
    },
    onError: (error: any) => {
      alert(error.message || "기능 실행 중 오류가 발생했습니다.");
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

  const scenarios = scenariosData?.success ? scenariosData.data : [];

  // Filter scenarios based on search query and priority
  const filteredScenarios = useMemo(() => {
    return scenarios.filter((scenario: any) => {
      const matchesSearch = !searchQuery.trim() ||
        scenario.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scenario.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scenario.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPriority = priorityFilter === "all" || scenario.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [scenarios, searchQuery, priorityFilter]);

  // Get unique tags for potential tag filtering
  const _allTags = useMemo(() => {
    const tagSet = new Set<string>();
    scenarios.forEach((scenario: any) => {
      scenario.tags?.forEach((tag: string) => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [scenarios]);

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

      {/* Scenarios Section */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">시나리오</h2>
        <div className="flex space-x-2">
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
          {(searchQuery || priorityFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setPriorityFilter("all");
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
              }}
            >
              필터 초기화
            </Button>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredScenarios.map((scenario: any) => (
                <Link
                  key={scenario.id}
                  to={`/scenarios/${scenario.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <h3 className="font-medium">{scenario.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
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
                    </div>
                  </div>
                  <span className="text-muted-foreground">→</span>
                </Link>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
