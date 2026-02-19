import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getComponents } from "../lib/api";

export default function Components() {
  const { data, isLoading } = useQuery({
    queryKey: ["components"],
    queryFn: getComponents,
  });

  const components = data?.data ?? [];

  if (isLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">컴포넌트</h1>
        <Link to="/components/new">
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            + 새 컴포넌트
          </button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        {components.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>아직 컴포넌트가 없습니다.</p>
            <p className="mt-2 text-sm">
              컴포넌트를 만들어 공통 플로우를 재사용하세요.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {components.map((component) => (
              <li key={component.id} className="px-6 py-4 hover:bg-gray-50">
                <Link to={`/components/${component.id}/edit`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {component.name}
                      </h3>
                      {component.description && (
                        <p className="text-sm text-gray-500">
                          {component.description}
                        </p>
                      )}
                      <div className="mt-1 flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {component.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {component.steps.length} 스텝
                        </span>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      편집 →
                    </button>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
