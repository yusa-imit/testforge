import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  StopCircle,
} from "lucide-react";
import { getRun, getRunSteps, getScenario, runScenario, cancelRun } from "../lib/api";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { Separator } from "../components/ui/separator";
import { cn } from "../lib/utils";

interface TestRun {
  id: string;
  scenarioId: string;
  status: "pending" | "running" | "passed" | "failed" | "cancelled";
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  environment: {
    baseUrl: string;
    variables: Record<string, unknown>;
  };
  summary?: {
    totalSteps: number;
    passedSteps: number;
    failedSteps: number;
    skippedSteps: number;
    healedSteps: number;
  };
  createdAt: string;
}

interface StepResult {
  id: string;
  runId: string;
  stepId: string;
  stepIndex: number;
  status: "passed" | "failed" | "skipped" | "healed";
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
  healing?: {
    originalStrategy: {
      type: string;
      [key: string]: unknown;
    };
    usedStrategy: {
      type: string;
      [key: string]: unknown;
    };
    confidence: number;
  };
  context?: {
    screenshotPath?: string;
    htmlSnapshotPath?: string;
    consoleLog?: string[];
  };
  createdAt: string;
}

function StatusBadge({ status }: { status: TestRun["status"] }) {
  const variants: Record<
    TestRun["status"],
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
  > = {
    pending: { variant: "secondary", label: "대기 중" },
    running: { variant: "secondary", label: "실행 중" },
    passed: { variant: "default", label: "성공" },
    failed: { variant: "destructive", label: "실패" },
    cancelled: { variant: "outline", label: "취소됨" },
  };

  const config = variants[status];
  return (
    <Badge variant={config.variant} className={cn(
      status === "passed" && "bg-green-600 hover:bg-green-700",
      status === "running" && "bg-blue-600 hover:bg-blue-700"
    )}>
      {config.label}
    </Badge>
  );
}

function StepStatusIcon({ status }: { status: StepResult["status"] }) {
  switch (status) {
    case "passed":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "failed":
      return <XCircle className="h-5 w-5 text-red-600" />;
    case "healed":
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    case "skipped":
      return <ChevronDown className="h-5 w-5 text-gray-400" />;
  }
}

interface StrategyObj {
  type: string;
  [key: string]: unknown;
}

function formatStrategy(strategy: StrategyObj | null | undefined): string {
  if (!strategy) return "N/A";

  const type = strategy.type;

  switch (type) {
    case "testId":
      return `testId="${strategy.value as string}"`;
    case "role":
      return strategy.name
        ? `role=${strategy.role as string}, name="${strategy.name as string}"`
        : `role=${strategy.role as string}`;
    case "text":
      return `text="${strategy.value as string}"${strategy.exact ? " (exact)" : ""}`;
    case "label":
      return `label="${strategy.value as string}"`;
    case "css":
      return `css="${strategy.selector as string}"`;
    case "xpath":
      return `xpath="${strategy.expression as string}"`;
    default:
      return JSON.stringify(strategy);
  }
}

