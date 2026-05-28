import { useState } from "react";
import * as React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { Scenario, Step, Variable } from "@testforge/core";
import { getScenario, updateScenario, runScenario, deleteScenario, duplicateScenario, getRuns } from "../lib/api";
import { VariableEditor } from "../components/VariableEditor";
import { StepEditModal } from "../components/StepEditModal";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ChevronLeft, Play, Save, Trash2, Edit, GripVertical, Copy } from "lucide-react";
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

  // Run mutation
  const runMutation = useMutation({
    mutationFn: () => runScenario(id!),
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

  const handleSave = () => {
    saveMutation.mutate({
      priority,
      tags,
      variables,
      steps,
    });
  };

  const handleRun = () => {
    // Save first, then run
    saveMutation.mutate(
      {
        priority,
        tags,
        variables,
        steps,
      },
      {
        onSuccess: () => {
          runMutation.mutate();
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
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                  {index + 1}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{STEP_TYPE_ICONS[step.type] || "📌"}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {step.description}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {step.type}
                    </Badge>
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

      {/* Step Edit Modal */}
      <StepEditModal
        open={stepModalOpen}
        onOpenChange={setStepModalOpen}
        step={editingStep}
        onSave={handleSaveStep}
      />
    </div>
  );
}
