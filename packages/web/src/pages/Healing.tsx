import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getHealingRecords, getHealingStats, api } from "../lib/api";

export default function Healing() {
  const queryClient = useQueryClient();

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ["healing-records"],
    queryFn: getHealingRecords,
  });

  const { data: statsData } = useQuery({
    queryKey: ["healing-stats"],
    queryFn: getHealingStats,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.api.healing[":id"].approve.$post({
        param: { id },
        json: {},
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
        json: {},
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healing-records"] });
      queryClient.invalidateQueries({ queryKey: ["healing-stats"] });
    },
  });

  const records = recordsData?.data ?? [];
  const stats = statsData?.data;

  if (recordsLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Self-Healing</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">
            {stats?.total ?? 0}
          </div>
          <div className="text-sm text-gray-500">전체</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {stats?.pending ?? 0}
          </div>
          <div className="text-sm text-gray-500">대기 중</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">
            {stats?.approved ?? 0}
          </div>
          <div className="text-sm text-gray-500">승인됨</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">
            {stats?.autoApproved ?? 0}
          </div>
          <div className="text-sm text-gray-500">자동 승인</div>
        </div>
      </div>

      {/* Pending Records */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Healing 기록</h2>
        </div>
        {records.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>Self-Healing 기록이 없습니다.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {records.map((record: any) => (
              <li key={record.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">📍</span>
                      <span className="font-medium text-gray-900">
                        {record.locatorDisplayName}
                      </span>
                      <span
                        className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          record.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : record.status === "approved" ||
                              record.status === "auto_approved"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500 space-y-1">
                      <p>
                        변경: {record.originalStrategy.type} →{" "}
                        {record.healedStrategy.type}
                      </p>
                      <p>신뢰도: {(record.confidence * 100).toFixed(0)}%</p>
                      <p className="text-xs text-gray-400">
                        {new Date(record.createdAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </div>
                  {record.status === "pending" && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => approveMutation.mutate(record.id)}
                        disabled={approveMutation.isPending}
                        className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        ✅ 승인
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate(record.id)}
                        disabled={rejectMutation.isPending}
                        className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        ❌ 거부
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
