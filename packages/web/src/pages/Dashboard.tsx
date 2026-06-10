import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { getServices, getHealingStats, getDashboardData, getFlakyScenarios } from "../lib/api";
import type { FlakyScenario } from "../lib/api";

interface RecentFailureRun {
  id: string;
  scenarioId: string;
  scenarioName: string;
  createdAt: string;
}

type ServiceWithStats = {
  id: string;
  name: string;
  description?: string;
  baseUrl: string;
  featureCount?: number;
  scenarioCount?: number;
  lastRunStatus?: string | null;
  lastRunAt?: string | null;
};

interface TrendDay {
  date: string;
  passed: number;
  failed: number;
  healed: number;
}

interface GlobalStats {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  healedRuns: number;
  cancelledRuns: number;
  passRate: number;
  avgDuration: number | null;
  trend: TrendDay[];
}

const RUN_STATUS_ICON: Record<string, string> = {
  passed:    "✅",
  failed:    "❌",
  healed:    "⚠️",
  running:   "🔄",
  cancelled: "⏹️",
};

export default function Dashboard() {
  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });

  const { data: healingStats } = useQuery({
    queryKey: ["healing-stats"],
    queryFn: getHealingStats,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboardData,
    refetchInterval: 30000,
  });

  const { data: flakyData } = useQuery({
    queryKey: ["flaky-scenarios"],
    queryFn: () => getFlakyScenarios(3, 30),
    staleTime: 60000,
  });

  const services = servicesData?.data ?? [];
  const healStats = healingStats?.data;
  const stats = (dashboardData?.data as any)?.stats ?? { total: 0, passed: 0, failed: 0, healed: 0 };
  const recentFailures = (dashboardData?.data as any)?.recentFailures ?? [];
  const globalStats = (dashboardData?.data as any)?.globalStats as GlobalStats | undefined;
  const flakyScenarios: FlakyScenario[] = flakyData ?? [];

  const successRate = stats.total > 0
    ? ((stats.passed / stats.total) * 100).toFixed(1)
    : "0.0";

  const globalPassRate = globalStats && globalStats.totalRuns > 0
    ? (globalStats.passRate * 100).toFixed(1)
    : null;

  const globalPassRateCls = globalStats
    ? globalStats.passRate >= 0.9
      ? "text-green-600"
      : globalStats.passRate >= 0.7
      ? "text-yellow-600"
      : "text-red-600"
    : "text-gray-900";

  const maxTrendTotal = globalStats?.trend?.length
    ? Math.max(...globalStats.trend.map((d) => d.passed + d.failed + d.healed), 1)
    : 1;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">TestForge</h1>
        <Link
          to="/services"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          + 새 서비스
        </Link>
      </div>

      {/* Stats Cards - PRD 6.2.1 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">최근 24시간</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">전체 실행</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.passed}</div>
            <div className="text-sm text-gray-500">성공</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-500">실패</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.healed}</div>
            <div className="text-sm text-gray-500">치유됨</div>
          </div>
        </div>
        <div className="flex items-center">
          <div className="flex-1 bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-green-500 h-2.5 rounded-full transition-all"
              style={{ width: `${successRate}%` }}
            />
          </div>
          <span className="ml-3 text-sm font-medium text-gray-700">
            {successRate}% 성공률
          </span>
        </div>
      </div>

      {/* Global Run Stats + 7-day trend */}
      {globalStats && globalStats.totalRuns > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">전체 실행 현황</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{globalStats.totalRuns}</div>
              <div className="text-xs text-gray-500">누적 실행</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${globalPassRateCls}`}>
                {globalPassRate}%
              </div>
              <div className="text-xs text-gray-500">전체 성공률</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{globalStats.failedRuns}</div>
              <div className="text-xs text-gray-500">누적 실패</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground text-gray-400">
                {globalStats.avgDuration != null
                  ? `${(globalStats.avgDuration / 1000).toFixed(1)}s`
                  : "—"}
              </div>
              <div className="text-xs text-gray-500">평균 소요</div>
            </div>
          </div>
          {globalStats.trend.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 mb-2">일별 실행 현황 (최근 7일)</div>
              <div className="flex items-end gap-1 h-12">
                {globalStats.trend.map((day) => {
                  const total = day.passed + day.failed + day.healed;
                  const dayPassRate = total > 0 ? (day.passed + day.healed) / total : 0;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 rounded-sm"
                      style={{
                        height: `${Math.round((total / maxTrendTotal) * 100)}%`,
                        minHeight: total > 0 ? "4px" : undefined,
                        backgroundColor:
                          dayPassRate >= 0.9
                            ? "#22c55e"
                            : dayPassRate >= 0.7
                            ? "#eab308"
                            : "#ef4444",
                      }}
                      title={`${day.date}: ${day.passed}p ${day.failed}f ${day.healed}h`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Self-Healing Status - PRD 6.2.1 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Self-Healing 현황</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline space-x-6">
            <div>
              <span className="text-3xl font-bold text-yellow-600">
                {healStats?.pending ?? 0}
              </span>
              <span className="ml-1 text-sm text-gray-500">승인 대기</span>
            </div>
            <div>
              <span className="text-xl font-semibold text-green-600">
                {healStats?.autoApproved ?? 0}
              </span>
              <span className="ml-1 text-sm text-gray-500">자동 승인</span>
            </div>
          </div>
          {(healStats?.pending ?? 0) > 0 && (
            <Link
              to="/healing"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              검토하기 →
            </Link>
          )}
        </div>
      </div>

      {/* Recent Failures - PRD 6.2.1 */}
      {recentFailures.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">최근 실패</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {recentFailures.map((run: RecentFailureRun) => (
              <li key={run.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-red-500 mr-3">❌</span>
                  <span className="text-sm font-medium text-gray-900">
                    {run.scenarioName}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(run.createdAt), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </span>
                  <Link
                    to={`/scenarios/${run.scenarioId}/runs/${run.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    상세 →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Flaky Tests Card */}
      {flakyScenarios.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">불안정 테스트</h3>
              <p className="text-xs text-gray-500 mt-0.5">최근 30일 내 성공률 10~90% 시나리오</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {flakyScenarios.length}개
            </span>
          </div>
          <ul className="divide-y divide-gray-200">
            {flakyScenarios.map((s) => {
              const passRatePct = Math.round(s.passRate * 100);
              const barColor =
                s.passRate >= 0.7 ? "#eab308" : "#ef4444";
              return (
                <li key={s.scenarioId} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/scenarios/${s.scenarioId}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block"
                      >
                        {s.scenarioName}
                      </Link>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">
                        {s.serviceName} / {s.featureName}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 max-w-[160px] bg-gray-200 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${passRatePct}%`, backgroundColor: barColor }}
                          />
                        </div>
                        <span className="text-xs font-medium" style={{ color: barColor }}>
                          {passRatePct}% 성공
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-gray-500">{s.runCount}회 실행</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {s.passCount}성공 / {s.failCount}실패
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Services List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">서비스 목록</h3>
          <Link to="/services" className="text-sm text-blue-600 hover:text-blue-800">
            전체 보기 →
          </Link>
        </div>
        {services.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>아직 서비스가 없습니다.</p>
            <Link
              to="/services"
              className="mt-2 inline-block text-blue-600 hover:text-blue-800"
            >
              서비스 추가하기
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {(services as ServiceWithStats[]).map((service) => {
              const statusIcon = service.lastRunStatus ? RUN_STATUS_ICON[service.lastRunStatus] : null;
              const lastRunRel = service.lastRunAt
                ? formatDistanceToNow(new Date(service.lastRunAt), { addSuffix: true, locale: ko })
                : null;
              return (
                <li key={service.id}>
                  <Link
                    to={`/services/${service.id}`}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {service.name}
                        </h4>
                        {statusIcon && (
                          <span
                            className="text-sm flex-shrink-0"
                            title={`최근 실행: ${service.lastRunStatus}${lastRunRel ? ` (${lastRunRel})` : ""}`}
                          >
                            {statusIcon}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-gray-400 font-mono truncate">{service.baseUrl}</p>
                        {(service.featureCount != null || service.scenarioCount != null) && (
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {service.featureCount ?? 0}개 기능 · {service.scenarioCount ?? 0}개 시나리오
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-gray-400 group-hover:text-gray-600 ml-4">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
