import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFeature, getScenarios, api } from "../lib/api";

export default function FeatureDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [scenarioName, setScenarioName] = useState("");

  const { data: featureData, isLoading: featureLoading } = useQuery({
    queryKey: ["feature", id],
    queryFn: () => getFeature(id!),
    enabled: !!id,
  });

  const { data: scenariosData, isLoading: scenariosLoading } = useQuery({
    queryKey: ["scenarios", id],
    queryFn: () => getScenarios(id!),
    enabled: !!id,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.api.scenarios.$post({
        json: {
          featureId: id!,
          name,
          tags: [],
          priority: "medium" as const,
          variables: [],
          steps: [],
        },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", id] });
      setIsCreating(false);
      setScenarioName("");
    },
  });

  if (featureLoading || scenariosLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  const feature = featureData?.data;
  const scenarios = scenariosData?.data ?? [];

  if (!feature) {
    return <div className="text-center py-12">기능을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link to="/services" className="hover:text-gray-700">
          서비스
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{feature.name}</span>
      </nav>

      {/* Feature Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">{feature.name}</h1>
        {feature.description && (
          <p className="mt-2 text-gray-600">{feature.description}</p>
        )}
      </div>

      {/* Scenarios */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">시나리오</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          + 시나리오 추가
        </button>
      </div>

      {/* Create Scenario Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              새 시나리오
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(scenarioName);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  이름
                </label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                  placeholder="예: 정상 로그인"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? "생성 중..." : "생성"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scenarios List */}
      <div className="bg-white rounded-lg shadow">
        {scenarios.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>아직 시나리오가 없습니다.</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              첫 시나리오 추가하기
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {scenarios.map((scenario: any) => (
              <li key={scenario.id}>
                <Link
                  to={`/scenarios/${scenario.id}`}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {scenario.name}
                    </h3>
                    <div className="mt-1 flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          scenario.priority === "critical"
                            ? "bg-red-100 text-red-800"
                            : scenario.priority === "high"
                            ? "bg-orange-100 text-orange-800"
                            : scenario.priority === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {scenario.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        {scenario.steps.length} 스텝
                      </span>
                    </div>
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
