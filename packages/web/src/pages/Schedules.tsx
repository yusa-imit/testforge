import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Clock, CheckCircle, XCircle, Play, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "../hooks/use-toast";
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  triggerSchedule,
  getAllScenarios,
  SCHEDULE_INTERVALS,
  type Schedule,
  type CreateSchedulePayload,
} from "@/lib/api";

interface FormState {
  name: string;
  scenarioId: string;
  intervalMinutes: number;
}

const EMPTY_FORM: FormState = { name: "", scenarioId: "", intervalMinutes: 60 };

function intervalLabel(minutes: number): string {
  return SCHEDULE_INTERVALS.find((i) => i.value === minutes)?.label ?? `${minutes}분마다`;
}

export default function Schedules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: getSchedules,
    refetchInterval: 30_000,
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: ["scenarios-all"],
    queryFn: getAllScenarios,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateSchedulePayload) => createSchedule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setDialogOpen(false);
      toast({ title: "스케줄 생성됨" });
    },
    onError: () => toast({ title: "생성 실패", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateSchedulePayload & { enabled: boolean }> }) =>
      updateSchedule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setDialogOpen(false);
      toast({ title: "스케줄 업데이트됨" });
    },
    onError: () => toast({ title: "업데이트 실패", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setDeleteConfirm(null);
      toast({ title: "스케줄 삭제됨" });
    },
    onError: () => toast({ title: "삭제 실패", variant: "destructive" }),
  });

  const triggerMutation = useMutation({
    mutationFn: (id: string) => triggerSchedule(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast({ title: "실행 시작됨", description: `Run ID: ${data.runId.slice(0, 8)}...` });
    },
    onError: () => toast({ title: "실행 실패", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => updateSchedule(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (s: Schedule) => {
    setEditing(s);
    setForm({ name: s.name, scenarioId: s.scenarioId, intervalMinutes: s.intervalMinutes });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload: CreateSchedulePayload = {
      name: form.name.trim(),
      scenarioId: form.scenarioId,
      intervalMinutes: form.intervalMinutes,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const formValid = form.name.trim() && form.scenarioId && form.intervalMinutes > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">스케줄</h1>
          <p className="text-muted-foreground mt-1">
            시나리오를 주기적으로 자동 실행하도록 설정합니다
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          스케줄 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">로딩 중...</div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">등록된 스케줄이 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">
              시나리오를 정기적으로 자동 실행하려면 스케줄을 추가하세요
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              첫 스케줄 추가
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <Card key={s.id} className={s.enabled ? "" : "opacity-60"}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {s.enabled ? (
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400 shrink-0" />
                    )}
                    <div>
                      <CardTitle className="text-base">{s.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {s.scenarioName ?? s.scenarioId}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerMutation.mutate(s.id)}
                      disabled={triggerMutation.isPending}
                      title="지금 실행"
                    >
                      <Play className="h-3.5 w-3.5 mr-1" />
                      지금 실행
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleMutation.mutate({ id: s.id, enabled: !s.enabled })}
                    >
                      {s.enabled ? "비활성화" : "활성화"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(s.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <RefreshCw className="h-3.5 w-3.5" />
                    <Badge variant="outline" className="text-xs font-normal">
                      {intervalLabel(s.intervalMinutes)}
                    </Badge>
                  </div>
                  {s.lastRunAt && (
                    <span>
                      마지막 실행:{" "}
                      {formatDistanceToNow(new Date(s.lastRunAt), { addSuffix: true, locale: ko })}
                    </span>
                  )}
                  {s.nextRunAt && s.enabled && (
                    <span>
                      다음 실행:{" "}
                      {formatDistanceToNow(new Date(s.nextRunAt), { addSuffix: true, locale: ko })}
                    </span>
                  )}
                  {!s.lastRunAt && <span className="italic">아직 실행된 적 없음</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "스케줄 편집" : "새 스케줄 추가"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="scheduleName">이름</Label>
              <Input
                id="scheduleName"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="예: 야간 회귀 테스트"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="scheduleScenario">시나리오</Label>
              <Select
                value={form.scenarioId}
                onValueChange={(v) => setForm((f) => ({ ...f, scenarioId: v }))}
              >
                <SelectTrigger id="scheduleScenario" className="mt-1">
                  <SelectValue placeholder="시나리오 선택..." />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>
                      {sc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="scheduleInterval">실행 주기</Label>
              <Select
                value={String(form.intervalMinutes)}
                onValueChange={(v) => setForm((f) => ({ ...f, intervalMinutes: Number(v) }))}
              >
                <SelectTrigger id="scheduleInterval" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_INTERVALS.map((interval) => (
                    <SelectItem key={interval.value} value={String(interval.value)}>
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DialogTitle>스케줄 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">이 스케줄을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
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
