import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getComponents } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function Components() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["components"],
    queryFn: getComponents,
  });

  const components = useMemo(() => data?.data ?? [], [data]);

  const filteredComponents = useMemo(() => {
    if (!searchQuery.trim()) return components;
    const q = searchQuery.toLowerCase();
    return components.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.type?.toLowerCase().includes(q)
    );
  }, [components, searchQuery]);

  if (isLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">컴포넌트</h1>
        <Link to="/components/new">
          <Button>+ 새 컴포넌트</Button>
        </Link>
      </div>

      {/* Search */}
      {components.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              placeholder="컴포넌트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <span className="text-sm text-muted-foreground">
              {filteredComponents.length}/{components.length}개
            </span>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {components.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>아직 컴포넌트가 없습니다.</p>
            <p className="mt-2 text-sm">
              컴포넌트를 만들어 공통 플로우를 재사용하세요.
            </p>
          </div>
        ) : filteredComponents.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>"{searchQuery}"에 대한 검색 결과가 없습니다.</p>
            <Button variant="link" onClick={() => setSearchQuery("")}>
              검색 초기화
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredComponents.map((component) => (
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
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                          {component.type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {component.steps.length} 스텝
                        </span>
                      </div>
                    </div>
                    <span className="text-gray-400">편집 →</span>
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
