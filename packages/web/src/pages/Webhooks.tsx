import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Webhook, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "../hooks/use-toast";
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  type Webhook as WebhookType,
  type WebhookEvent,
  type CreateWebhookPayload,
} from "@/lib/api";

const ALL_EVENTS: { value: WebhookEvent; label: string; description: string }[] = [
  { value: "run.completed", label: "run.completed", description: "Any run finishes (pass, fail, or heal)" },
  { value: "run.passed", label: "run.passed", description: "Run completed successfully" },
  { value: "run.failed", label: "run.failed", description: "Run failed" },
  { value: "run.healed", label: "run.healed", description: "Run completed with Self-Healing" },
];

const EVENT_BADGE_COLOR: Record<WebhookEvent, string> = {
  "run.completed": "bg-blue-100 text-blue-700",
  "run.passed": "bg-green-100 text-green-700",
  "run.failed": "bg-red-100 text-red-700",
  "run.healed": "bg-purple-100 text-purple-700",
};

interface FormState {
  name: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
}

const EMPTY_FORM: FormState = { name: "", url: "", secret: "", events: ["run.failed"] };

export default function Webhooks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookType | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: getWebhooks,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateWebhookPayload) => createWebhook(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setDialogOpen(false);
      toast({ title: "Webhook 생성됨" });
    },
    onError: () => toast({ title: "생성 실패", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateWebhookPayload & { enabled: boolean }> }) =>
      updateWebhook(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setDialogOpen(false);
      toast({ title: "Webhook 업데이트됨" });
    },
    onError: () => toast({ title: "업데이트 실패", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setDeleteConfirm(null);
      toast({ title: "Webhook 삭제됨" });
    },
    onError: () => toast({ title: "삭제 실패", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => updateWebhook(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (hook: WebhookType) => {
    setEditing(hook);
    setForm({ name: hook.name, url: hook.url, secret: hook.secret ?? "", events: hook.events });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload: CreateWebhookPayload = {
      name: form.name.trim(),
      url: form.url.trim(),
      events: form.events,
      ...(form.secret.trim() && { secret: form.secret.trim() }),
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleEvent = (event: WebhookEvent) => {
    setForm((f) =>
      f.events.includes(event)
        ? { ...f, events: f.events.filter((e) => e !== event) }
        : { ...f, events: [...f.events, event] }
    );
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const formValid = form.name.trim() && form.url.trim() && form.events.length > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground mt-1">
            테스트 실행 완료 시 외부 서비스에 알림을 전송합니다
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Webhook 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">로딩 중...</div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">등록된 Webhook이 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">
              테스트 실행 결과를 외부 서비스(Slack, CI 등)에 전달하려면 Webhook을 추가하세요
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              첫 Webhook 추가
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((hook) => (
            <Card key={hook.id} className={hook.enabled ? "" : "opacity-60"}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {hook.enabled ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <CardTitle className="text-base">{hook.name}</CardTitle>
                      <CardDescription className="font-mono text-xs mt-0.5">{hook.url}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleMutation.mutate({ id: hook.id, enabled: !hook.enabled })}
                    >
                      {hook.enabled ? "비활성화" : "활성화"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(hook)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(hook.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2 flex-wrap">
                  {hook.events.map((ev) => (
                    <span
                      key={ev}
                      className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${EVENT_BADGE_COLOR[ev]}`}
                    >
                      {ev}
                    </span>
                  ))}
                  {hook.secret && (
                    <Badge variant="outline" className="text-xs">HMAC 서명 활성</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Webhook 편집" : "새 Webhook 추가"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="hookName">이름</Label>
              <Input
                id="hookName"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="예: CI 알림, Slack 채널"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="hookUrl">URL</Label>
              <Input
                id="hookUrl"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://hooks.slack.com/..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="hookSecret">시크릿 (선택 — HMAC-SHA256 서명용)</Label>
              <Input
                id="hookSecret"
                type="password"
                value={form.secret}
                onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                placeholder="최소 8자 이상"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                설정 시 요청 헤더에 <code className="font-mono">X-TestForge-Signature</code> 추가
              </p>
            </div>

            <div>
              <Label>트리거 이벤트</Label>
              <div className="mt-2 space-y-2">
                {ALL_EVENTS.map((ev) => (
                  <label key={ev.value} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.events.includes(ev.value)}
                      onChange={() => toggleEvent(ev.value)}
                      className="mt-0.5 rounded"
                    />
                    <span>
                      <span className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded ${EVENT_BADGE_COLOR[ev.value]}`}>
                        {ev.label}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">{ev.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} disabled={!formValid || isSaving}>
              {isSaving ? "저장 중..." : editing ? "업데이트" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">이 Webhook을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>취소</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
