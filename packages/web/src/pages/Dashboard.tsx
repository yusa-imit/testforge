import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { getServices, getHealingStats, getDashboardData } from "../lib/api";

interface RecentFailureRun {
  id: string;
  scenarioId: string;
  scenarioName: string;
  createdAt: string;
}

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

  const services = servicesData?.data ?? [];
  const healStats = healingStats?.data;
  const stats = dashboardData?.data?.stats ?? { total: 0, passed: 0, failed: 0, healed: 0 };
  const recentFailures = dashboardData?.data?.recentFailures ?? [];

  const successRate = stats.total > 0
    ? ((stats.passed / stats.total) * 100).toFixed(1)
    : "0.0";

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
                    to={`/runs/${run.id}`}
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

      {/* Services List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">서비스 목록</h3>
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
            {services.map((service) => (
              <li key={service.id}>
                <Link
                  to={`/services/${service.id}`}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {service.name}
                    </h4>
                    <p className="text-sm text-gray-500">{service.baseUrl}</p>
                  </div>
                  <span className="text-gray-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
