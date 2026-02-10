import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFeature, getScenarios, api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
      const res = await api.api.features[":featureId"].scenarios.$post({
        param: { featureId: id! },
        json: {
          name,
          featureId: id!,
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

  if (!featureData || !featureData.success) {
    return <div className="text-center py-12">기능을 찾을 수 없습니다.</div>;
  }

  const feature = featureData.data;
  const scenarios = scenariosData?.success ? scenariosData.data : [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link to="/services" className="hover:text-foreground">
          서비스
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{feature.name}</span>
      </nav>

      {/* Feature Info */}
      <Card>
        <CardHeader>
          <CardTitle>{feature.name}</CardTitle>
          {feature.description && (
            <CardDescription>{feature.description}</CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Scenarios Section */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">시나리오</h2>
        <Button onClick={() => setIsCreating(true)}>
          + 시나리오 추가
        </Button>
      </div>

      {/* Create Scenario Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 시나리오</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(scenarioName);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="예: 정상 로그인"
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

      {/* Scenarios List */}
      <Card>
        {scenarios.length === 0 ? (
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-2">아직 시나리오가 없습니다.</p>
            <Button variant="link" onClick={() => setIsCreating(true)}>
              첫 시나리오 추가하기
            </Button>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="divide-y">
              {scenarios.map((scenario: any) => (
                <Link
                  key={scenario.id}
                  to={`/scenarios/${scenario.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <h3 className="font-medium">{scenario.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge
                        variant={
                          scenario.priority === "critical" ? "destructive" :
                          scenario.priority === "high" ? "default" :
                          "secondary"
                        }
                      >
                        {scenario.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {scenario.steps.length} 스텝
                      </span>
                    </div>
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
