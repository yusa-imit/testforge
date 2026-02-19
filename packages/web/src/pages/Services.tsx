import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getServices, api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Services() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  const services = useMemo(() => data?.data ?? [], [data]);

  // Filter services based on search query
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const query = searchQuery.toLowerCase();
    return services.filter((service) =>
      service.name.toLowerCase().includes(query) ||
      service.description?.toLowerCase().includes(query) ||
      service.baseUrl?.toLowerCase().includes(query)
    );
  }, [services, searchQuery]);

  if (isLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">서비스</h1>
        <Button onClick={() => setIsCreating(true)}>
          + 새 서비스
        </Button>
      </div>

      {/* Search Input */}
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
            placeholder="서비스 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchQuery && (
          <span className="text-sm text-muted-foreground">
            {filteredServices.length}개 결과
          </span>
        )}
      </div>

      {/* Create Form Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 서비스</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(form);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="예: 채용 서비스"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="서비스에 대한 간단한 설명"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                type="url"
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="http://localhost:3000"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreating(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "생성 중..." : "생성"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Services Grid */}
      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-2">아직 서비스가 없습니다.</p>
            <Button variant="link" onClick={() => setIsCreating(true)}>
              첫 서비스 추가하기
            </Button>
          </CardContent>
        </Card>
      ) : filteredServices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-2">
              "{searchQuery}"에 대한 검색 결과가 없습니다.
            </p>
            <Button variant="link" onClick={() => setSearchQuery("")}>
              검색 초기화
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Link key={service.id} to={`/services/${service.id}`}>
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <CardTitle>{service.name}</CardTitle>
                  {service.description && (
                    <CardDescription>{service.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    <code className="bg-muted px-1 py-0.5 rounded">{service.baseUrl}</code>
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
