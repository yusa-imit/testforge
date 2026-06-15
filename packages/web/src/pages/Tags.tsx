import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tag, Play, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "../hooks/use-toast";
import { getTags, runScenariosByTag, type TagStat } from "@/lib/api";

export default function Tags() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [runningTag, setRunningTag] = useState<string | null>(null);

  const { data: tags = [], isLoading } = useQuery<TagStat[]>({
    queryKey: ["tags"],
    queryFn: getTags,
  });

  const runByTagMutation = useMutation({
    mutationFn: (tag: string) => runScenariosByTag(tag),
    onMutate: (tag) => setRunningTag(tag),
    onSettled: () => setRunningTag(null),
    onSuccess: (result, tag) => {
      const count = result?.data?.count ?? 0;
      toast({
        title: "태그 실행 시작",
        description:
          count > 0
            ? `"${tag}" 태그 시나리오 ${count}개 실행이 시작되었습니다.`
            : `"${tag}" 태그에 해당하는 시나리오가 없습니다.`,
      });
    },
    onError: (_error, tag) => {
      toast({
        title: "실행 실패",
        description: `"${tag}" 태그 실행 중 오류가 발생했습니다.`,
        variant: "destructive",
      });
    },
  });

  const filtered = tags.filter((t) =>
    t.tag.toLowerCase().includes(search.toLowerCase())
  );

  const totalScenarios = tags.reduce((sum, t) => sum + t.scenarioCount, 0);

  function badgeColor(count: number): string {
    if (count >= 10) return "bg-blue-100 text-blue-800 border-blue-200";
    if (count >= 5) return "bg-green-100 text-green-800 border-green-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="h-6 w-6" />
            태그 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            시나리오에 사용된 모든 태그 목록
          </p>
        </div>
        {tags.length > 0 && (
          <div className="text-sm text-muted-foreground text-right">
            <span className="font-semibold text-gray-900">{tags.length}</span>개 태그
            &nbsp;·&nbsp;
            <span className="font-semibold text-gray-900">{totalScenarios}</span>개 시나리오 (합산)
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="태그 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : tags.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">태그가 없습니다</h3>
            <p className="text-sm text-muted-foreground">
              시나리오를 생성하고 태그를 추가하면 여기에 표시됩니다.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          "{search}"와 일치하는 태그가 없습니다.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.tag} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono">{item.tag}</span>
                  </span>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs font-semibold ${badgeColor(item.scenarioCount)}`}
                  >
                    {item.scenarioCount}개
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={runningTag === item.tag}
                  onClick={() => runByTagMutation.mutate(item.tag)}
                >
                  <Play className="h-3 w-3" />
                  {runningTag === item.tag ? "실행 중..." : "전체 실행"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
