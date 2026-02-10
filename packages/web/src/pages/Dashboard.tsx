import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getServices, getHealingStats, getRuns } from "../lib/api";

export default function Dashboard() {
  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });

  const { data: healingStats } = useQuery({
    queryKey: ["healing-stats"],
    queryFn: getHealingStats,
  });

  const { data: runsData } = useQuery({
    queryKey: ["runs", 10],
    queryFn: () => getRuns(10),
  });

  const services = servicesData?.data ?? [];
  const stats = healingStats?.data;
  const runs = runsData?.data ?? [];

  const recentFailures = runs.filter((r: any) => r.status === "failed");
  const successRate = runs.length > 0
    ? ((runs.filter((r: any) => r.status === "passed").length / runs.length) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <Link
          to="/services"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          + 새 서비스
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">최근 24시간</h3>
          <div className="mt-2">
            <span className="text-3xl font-bold text-gray-900">{runs.length}</span>
            <span className="ml-2 text-sm text-gray-500">실행</span>
          </div>
          <div className="mt-4 flex items-center">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${successRate}%` }}
              />
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              {successRate}% 성공
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Self-Healing</h3>
          <div className="mt-2 flex items-baseline space-x-4">
            <div>
              <span className="text-3xl font-bold text-yellow-600">
                {stats?.pending ?? 0}
              </span>
              <span className="ml-1 text-sm text-gray-500">대기 중</span>
            </div>
            <div>
              <span className="text-xl font-semibold text-green-600">
                {stats?.autoApproved ?? 0}
              </span>
              <span className="ml-1 text-sm text-gray-500">자동 승인</span>
            </div>
          </div>
          {(stats?.pending ?? 0) > 0 && (
            <Link
              to="/healing"
              className="mt-4 inline-flex text-sm text-blue-600 hover:text-blue-800"
            >
              검토하기 →
            </Link>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">서비스</h3>
          <div className="mt-2">
            <span className="text-3xl font-bold text-gray-900">
              {services.length}
            </span>
            <span className="ml-2 text-sm text-gray-500">개</span>
          </div>
        </div>
      </div>

      {/* Recent Failures */}
      {recentFailures.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">최근 실패</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {recentFailures.slice(0, 5).map((run: any) => (
              <li key={run.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-red-500 mr-3">❌</span>
                  <span className="text-sm text-gray-900">
                    시나리오 {run.scenarioId.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    {new Date(run.createdAt).toLocaleString("ko-KR")}
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
            {services.map((service: any) => (
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
