import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getService, getFeatures, api } from "../lib/api";

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [featureName, setFeatureName] = useState("");

  const { data: serviceData, isLoading: serviceLoading } = useQuery({
    queryKey: ["service", id],
    queryFn: () => getService(id!),
    enabled: !!id,
  });

  const { data: featuresData, isLoading: featuresLoading } = useQuery({
    queryKey: ["features", id],
    queryFn: () => getFeatures(id!),
    enabled: !!id,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.api.features.$post({
        json: { serviceId: id!, name, owners: [] },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features", id] });
      setIsCreating(false);
      setFeatureName("");
    },
  });

  if (serviceLoading || featuresLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  const service = serviceData?.data;
  const features = featuresData?.data ?? [];

  if (!service) {
    return <div className="text-center py-12">서비스를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link to="/services" className="hover:text-gray-700">
          서비스
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{service.name}</span>
      </nav>

      {/* Service Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
        {service.description && (
          <p className="mt-2 text-gray-600">{service.description}</p>
        )}
        <p className="mt-2 text-sm text-gray-500">
          Base URL: {service.baseUrl}
        </p>
      </div>

      {/* Features */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">기능</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          + 기능 추가
        </button>
      </div>

      {/* Create Feature Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-medium text-gray-900 mb-4">새 기능</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(featureName);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  이름
                </label>
                <input
                  type="text"
                  value={featureName}
                  onChange={(e) => setFeatureName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                  placeholder="예: 로그인"
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

      {/* Features List */}
      <div className="bg-white rounded-lg shadow">
        {features.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>아직 기능이 없습니다.</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              첫 기능 추가하기
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {features.map((feature: any) => (
              <li key={feature.id}>
                <Link
                  to={`/features/${feature.id}`}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {feature.name}
                    </h3>
                    {feature.description && (
                      <p className="text-sm text-gray-500">
                        {feature.description}
                      </p>
                    )}
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
