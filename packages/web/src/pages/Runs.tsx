import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Download, Trash2 } from "lucide-react";
import { getRuns } from "../lib/api";
import { axiosClient } from "../lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const PAGE_SIZE = 50;

function getFromDate(filter: string): string | undefined {
  const now = new Date();
  switch (filter) {
    case "1d": return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default: return undefined;
  }
}

export default function Runs() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [cleanupDays, setCleanupDays] = useState(30);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const serverStatus = statusFilter !== "all" ? statusFilter : undefined;
  const serverFrom = dateFilter !== "all" ? getFromDate(dateFilter) : undefined;

  const offset = searchQuery.trim() ? 0 : page * PAGE_SIZE;
  const limit = searchQuery.trim() ? 500 : PAGE_SIZE;

  const { data, isLoading } = useQuery({
    queryKey: ["runs", limit, offset, serverStatus, serverFrom],
    queryFn: () => getRuns(limit, {
      ...(serverStatus ? { status: serverStatus } : {}),
      ...(serverFrom ? { from: serverFrom } : {}),
      offset,
    }),
  });

  const runs = useMemo(() => data?.data ?? [], [data]);

  // Client-side search filter only (when searching, we fetch more and filter locally)
  const filteredRuns = useMemo(() => {
    if (!searchQuery.trim()) return runs;
    return runs.filter((run) =>
      run.scenarioId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (run.scenarioName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [runs, searchQuery]);

  const resetFilters = () => {
    setStatusFilter("all");
    setDateFilter("all");
    setSearchQuery("");
    setPage(0);
  };

  const triggerDownload = (format: "csv" | "junit") => {
    const params = new URLSearchParams();
    if (serverStatus) params.set("status", serverStatus);
    if (serverFrom) params.set("from", serverFrom);
    if (format === "junit") params.set("format", "junit");
    const qs = params.toString();
    const url = `/api/runs/export${qs ? `?${qs}` : ""}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(0);
  };

  const handleCleanup = async () => {
    setCleanupLoading(true);
    try {
      const res = await axiosClient.delete<{ success: boolean; data: { deleted: number; olderThanDays: number } }>(
        `/runs/cleanup?olderThan=${cleanupDays}`
      );
      const { deleted } = res.data.data;
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      setShowCleanupDialog(false);
      toast({ title: `${deleted}개의 실행 기록이 삭제되었습니다.` });
    } catch {
      toast({ title: "정리 실패", variant: "destructive" });
    } finally {
      setCleanupLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return "✅";
      case "failed":
        return "❌";
      case "running":
        return "🔄";
      case "cancelled":
        return "⏹️";
      default:
        return "⏳";
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">실행 이력</h1>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            placeholder="시나리오 이름 또는 ID로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="passed">✅ 성공</SelectItem>
            <SelectItem value="failed">❌ 실패</SelectItem>
            <SelectItem value="running">🔄 실행 중</SelectItem>
            <SelectItem value="pending">⏳ 대기</SelectItem>
            <SelectItem value="cancelled">⏹️ 취소</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={handleFilterChange(setDateFilter)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="기간" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 기간</SelectItem>
            <SelectItem value="1d">최근 24시간</SelectItem>
            <SelectItem value="7d">최근 7일</SelectItem>
            <SelectItem value="30d">최근 30일</SelectItem>
          </SelectContent>
        </Select>
        {(statusFilter !== "all" || dateFilter !== "all" || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
          >
            필터 초기화
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => triggerDownload("csv")}
          className="ml-auto"
          title="현재 필터 조건으로 CSV 내보내기"
        >
          <Download className="h-4 w-4 mr-1" />
          CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => triggerDownload("junit")}
          title="JUnit XML 형식으로 내보내기 (CI/CD 연동용)"
        >
          <Download className="h-4 w-4 mr-1" />
          JUnit XML
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCleanupDialog(true)}
          title="오래된 실행 기록 삭제"
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          정리
        </Button>
        <span className="text-sm text-gray-500">
          {searchQuery.trim()
            ? `${filteredRuns.length}개 결과`
            : `${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + runs.length}번째`
          }
        </span>
      </div>

      <div className="bg-white rounded-lg shadow">
        {runs.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>실행 이력이 없습니다.</p>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>필터 조건에 맞는 실행 이력이 없습니다.</p>
            <Button variant="link" onClick={resetFilters}>
              필터 초기화
            </Button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시나리오
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  결과
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  소요 시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시작 시간
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRuns.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xl">{getStatusIcon(run.status)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/scenarios/${run.scenarioId}/runs/${run.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 block"
                    >
                      {run.scenarioName || `시나리오 ${run.scenarioId.slice(0, 8)}...`}
                    </Link>
                    <span className="text-xs text-gray-400">
                      {run.scenarioId.slice(0, 8)}...
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {run.summary && (
                      <div className="text-sm">
                        <span className="text-green-600">
                          {run.summary.passedSteps} 통과
                        </span>
                        {run.summary.failedSteps > 0 && (
                          <span className="ml-2 text-red-600">
                            {run.summary.failedSteps} 실패
                          </span>
                        )}
                        {run.summary.healedSteps > 0 && (
                          <span className="ml-2 text-yellow-600">
                            {run.summary.healedSteps} 치유
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {run.duration
                      ? `${(run.duration / 1000).toFixed(1)}s`
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(run.createdAt).toLocaleString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cleanup confirmation dialog */}
      <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>오래된 실행 기록 정리</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              완료된 실행 기록 중 지정한 기간보다 오래된 것을 영구 삭제합니다. 실행 중인 기록은 삭제되지 않습니다.
            </p>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap">
                삭제 기준
              </label>
              <Select
                value={String(cleanupDays)}
                onValueChange={(v) => setCleanupDays(Number(v))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7일 이전</SelectItem>
                  <SelectItem value="14">14일 이전</SelectItem>
                  <SelectItem value="30">30일 이전</SelectItem>
                  <SelectItem value="60">60일 이전</SelectItem>
                  <SelectItem value="90">90일 이전</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCleanupDialog(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={cleanupLoading}
            >
              {cleanupLoading ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagination controls — hidden when searching (client-side filter) */}
      {!searchQuery.trim() && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ← 이전
          </Button>
          <span className="text-sm text-gray-500">
            {page + 1} 페이지
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={runs.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
          >
            다음 →
          </Button>
        </div>
      )}
    </div>
  );
}
