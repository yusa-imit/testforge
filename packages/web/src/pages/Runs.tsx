import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getRuns } from "../lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Runs() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["runs", 100],
    queryFn: () => getRuns(100),
  });

  const runs = useMemo(() => data?.data ?? [], [data]);

  // Filter runs based on status, date, and search query
  const filteredRuns = useMemo(() => {
    return runs.filter((run: any) => {
      // Status filter
      const matchesStatus = statusFilter === "all" || run.status === statusFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter !== "all") {
        const runDate = new Date(run.createdAt);
        const now = new Date();
        const diffMs = now.getTime() - runDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        switch (dateFilter) {
          case "1d":
            matchesDate = diffDays <= 1;
            break;
          case "7d":
            matchesDate = diffDays <= 7;
            break;
          case "30d":
            matchesDate = diffDays <= 30;
            break;
        }
      }
      
      // Search filter (searches scenario ID for now)
      const matchesSearch = !searchQuery.trim() ||
        run.scenarioId.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [runs, statusFilter, dateFilter, searchQuery]);

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

  const _getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-yellow-100 text-yellow-800";
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
            placeholder="시나리오 ID로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        <Select value={dateFilter} onValueChange={setDateFilter}>
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
            onClick={() => {
              setStatusFilter("all");
              setDateFilter("all");
              setSearchQuery("");
            }}
          >
            필터 초기화
          </Button>
        )}
        <span className="text-sm text-gray-500">
          {filteredRuns.length}/{runs.length}개 결과
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
            <Button
              variant="link"
              onClick={() => {
                setStatusFilter("all");
                setDateFilter("all");
                setSearchQuery("");
              }}
            >
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
              {filteredRuns.map((run: any) => (
                <tr key={run.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xl">{getStatusIcon(run.status)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/scenarios/${run.scenarioId}/runs/${run.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {run.scenarioId.slice(0, 8)}...
                    </Link>
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
    </div>
  );
}
