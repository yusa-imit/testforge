import { useState } from "react";
import * as React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { Scenario, Step, Variable } from "@testforge/core";
import { getScenario, updateScenario, runScenario, deleteScenario, duplicateScenario, getRuns, getScenarioStats, getScenarioStepStats, getEnvironments, getServices, getFeatures, moveScenario } from "../lib/api";
import type { ScenarioStepStat, Environment } from "../lib/api";
import { VariableEditor } from "../components/VariableEditor";
import { StepEditModal } from "../components/StepEditModal";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { ChevronLeft, Play, Save, Trash2, Edit, GripVertical, Copy, FolderInput } from "lucide-react";
import { useToast } from "../hooks/use-toast";

const STEP_TYPE_ICONS: Record<string, string> = {
  navigate: "🌐",
  click: "👆",
  fill: "✍️",
  select: "📋",
  hover: "🖱️",
  wait: "⏳",
  assert: "✓",
  screenshot: "📸",
  "api-request": "🔗",
  "api-assert": "✅",
  component: "🔄",
  script: "📜",
};

function getRunStatusIcon(status: string): string {
  switch (status) {
    case "passed": return "✅";
    case "failed": return "❌";
    case "running": return "🔄";
    case "cancelled": return "⏹️";
    default: return "⏳";
  }
}

