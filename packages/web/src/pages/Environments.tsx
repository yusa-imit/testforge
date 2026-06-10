import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Globe, Star, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "../hooks/use-toast";
import {
  getEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  type Environment,
  type CreateEnvironmentPayload,
} from "@/lib/api";

interface FormState {
  name: string;
  description: string;
  baseUrl: string;
  variablesText: string;
  isDefault: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  baseUrl: "",
  variablesText: "{}",
  isDefault: false,
};

function envToForm(env: Environment): FormState {
  return {
    name: env.name,
    description: env.description ?? "",
    baseUrl: env.baseUrl ?? "",
    variablesText: JSON.stringify(env.variables, null, 2),
    isDefault: env.isDefault,
  };
}

function parseVariables(text: string): Record<string, any> | null {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export default function Environments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Environment | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [varError, setVarError] = useState(false);

  const { data: environments = [], isLoading } = useQuery({
    queryKey: ["environments"],
    queryFn: getEnvironments,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateEnvironmentPayload) => createEnvironment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      setDialogOpen(false);
      toast({ title: "환경 생성됨" });
    },
    onError: () => toast({ title: "생성 실패", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateEnvironmentPayload> }) =>
      updateEnvironment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      setDialogOpen(false);
      toast({ title: "환경 업데이트됨" });
    },
    onError: () => toast({ title: "업데이트 실패", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEnvironment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      setDeleteConfirm(null);
      toast({ title: "환경 삭제됨" });
    },
    onError: () => toast({ title: "삭제 실패", variant: "destructive" }),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setVarError(false);
    setDialogOpen(true);
  }

  function openEdit(env: Environment) {
    setEditing(env);
    setForm(envToForm(env));
    setVarError(false);
    setDialogOpen(true);
  }

  function handleSubmit() {
    const variables = parseVariables(form.variablesText);
    if (variables === null) {
      setVarError(true);
      return;
    }

    const payload: CreateEnvironmentPayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      baseUrl: form.baseUrl.trim() || undefined,
      variables,
      isDefault: form.isDefault,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">환경 프로필</h1>
          <p className="text-sm text-gray-500 mt-1">
            테스트 환경(Staging, Production 등)을 정의하고 시나리오 실행 시 선택하세요.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          새 환경 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">환경 목록 로딩 중...</div>
      ) : environments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">아직 환경이 없습니다.</p>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              첫 환경 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {environments.map((env) => (
            <Card key={env.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                    <CardTitle className="text-base truncate">{env.name}</CardTitle>
                    {env.isDefault && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        기본
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEdit(env)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => setDeleteConfirm(env.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {env.description && (
                  <p className="text-xs text-gray-500 mt-1">{env.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {env.baseUrl ? (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span className="truncate font-mono text-xs">{env.baseUrl}</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">서비스 기본 URL 사용</p>
                )}
                {Object.keys(env.variables).length > 0 ? (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      변수 {Object.keys(env.variables).length}개
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(env.variables)
                        .slice(0, 4)
                        .map(([k, v]) => (
                          <Badge key={k} variant="outline" className="text-xs font-mono">
                            {k}={String(v).slice(0, 15)}
                          </Badge>
                        ))}
                      {Object.keys(env.variables).length > 4 && (
                        <Badge variant="outline" className="text-xs text-gray-400">
                          +{Object.keys(env.variables).length - 4}개 더
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">변수 없음</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "환경 수정" : "새 환경 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="env-name">이름 *</Label>
              <Input
                id="env-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Staging"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="env-desc">설명</Label>
              <Input
                id="env-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="스테이징 서버 환경"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="env-url">기본 URL 재정의</Label>
              <Input
                id="env-url"
                value={form.baseUrl}
                onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                placeholder="https://staging.example.com (비워두면 서비스 URL 사용)"
              />
              <p className="text-xs text-gray-400">
                설정 시 서비스의 기본 URL을 이 값으로 대체합니다.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="env-vars">
                변수 (JSON)
                {varError && <span className="text-red-500 text-xs ml-2">유효한 JSON 객체를 입력하세요</span>}
              </Label>
              <Textarea
                id="env-vars"
                value={form.variablesText}
                onChange={(e) => {
                  setForm((f) => ({ ...f, variablesText: e.target.value }));
                  setVarError(false);
                }}
                className={`font-mono text-xs min-h-[100px] ${varError ? "border-red-400" : ""}`}
                placeholder='{"API_KEY": "your-key", "TIMEOUT": 5000}'
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="env-default"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="env-default" className="cursor-pointer">
                기본 환경으로 설정
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isBusy || !form.name.trim()}>
              {isBusy ? "저장 중..." : editing ? "수정" : "생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>환경 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            이 환경을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
