import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getScenario } from "../lib/api";

export default function ScenarioEditor() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["scenario", id],
    queryFn: () => getScenario(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  const scenario = data?.data;

  if (!scenario) {
    return <div className="text-center py-12">시나리오를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <Link to="/services" className="hover:text-gray-700">
              서비스
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{scenario.name}</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">{scenario.name}</h1>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            저장
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
            ▶️ 실행
          </button>
        </div>
      </div>

      {/* Scenario Info */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            우선순위
          </label>
          <select
            value={scenario.priority}
            className="mt-1 block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">태그</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {scenario.tags.map((tag: string) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </span>
            ))}
            <button className="text-sm text-gray-500 hover:text-gray-700">
              + 추가
            </button>
          </div>
        </div>
      </div>

      {/* Variables */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">변수</h2>
        </div>
        <div className="p-6">
          {scenario.variables.length === 0 ? (
            <p className="text-sm text-gray-500">변수가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {scenario.variables.map((v: any) => (
                <div key={v.name} className="flex items-center space-x-4">
                  <span className="font-mono text-sm">{v.name}</span>
                  <span className="text-sm text-gray-500">{v.type}</span>
                  {v.defaultValue && (
                    <span className="text-sm text-gray-400">
                      = {JSON.stringify(v.defaultValue)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <button className="mt-4 text-sm text-blue-600 hover:text-blue-800">
            + 변수 추가
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">스텝</h2>
        </div>
        <div className="p-6">
          {scenario.steps.length === 0 ? (
            <p className="text-sm text-gray-500">스텝이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {scenario.steps.map((step: any, index: number) => (
                <li
                  key={step.id}
                  className="flex items-center p-4 bg-gray-50 rounded-lg"
                >
                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                    {index + 1}
                  </span>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {step.description}
                      </span>
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                        {step.type}
                      </span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">⋮</button>
                </li>
              ))}
            </ul>
          )}
          <button className="mt-4 text-sm text-blue-600 hover:text-blue-800">
            + 스텝 추가
          </button>
        </div>
      </div>
    </div>
  );
}