export default function ScenarioEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Local state
  const [priority, setPriority] = useState<"critical" | "high" | "medium" | "low">("medium");
  const [tags, setTags] = useState<string[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [newTag, setNewTag] = useState("");

  // Modal state
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  // Run-with-variables dialog
  const [runVarsDialogOpen, setRunVarsDialogOpen] = useState(false);
  const [runVarOverrides, setRunVarOverrides] = useState<Record<string, string>>({});
  const [selectedEnvId, setSelectedEnvId] = useState<string>("");

  // Move-to-feature dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTargetServiceId, setMoveTargetServiceId] = useState<string>("");
  const [moveTargetFeatureId, setMoveTargetFeatureId] = useState<string>("");

  // Fetch scenario
  const { data, isLoading } = useQuery({
    queryKey: ["scenario", id],
    queryFn: () => getScenario(id!),
    enabled: !!id,
  });

  // Fetch recent runs for this scenario
  const { data: runsData } = useQuery({
    queryKey: ["runs", "scenario", id],
    queryFn: () => getRuns(10, { scenarioId: id }),
    enabled: !!id,
  });
  const recentRuns = (runsData?.data ?? []) as Array<{
    id: string;
    status: string;
    createdAt: string;
    startedAt?: string;
    duration?: number;
    summary?: { passedSteps: number; failedSteps: number; healedSteps: number };
  }>;

  // Fetch scenario stats
  const { data: statsData } = useQuery({
    queryKey: ["scenario-stats", id],
    queryFn: () => getScenarioStats(id!),
    enabled: !!id,
  });
  const stats = statsData?.data;

  // Fetch step performance stats
  const { data: stepStatsData } = useQuery({
    queryKey: ["scenario-step-stats", id],
    queryFn: () => getScenarioStepStats(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
  const stepStats: ScenarioStepStat[] = stepStatsData ?? [];

  // Fetch available environments for run dialog
  const { data: environments = [] } = useQuery<Environment[]>({
    queryKey: ["environments"],
    queryFn: getEnvironments,
    staleTime: 60_000,
  });

  // Fetch services for move dialog
  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
    enabled: moveDialogOpen,
    staleTime: 60_000,
  });
  const allServices = (servicesData?.data ?? []) as Array<{ id: string; name: string }>;

  // Fetch features for selected service in move dialog
  const { data: moveFeaturesData } = useQuery({
    queryKey: ["features", moveTargetServiceId],
    queryFn: () => getFeatures(moveTargetServiceId),
    enabled: moveDialogOpen && !!moveTargetServiceId,
  });
  const moveFeatures = (moveFeaturesData?.data ?? []) as Array<{ id: string; name: string }>;

  // Initialize state from fetched data
  React.useEffect(() => {
    if (data?.success && data.data) {
      const scenario = data.data;
      setPriority(scenario.priority);
      setTags(scenario.tags);
      setVariables(scenario.variables || []);
      setSteps(scenario.steps || []);
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (updates: Partial<Scenario>) => updateScenario(id!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenario", id] });
      toast({
        title: "저장 완료",
        description: "시나리오가 성공적으로 저장되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "저장 실패",
        description: error.message || "시나리오 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Run mutation (accepts optional variable overrides + environmentId)
  const runMutation = useMutation({
    mutationFn: ({ vars, envId }: { vars?: Record<string, unknown>; envId?: string } = {}) =>
      runScenario(id!, vars, envId),
    onSuccess: (result) => {
      toast({
        title: "실행 시작",
        description: "시나리오 실행이 시작되었습니다.",
      });
      if (result?.data?.runId) {
        navigate(`/scenarios/${id}/runs/${result.data.runId}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "실행 실패",
        description: error.message || "시나리오 실행 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteScenario(id!),
    onSuccess: () => {
      toast({
        title: "삭제 완료",
        description: "시나리오가 삭제되었습니다.",
      });
      navigate(-1);
    },
    onError: (error: Error) => {
      toast({
        title: "삭제 실패",
        description: error.message || "시나리오 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: () => duplicateScenario(id!),
    onSuccess: (result) => {
      toast({
        title: "복제 완료",
        description: "시나리오가 복제되었습니다.",
      });
      if (result?.data?.id) {
        navigate(`/scenarios/${result.data.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "복제 실패",
        description: error.message || "시나리오 복제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Move mutation
  const moveMutation = useMutation({
    mutationFn: (featureId: string) => moveScenario(id!, featureId),
    onSuccess: () => {
      setMoveDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["scenario", id] });
      toast({
        title: "이동 완료",
        description: "시나리오가 다른 기능으로 이동되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "이동 실패",
        description: error.message || "시나리오 이동 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      priority,
      tags,
      variables,
      steps,
    });
  };

  const handleRun = () => {
    // Pre-fill variable overrides with defaults
    const defaults: Record<string, string> = {};
    for (const v of variables) {
      defaults[v.name] = v.defaultValue != null ? String(v.defaultValue) : "";
    }
    setRunVarOverrides(defaults);
    // Pre-select default environment if available
    const defaultEnv = environments.find((e) => e.isDefault);
    setSelectedEnvId(defaultEnv?.id ?? "");
    setRunVarsDialogOpen(true);
  };

  const doRun = (varOverrides?: Record<string, string>, envId?: string) => {
    saveMutation.mutate(
      { priority, tags, variables, steps },
      {
        onSuccess: () => {
          const overrides =
            varOverrides && Object.keys(varOverrides).length > 0
              ? (varOverrides as Record<string, unknown>)
              : undefined;
          runMutation.mutate({ vars: overrides, envId: envId || undefined });
        },
      }
    );
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleAddStep = () => {
    setEditingStep(null);
    setEditingStepIndex(null);
    setStepModalOpen(true);
  };

  const handleEditStep = (step: Step, index: number) => {
    setEditingStep(step);
    setEditingStepIndex(index);
    setStepModalOpen(true);
  };

  const handleSaveStep = (step: Step) => {
    if (editingStepIndex !== null) {
      // Update existing step
      const newSteps = [...steps];
      newSteps[editingStepIndex] = step;
      setSteps(newSteps);
    } else {
      // Add new step
      setSteps([...steps, step]);
    }
  };

  const handleDeleteStep = (index: number) => {
    if (confirm("이 스텝을 삭제하시겠습니까?")) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newSteps.length) return;

    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  };

  if (isLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  if (!data || !data.success) {
    return <div className="text-center py-12">시나리오를 찾을 수 없습니다.</div>;
  }

  const scenario = data.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <nav className="text-sm text-gray-500 mb-2 flex items-center">
            <Link to="/services" className="hover:text-gray-700 flex items-center">
              <ChevronLeft className="h-4 w-4" />
              돌아가기
            </Link>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">{scenario.name}</h1>
          {scenario.description && (
            <p className="text-sm text-gray-500 mt-1">{scenario.description}</p>
          )}
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
          <Button
            variant="outline"
            onClick={() => duplicateMutation.mutate()}
            disabled={duplicateMutation.isPending}
          >
            <Copy className="h-4 w-4 mr-2" />
            복제
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setMoveTargetServiceId("");
              setMoveTargetFeatureId("");
              setMoveDialogOpen(true);
            }}
          >
            <FolderInput className="h-4 w-4 mr-2" />
            이동
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            저장
          </Button>
          <Button onClick={handleRun} disabled={runMutation.isPending || saveMutation.isPending}>
            <Play className="h-4 w-4 mr-2" />
            실행
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">기본 정보</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              우선순위
            </label>
            <Select value={priority} onValueChange={(v: "critical" | "high" | "medium" | "low") => setPriority(v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">태그</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                placeholder="태그 입력..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <Button size="sm" onClick={handleAddTag}>
                추가
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Variables */}
      <Card className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">변수</h2>
        <VariableEditor variables={variables} onChange={setVariables} />
      </Card>

      {/* Steps */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">스텝</h2>
          <Button onClick={handleAddStep}>+ 스텝 추가</Button>
        </div>

        {steps.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 mb-4">스텝이 없습니다.</p>
            <Button variant="outline" onClick={handleAddStep}>
              + 첫 번째 스텝 추가
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-4 rounded-lg transition-colors ${step.disabled ? "bg-gray-100 opacity-60 hover:opacity-80" : "bg-gray-50 hover:bg-gray-100"}`}
              >
                {/* Drag Handle */}
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    onClick={() => handleMoveStep(index, "up")}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <button
                    onClick={() => handleMoveStep(index, "down")}
                    disabled={index === steps.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>

                {/* Step Number */}
                <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${step.disabled ? "bg-gray-200 text-gray-400" : "bg-blue-100 text-blue-600"}`}>
                  {index + 1}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-lg">{STEP_TYPE_ICONS[step.type] || "📌"}</span>
                    <span className={`text-sm font-medium ${step.disabled ? "text-gray-400 line-through" : "text-gray-900"}`}>
                      {step.description}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {step.type}
                    </Badge>
                    {step.disabled && (
                      <Badge variant="secondary" className="text-xs">비활성</Badge>
                    )}
                    {step.retries !== undefined && step.retries > 0 && (
                      <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                        재시도 ×{step.retries}
                      </Badge>
                    )}
                  </div>

                  {/* Step Config Preview */}
                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                    {step.type === "navigate" && (
                      <div>→ {(step.config as Record<string, unknown>).url as string}</div>
                    )}
                    {["click", "fill", "select", "hover"].includes(step.type) && (
                      <div>
                        └─ {((step.config as Record<string, unknown>).locator as { displayName?: string } | undefined)?.displayName || "요소"}
                        {step.type === "fill" && ` = "${(step.config as Record<string, unknown>).value as string}"`}
                      </div>
                    )}
                    {step.type === "api-request" && (
                      <div>
                        {(step.config as Record<string, unknown>).method as string} {(step.config as Record<string, unknown>).url as string}
                      </div>
                    )}
                    {step.timeout && <div className="text-orange-600">⏱ {step.timeout}ms</div>}
                    {step.continueOnError && (
                      <div className="text-yellow-600">⚠️ 실패해도 계속 진행</div>
                    )}
                    {step.retries !== undefined && step.retries > 0 && (
                      <div className="text-purple-600">
                        🔁 최대 {step.retries}회 재시도 {step.retryDelay ? `(${step.retryDelay}ms 간격)` : "(1000ms 간격)"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditStep(step, index)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteStep(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Scenario Stats */}
      {stats && stats.totalRuns > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">실행 통계 (최근 7일)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalRuns}</div>
              <div className="text-xs text-gray-500">전체 실행</div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${
                  stats.passRate >= 0.9
                    ? "text-green-600"
                    : stats.passRate >= 0.7
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {(stats.passRate * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">성공률</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{stats.failedRuns}</div>
              <div className="text-xs text-gray-500">실패</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">
                {stats.avgDuration != null
                  ? stats.avgDuration < 1000
                    ? `${stats.avgDuration}ms`
                    : `${(stats.avgDuration / 1000).toFixed(1)}s`
                  : "—"}
              </div>
              <div className="text-xs text-gray-500">평균 소요시간</div>
            </div>
          </div>
          {/* Trend bar chart (simplified) */}
          {stats.trend.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2">일별 실행 현황</div>
              <div className="flex items-end gap-1 h-12">
                {stats.trend.map((day) => {
                  const total = day.passed + day.failed + day.healed;
                  const passRate = total > 0 ? (day.passed + day.healed) / total : 0;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center gap-0.5"
                      title={`${day.date}: ${day.passed}통과 ${day.failed}실패 ${day.healed}치유`}
                    >
                      <div
                        className={`w-full rounded-sm ${
                          passRate >= 0.9
                            ? "bg-green-400"
                            : passRate > 0
                            ? "bg-yellow-400"
                            : "bg-red-400"
                        }`}
                        style={{ height: `${Math.max(4, (total / Math.max(...stats.trend.map((d) => d.passed + d.failed + d.healed), 1)) * 40)}px` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Recent Runs */}
      {recentRuns.length > 0 && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">최근 실행 이력</h2>
            <Link to="/runs" className="text-sm text-blue-600 hover:text-blue-800">
              전체 보기 →
            </Link>
          </div>
          <div className="space-y-1">
            {recentRuns.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getRunStatusIcon(run.status)}</span>
                  <div>
                    <div className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(run.startedAt ?? run.createdAt), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </div>
                    {run.summary && (
                      <div className="text-xs text-gray-400">
                        {run.summary.passedSteps}통과 / {run.summary.failedSteps}실패
                        {run.summary.healedSteps > 0 && ` / ${run.summary.healedSteps}치유`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {run.duration != null && (
                    <span className="text-sm text-gray-400">
                      {run.duration < 1000
                        ? `${run.duration}ms`
                        : `${(run.duration / 1000).toFixed(1)}s`}
                    </span>
                  )}
                  <Link
                    to={`/scenarios/${id}/runs/${run.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    상세 →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Step Performance Card */}
      {stepStats.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">스텝 성능 분석</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left pb-2 pr-4">스텝</th>
                  <th className="text-right pb-2 px-3">실행 수</th>
                  <th className="text-right pb-2 px-3">평균</th>
                  <th className="text-right pb-2 px-3">최소</th>
                  <th className="text-right pb-2 px-3">최대</th>
                  <th className="text-right pb-2 pl-3">실패율</th>
                </tr>
              </thead>
              <tbody>
                {stepStats.map((s) => {
                  const stepDef = steps[s.stepIndex];
                  const icon = stepDef ? (STEP_TYPE_ICONS[stepDef.type] || "📌") : "📌";
                  const label = stepDef ? stepDef.description : `스텝 #${s.stepIndex + 1}`;
                  const fmtMs = (ms: number | null) => ms == null ? "—" : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
                  const failPct = (s.failureRate * 100).toFixed(0);
                  const failColor = s.failureRate >= 0.5 ? "text-red-600" : s.failureRate > 0 ? "text-yellow-600" : "text-green-600";
                  return (
                    <tr key={s.stepIndex} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-4 max-w-[200px] truncate" title={label}>
                        <span className="mr-1">{icon}</span>
                        <span className="text-gray-700">{label}</span>
                      </td>
                      <td className="text-right py-2 px-3 text-gray-500">{s.count}</td>
                      <td className="text-right py-2 px-3 font-mono">{fmtMs(s.avgDuration)}</td>
                      <td className="text-right py-2 px-3 font-mono text-green-700">{fmtMs(s.minDuration)}</td>
                      <td className="text-right py-2 px-3 font-mono text-gray-500">{fmtMs(s.maxDuration)}</td>
                      <td className={`text-right py-2 pl-3 font-medium ${failColor}`}>{failPct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Step Edit Modal */}
      <StepEditModal
        open={stepModalOpen}
        onOpenChange={setStepModalOpen}
        step={editingStep}
        onSave={handleSaveStep}
      />

      {/* Run Dialog (variables + environment) */}
      <Dialog open={runVarsDialogOpen} onOpenChange={setRunVarsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>실행 설정</DialogTitle>
            <DialogDescription>
              환경 및 변수를 선택한 후 실행하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Environment selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">환경</label>
              <Select value={selectedEnvId} onValueChange={setSelectedEnvId}>
                <SelectTrigger>
                  <SelectValue placeholder="서비스 기본 환경 사용" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">서비스 기본 환경</SelectItem>
                  {environments.map((env) => (
                    <SelectItem key={env.id} value={env.id}>
                      {env.name}
                      {env.isDefault && " ★"}
                      {env.baseUrl && (
                        <span className="text-gray-400 text-xs ml-1">({env.baseUrl})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Variable overrides */}
            {variables.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">변수</p>
                {variables.map((v) => (
                  <div key={v.name} className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      {v.name}
                      {v.description && (
                        <span className="ml-2 text-xs text-gray-400">{v.description}</span>
                      )}
                    </label>
                    <Input
                      value={runVarOverrides[v.name] ?? ""}
                      onChange={(e) =>
                        setRunVarOverrides((prev) => ({ ...prev, [v.name]: e.target.value }))
                      }
                      placeholder={v.defaultValue != null ? String(v.defaultValue) : "값 없음"}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunVarsDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                setRunVarsDialogOpen(false);
                doRun(runVarOverrides, selectedEnvId || undefined);
              }}
              disabled={runMutation.isPending || saveMutation.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>시나리오 이동</DialogTitle>
            <DialogDescription>
              이동할 대상 서비스와 기능을 선택하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">서비스</label>
              <Select
                value={moveTargetServiceId}
                onValueChange={(v) => {
                  setMoveTargetServiceId(v);
                  setMoveTargetFeatureId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="서비스 선택..." />
                </SelectTrigger>
                <SelectContent>
                  {allServices.map((svc) => (
                    <SelectItem key={svc.id} value={svc.id}>
                      {svc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">기능</label>
              <Select
                value={moveTargetFeatureId}
                onValueChange={setMoveTargetFeatureId}
                disabled={!moveTargetServiceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={moveTargetServiceId ? "기능 선택..." : "먼저 서비스를 선택하세요"} />
                </SelectTrigger>
                <SelectContent>
                  {moveFeatures.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => moveMutation.mutate(moveTargetFeatureId)}
              disabled={!moveTargetFeatureId || moveMutation.isPending}
            >
              이동
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