export default function RunDetail() {
  const { scenarioId, runId } = useParams<{ scenarioId: string; runId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: runData, isLoading: runLoading } = useQuery({
    queryKey: ["runs", runId],
    queryFn: () => getRun(runId!),
    enabled: !!runId,
  });

  const { data: stepsData, isLoading: stepsLoading } = useQuery({
    queryKey: ["runs", runId, "steps"],
    queryFn: () => getRunSteps(runId!),
    enabled: !!runId,
  });

  const { data: scenarioData } = useQuery({
    queryKey: ["scenarios", scenarioId],
    queryFn: () => getScenario(scenarioId!),
    enabled: !!scenarioId,
  });

  const rerunMutation = useMutation({
    mutationFn: () => runScenario(scenarioId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      if (data?.data?.runId) {
        navigate(`/scenarios/${scenarioId}/runs/${data.data.runId}`);
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelRun(runId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs", runId] });
    },
  });

  if (runLoading || stepsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  const run: TestRun | undefined = runData?.data;
  const steps: StepResult[] = stepsData?.data ?? [];
  const scenario = scenarioData?.data;

  if (!run) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">실행을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}초`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/scenarios/${scenarioId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {scenario?.name || "시나리오로 돌아가기"}
          </Button>
        </div>
        <div className="flex space-x-2">
          {run?.status === "running" && (
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              <StopCircle className="h-4 w-4 mr-2" />
              취소
            </Button>
          )}
          <Button
            onClick={() => rerunMutation.mutate()}
            disabled={rerunMutation.isPending}
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-2",
              rerunMutation.isPending && "animate-spin"
            )} />
            재실행
          </Button>
        </div>
      </div>

      {/* Run Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>실행 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">실행 ID</div>
              <div className="font-mono text-sm truncate">{run.id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">상태</div>
              <div className="mt-1">
                <StatusBadge status={run.status} />
                {run.summary && run.summary.healedSteps > 0 && (
                  <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-300">
                    치유 {run.summary.healedSteps}건
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">실행 시간</div>
              <div className="text-sm">
                {run.startedAt
                  ? formatDistanceToNow(new Date(run.startedAt), {
                      addSuffix: true,
                      locale: ko,
                    })
                  : "N/A"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">소요 시간</div>
              <div className="text-sm">{formatDuration(run.duration)}</div>
            </div>
          </div>

          {/* Summary Stats */}
          {run.summary && (
            <>
              <Separator />
              <div>
                <div className="text-sm font-medium text-gray-700 mb-3">
                  스텝 요약
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {run.summary.totalSteps}
                    </div>
                    <div className="text-xs text-gray-500">전체</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {run.summary.passedSteps}
                    </div>
                    <div className="text-xs text-gray-500">성공</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {run.summary.failedSteps}
                    </div>
                    <div className="text-xs text-gray-500">실패</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {run.summary.healedSteps}
                    </div>
                    <div className="text-xs text-gray-500">치유됨</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-400">
                      {run.summary.skippedSteps}
                    </div>
                    <div className="text-xs text-gray-500">건너뜀</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Step Results */}
      <Card>
        <CardHeader>
          <CardTitle>스텝 결과</CardTitle>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              스텝 결과가 없습니다.
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {steps.map((step, index) => (
                <AccordionItem key={step.id} value={step.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center space-x-3 flex-1 text-left">
                      <StepStatusIcon status={step.status} />
                      <div className="flex-1">
                        <div className="font-medium">
                          {index + 1}. 스텝 #{step.stepIndex}
                        </div>
                        {step.status === "healed" && (
                          <Badge
                            variant="outline"
                            className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-300"
                          >
                            치유됨
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDuration(step.duration)}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pl-8 pr-4 pt-2">
                      {/* Healing Info */}
                      {step.status === "healed" && step.healing && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                          <div className="text-sm font-medium text-yellow-900 mb-2">
                            Self-Healing 발생
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-yellow-700">신뢰도:</span>{" "}
                              <span className="font-semibold">
                                {(step.healing.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-yellow-700">원래 전략:</span>{" "}
                              <code className="text-xs bg-white px-2 py-1 rounded border">
                                {formatStrategy(step.healing.originalStrategy)}
                              </code>
                            </div>
                            <div>
                              <span className="text-yellow-700">사용된 전략:</span>{" "}
                              <code className="text-xs bg-white px-2 py-1 rounded border">
                                {formatStrategy(step.healing.usedStrategy)}
                              </code>
                            </div>
                            <div className="pt-2">
                              <Link
                                to="/healing"
                                className="inline-flex items-center text-sm text-yellow-700 hover:text-yellow-900 font-medium"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Healing 대시보드에서 승인하기
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Error Info */}
                      {step.status === "failed" && step.error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                          <div className="text-sm font-medium text-red-900 mb-2">
                            에러 발생
                          </div>
                          <div className="space-y-2 text-sm text-red-800">
                            <div>
                              <span className="font-semibold">메시지:</span>{" "}
                              {step.error.message}
                            </div>
                            {step.error.stack && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-red-700 hover:text-red-900">
                                  스택 트레이스 보기
                                </summary>
                                <pre className="mt-2 text-xs bg-white p-3 rounded border border-red-200 overflow-x-auto">
                                  {step.error.stack}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Screenshot */}
                      {step.context?.screenshotPath && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            스크린샷
                          </div>
                          <div className="border rounded-md overflow-hidden bg-gray-50">
                            <img
                              src={`http://localhost:3001/api/screenshots/${step.context.screenshotPath}`}
                              alt={`Step ${index + 1} screenshot`}
                              className="w-full hover:scale-105 transition-transform cursor-pointer"
                              onClick={(e) => {
                                // Open screenshot in new tab for full view
                                window.open(e.currentTarget.src, '_blank');
                              }}
                              onError={(e) => {
                                // Handle missing screenshot gracefully
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="text-sm text-red-600 p-4">스크린샷을 불러올 수 없습니다.</div>';
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Console Logs */}
                      {step.context?.consoleLog && step.context.consoleLog.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            콘솔 로그
                          </div>
                          <div className="bg-gray-900 text-gray-100 rounded-md p-3 text-xs font-mono overflow-x-auto max-h-60 overflow-y-auto">
                            {step.context.consoleLog.map((log, i) => (
                              <div key={i} className="py-0.5">
                                {log}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
