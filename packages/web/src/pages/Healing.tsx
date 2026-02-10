import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Search, ChevronDown, Check, AlertTriangle, X, ExternalLink } from "lucide-react";
import { getHealingRecords, getHealingStats, api, getScenario } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Separator } from "../components/ui/separator";
import { cn } from "../lib/utils";

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "auto_approved";

interface HealingRecord {
  id: string;
  scenarioId: string;
  stepId: string;
  runId: string;
  locatorDisplayName: string;
  originalStrategy: {
    type: string;
    [key: string]: any;
  };
  healedStrategy: {
    type: string;
    [key: string]: any;
  };
  trigger: "element_not_found" | "multiple_matches" | "wrong_element";
  confidence: number;
  status: "pending" | "approved" | "rejected" | "auto_approved";
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  propagatedTo?: string[];
  createdAt: string;
}

export default function Healing() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ["healing-records", statusFilter !== "all" ? statusFilter : undefined],
    queryFn: () => getHealingRecords(statusFilter !== "all" ? { status: statusFilter } : undefined),
  });

  const { data: statsData } = useQuery({
    queryKey: ["healing-stats"],
    queryFn: getHealingStats,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.api.healing[":id"].approve.$post({
        param: { id },
        json: { reviewedBy: "User" },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healing-records"] });
      queryClient.invalidateQueries({ queryKey: ["healing-stats"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.api.healing[":id"].reject.$post({
        param: { id },
        json: { reviewedBy: "User" },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healing-records"] });
      queryClient.invalidateQueries({ queryKey: ["healing-stats"] });
    },
  });

  const propagateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.api.healing[":id"].propagate.$post({
        param: { id },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healing-records"] });
    },
  });

  const records: HealingRecord[] = recordsData?.data ?? [];
  const stats = statsData?.data;

  // Filter records by search query
  const filteredRecords = records.filter((record) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.locatorDisplayName.toLowerCase().includes(query) ||
      record.id.toLowerCase().includes(query)
    );
  });

  // Sort records: pending first, then by date (newest first)
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    // Pending records first
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    // Then by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getConfidenceColor = (confidence: number) => {
    const percent = confidence * 100;
    if (percent >= 90) return "bg-green-500";
    if (percent >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getConfidenceTextColor = (confidence: number) => {
    const percent = confidence * 100;
    if (percent >= 90) return "text-green-700";
    if (percent >= 70) return "text-yellow-700";
    return "text-red-700";
  };

  const getTriggerBadge = (trigger: string) => {
    switch (trigger) {
      case "element_not_found":
        return <Badge variant="destructive">요소 없음</Badge>;
      case "multiple_matches":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">중복 발견</Badge>;
      case "wrong_element":
        return <Badge variant="outline" className="border-orange-500 text-orange-700">잘못된 요소</Badge>;
      default:
        return <Badge variant="outline">{trigger}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
            <AlertTriangle className="w-3 h-3 mr-1" />
            승인 대기
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="border-green-500 text-green-700">
            <Check className="w-3 h-3 mr-1" />
            승인됨
          </Badge>
        );
      case "auto_approved":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-700">
            <Check className="w-3 h-3 mr-1" />
            자동 승인
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="border-red-500 text-red-700">
            <X className="w-3 h-3 mr-1" />
            거부됨
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatStrategy = (strategy: any) => {
    return `${strategy.type}${
      strategy.role ? ` (${strategy.role}` : ""
    }${strategy.name ? `, "${strategy.name}"` : ""}${
      strategy.role || strategy.name ? ")" : ""
    }`;
  };

  if (recordsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Self-Healing</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {stats?.autoApproved ?? 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">자동 승인</div>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Check className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-yellow-600">
                {stats?.pending ?? 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">승인 대기</div>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-red-600">
                {stats?.rejected ?? 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">거부됨</div>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <X className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">필터:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[150px] justify-between">
                  {statusFilter === "all" && "전체 상태"}
                  {statusFilter === "pending" && "승인 대기"}
                  {statusFilter === "approved" && "승인됨"}
                  {statusFilter === "rejected" && "거부됨"}
                  {statusFilter === "auto_approved" && "자동 승인"}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  전체 상태
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("pending")}>
                  승인 대기
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("auto_approved")}>
                  자동 승인
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("approved")}>
                  승인됨
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("rejected")}>
                  거부됨
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="로케이터 이름 또는 ID로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Healing Records List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Healing 기록 ({sortedRecords.length})
          </h2>
        </div>

        {sortedRecords.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-gray-400 mb-2">
              <AlertTriangle className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-600">Self-Healing 기록이 없습니다.</p>
            {searchQuery && (
              <p className="text-sm text-gray-500 mt-2">
                검색 조건을 변경해보세요.
              </p>
            )}
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {sortedRecords.map((record) => (
              <AccordionItem key={record.id} value={record.id} className="border-b last:border-b-0">
                <div className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📍</span>
                        <span className="font-semibold text-gray-900 truncate">
                          {record.locatorDisplayName}
                        </span>
                        {getStatusBadge(record.status)}
                        {getTriggerBadge(record.trigger)}
                      </div>

                      {/* Strategy Change */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {formatStrategy(record.originalStrategy)}
                        </span>
                        <span>→</span>
                        <span className="font-mono bg-green-100 px-2 py-1 rounded text-green-700">
                          {formatStrategy(record.healedStrategy)}
                        </span>
                      </div>

                      {/* Confidence Bar */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm text-gray-600 min-w-[60px]">신뢰도:</span>
                        <div className="flex-1 max-w-xs">
                          <Progress
                            value={record.confidence * 100}
                            className="h-2"
                          />
                        </div>
                        <span className={cn("text-sm font-semibold", getConfidenceTextColor(record.confidence))}>
                          {(record.confidence * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* Timestamp */}
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(record.createdAt), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </div>

                      {/* Expandable Details Trigger */}
                      <AccordionTrigger className="text-sm text-blue-600 hover:text-blue-800 pt-2">
                        상세 정보 보기
                      </AccordionTrigger>
                    </div>

                    {/* Action Buttons */}
                    {record.status === "pending" && (
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(record.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectMutation.mutate(record.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          거부
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => propagateMutation.mutate(record.id)}
                          disabled={propagateMutation.isPending}
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          전체 승인
                        </Button>
                      </div>
                    )}

                    {(record.status === "approved" || record.status === "auto_approved") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => propagateMutation.mutate(record.id)}
                        disabled={propagateMutation.isPending}
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        전파
                      </Button>
                    )}
                  </div>

                  {/* Expandable Detail View */}
                  <AccordionContent>
                    <Separator className="my-4" />
                    <div className="space-y-4 text-sm">
                      {/* Original Strategy Details */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-2">원본 전략</h4>
                        <div className="bg-gray-50 rounded p-3">
                          <pre className="text-xs overflow-x-auto">
                            {JSON.stringify(record.originalStrategy, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {/* Healed Strategy Details */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-2">복구된 전략</h4>
                        <div className="bg-green-50 rounded p-3">
                          <pre className="text-xs overflow-x-auto">
                            {JSON.stringify(record.healedStrategy, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {/* Links */}
                      <div className="flex flex-wrap gap-4">
                        <a
                          href={`/scenarios/${record.scenarioId}`}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                          시나리오 보기
                        </a>
                        <a
                          href={`/runs/${record.runId}`}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                          실행 결과 보기
                        </a>
                      </div>

                      {/* Review Info */}
                      {(record.status === "approved" || record.status === "rejected") && (
                        <div className="border-t pt-4">
                          <h4 className="font-semibold text-gray-700 mb-2">검토 정보</h4>
                          <div className="space-y-1">
                            {record.reviewedBy && (
                              <p className="text-gray-600">
                                검토자: {record.reviewedBy}
                              </p>
                            )}
                            {record.reviewedAt && (
                              <p className="text-gray-600">
                                검토 시간:{" "}
                                {new Date(record.reviewedAt).toLocaleString("ko-KR")}
                              </p>
                            )}
                            {record.reviewNote && (
                              <p className="text-gray-600">
                                메모: {record.reviewNote}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Propagation Info */}
                      {record.propagatedTo && record.propagatedTo.length > 0 && (
                        <div className="border-t pt-4">
                          <h4 className="font-semibold text-gray-700 mb-2">
                            전파됨 ({record.propagatedTo.length}개 시나리오)
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {record.propagatedTo.map((scenarioId) => (
                              <Badge key={scenarioId} variant="outline">
                                {scenarioId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </div>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
