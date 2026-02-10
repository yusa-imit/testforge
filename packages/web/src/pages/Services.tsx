import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getServices, api } from "../lib/api";

export default function Services() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    baseUrl: "http://localhost:3000",
    defaultTimeout: 30000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await api.api.services.$post({ json: data });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setIsCreating(false);
      setForm({ name: "", description: "", baseUrl: "http://localhost:3000", defaultTimeout: 30000 });
    },
  });

  const services = data?.data ?? [];

  if (isLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">서비스</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          + 새 서비스
        </button>
      </div>

      {/* Create Form Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-medium text-gray-900 mb-4">새 서비스</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">이름</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">설명</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Base URL</label>
                <input
                  type="url"
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
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

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service: any) => (
          <Link
            key={service.id}
            to={`/services/${service.id}`}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <h3 className="text-lg font-medium text-gray-900">{service.name}</h3>
            {service.description && (
              <p className="mt-1 text-sm text-gray-500">{service.description}</p>
            )}
            <p className="mt-3 text-xs text-gray-400">{service.baseUrl}</p>
          </Link>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">아직 서비스가 없습니다.</p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            첫 서비스 추가하기
          </button>
        </div>
      )}
    </div>
  );
}
