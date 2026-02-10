import { useQuery } from "@tanstack/react-query";
import { getRuns } from "../lib/api";

export default function Runs() {
  const { data, isLoading } = useQuery({
    queryKey: ["runs", 50],
    queryFn: () => getRuns(50),
  });

  const runs = data?.data ?? [];

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

  const getStatusColor = (status: string) => {
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

      <div className="bg-white rounded-lg shadow">
        {runs.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>실행 이력이 없습니다.</p>
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
              {runs.map((run: any) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xl">{getStatusIcon(run.status)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {run.scenarioId.slice(0, 8)}...
                    </div>
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
