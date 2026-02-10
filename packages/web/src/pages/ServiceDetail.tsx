import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getService, getFeatures, api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
      const res = await api.api.services[":serviceId"].features.$post({
        param: { serviceId: id! },
        json: { name, serviceId: id!, owners: [] },
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

  if (!serviceData || !serviceData.success) {
    return <div className="text-center py-12">서비스를 찾을 수 없습니다.</div>;
  }

  const service = serviceData.data;
  const features = featuresData?.success ? featuresData.data : [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link to="/services" className="hover:text-foreground">
          서비스
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{service.name}</span>
      </nav>

      {/* Service Info */}
      <Card>
        <CardHeader>
          <CardTitle>{service.name}</CardTitle>
          {service.description && (
            <CardDescription>{service.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Base URL: <code className="bg-muted px-1 py-0.5 rounded">{service.baseUrl}</code>
          </p>
        </CardContent>
      </Card>

      {/* Features Section */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">기능</h2>
        <Button onClick={() => setIsCreating(true)}>
          + 기능 추가
        </Button>
      </div>

      {/* Create Feature Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 기능</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(featureName);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
                placeholder="예: 로그인"
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

      {/* Features List */}
      <Card>
        {features.length === 0 ? (
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-2">아직 기능이 없습니다.</p>
            <Button variant="link" onClick={() => setIsCreating(true)}>
              첫 기능 추가하기
            </Button>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="divide-y">
              {features.map((feature: any) => (
                <Link
                  key={feature.id}
                  to={`/features/${feature.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <h3 className="font-medium">{feature.name}</h3>
                    {feature.description && (
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    )}
                  </div>
                  <span className="text-muted-foreground">→</span>
                </Link>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
