import { useState, useEffect } from "react";
import type { Step, StepType, ElementLocator } from "@testforge/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { LocatorEditor } from "./LocatorEditor";
import { v4 as uuidv4 } from "uuid";

interface StepEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: Step | null;
  onSave: (step: Step) => void;
}

const STEP_TYPE_LABELS: Record<StepType, string> = {
  navigate: "페이지 이동",
  click: "클릭",
  fill: "입력",
  select: "선택",
  hover: "호버",
  wait: "대기",
  assert: "검증",
  screenshot: "스크린샷",
  "api-request": "API 요청",
  "api-assert": "API 검증",
  component: "컴포넌트",
  script: "스크립트",
};

const DEFAULT_LOCATOR: ElementLocator = {
  displayName: "",
  strategies: [
    { type: "testId", value: "", priority: 1 },
  ],
  healing: {
    enabled: true,
    autoApprove: false,
    confidenceThreshold: 0.9,
  },
};

export function StepEditModal({ open, onOpenChange, step, onSave }: StepEditModalProps) {
  const [stepType, setStepType] = useState<StepType>(step?.type || "click");
  const [description, setDescription] = useState(step?.description || "");
  const [timeout, setTimeout] = useState<number | undefined>(step?.timeout);
  const [continueOnError, setContinueOnError] = useState(step?.continueOnError || false);
  const [config, setConfig] = useState<any>(step?.config || {}); // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(() => {
    if (step) {
      setStepType(step.type);
      setDescription(step.description);
      setTimeout(step.timeout);
      setContinueOnError(step.continueOnError);
      setConfig(step.config);
    } else {
      // Reset for new step
      setStepType("click");
      setDescription("");
      setTimeout(undefined);
      setContinueOnError(false);
      setConfig({});
    }
  }, [step, open]);

  const handleStepTypeChange = (newType: StepType) => {
    setStepType(newType);
    // Initialize config based on type
    const newConfig: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (["click", "fill", "select", "hover"].includes(newType)) {
      newConfig.locator = DEFAULT_LOCATOR;
      if (newType === "fill") {
        newConfig.value = "";
        newConfig.clearBefore = true;
      }
      if (newType === "select") {
        newConfig.value = "";
      }
    } else if (newType === "navigate") {
      newConfig.url = "";
    } else if (newType === "wait") {
      newConfig.type = "time";
      newConfig.timeout = 1000;
    } else if (newType === "assert") {
      newConfig.type = "visible";
      newConfig.locator = DEFAULT_LOCATOR;
    } else if (newType === "screenshot") {
      newConfig.fullPage = false;
    } else if (newType === "api-request") {
      newConfig.method = "GET";
      newConfig.url = "";
    } else if (newType === "api-assert") {
      newConfig.type = "status";
      newConfig.operator = "equals";
    } else if (newType === "component") {
      newConfig.componentId = "";
      newConfig.parameters = {};
    } else if (newType === "script") {
      newConfig.code = "";
    }

    setConfig(newConfig);
  };

  const handleSave = () => {
    const savedStep: Step = {
      id: step?.id || uuidv4(),
      type: stepType,
      description,
      timeout,
      continueOnError,
      config,
    };
    onSave(savedStep);
    onOpenChange(false);
  };

  const renderConfigEditor = () => {
    switch (stepType) {
      case "navigate":
        return (
          <div>
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={config.url || ""}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="/admin/dashboard 또는 https://example.com"
              className="mt-1"
            />
          </div>
        );

      case "click":
        return (
          <div className="space-y-4">
            <LocatorEditor
              value={config.locator || DEFAULT_LOCATOR}
              onChange={(locator) => setConfig({ ...config, locator })}
            />
          </div>
        );

      case "fill":
        return (
          <div className="space-y-4">
            <LocatorEditor
              value={config.locator || DEFAULT_LOCATOR}
              onChange={(locator) => setConfig({ ...config, locator })}
            />
            <div>
              <Label htmlFor="fillValue">입력 값</Label>
              <Input
                id="fillValue"
                value={config.value || ""}
                onChange={(e) => setConfig({ ...config, value: e.target.value })}
                placeholder='예: "test@example.com" 또는 {{"{{"}}email{{"}}"}}'
                className="mt-1"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="clearBefore"
                checked={config.clearBefore ?? true}
                onChange={(e) => setConfig({ ...config, clearBefore: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="clearBefore" className="text-sm">기존 값 지우고 입력</Label>
            </div>
          </div>
        );

      case "select":
        return (
          <div className="space-y-4">
            <LocatorEditor
              value={config.locator || DEFAULT_LOCATOR}
              onChange={(locator) => setConfig({ ...config, locator })}
            />
            <div>
              <Label htmlFor="selectValue">선택할 값</Label>
              <Input
                id="selectValue"
                value={config.value || ""}
                onChange={(e) => setConfig({ ...config, value: e.target.value })}
                placeholder="option value 또는 텍스트"
                className="mt-1"
              />
            </div>
          </div>
        );

      case "hover":
        return (
          <LocatorEditor
            value={config.locator || DEFAULT_LOCATOR}
            onChange={(locator) => setConfig({ ...config, locator })}
          />
        );

      case "wait":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="waitType">대기 타입</Label>
              <Select
                value={config.type || "time"}
                onValueChange={(value) => setConfig({ ...config, type: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">시간</SelectItem>
                  <SelectItem value="element">요소</SelectItem>
                  <SelectItem value="navigation">네비게이션</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.type === "time" && (
              <div>
                <Label htmlFor="waitTimeout">대기 시간 (ms)</Label>
                <Input
                  id="waitTimeout"
                  type="number"
                  value={config.timeout || 1000}
                  onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
            )}

            {config.type === "element" && (
              <LocatorEditor
                value={config.locator || DEFAULT_LOCATOR}
                onChange={(locator) => setConfig({ ...config, locator })}
              />
            )}
          </div>
        );

      case "assert":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="assertType">검증 타입</Label>
              <Select
                value={config.type || "visible"}
                onValueChange={(value) => setConfig({ ...config, type: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visible">표시됨</SelectItem>
                  <SelectItem value="hidden">숨겨짐</SelectItem>
                  <SelectItem value="text">텍스트</SelectItem>
                  <SelectItem value="value">값</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="title">페이지 제목</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {["visible", "hidden", "text", "value"].includes(config.type) && (
              <LocatorEditor
                value={config.locator || DEFAULT_LOCATOR}
                onChange={(locator) => setConfig({ ...config, locator })}
              />
            )}

            {["text", "value", "url", "title"].includes(config.type) && (
              <div>
                <Label htmlFor="expected">예상 값</Label>
                <Input
                  id="expected"
                  value={config.expected || ""}
                  onChange={(e) => setConfig({ ...config, expected: e.target.value })}
                  placeholder="예상되는 값"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        );

      case "screenshot":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="screenshotName">파일명 (선택)</Label>
              <Input
                id="screenshotName"
                value={config.name || ""}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="screenshot.png"
                className="mt-1"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="fullPage"
                checked={config.fullPage ?? false}
                onChange={(e) => setConfig({ ...config, fullPage: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="fullPage" className="text-sm">전체 페이지 캡처</Label>
            </div>
          </div>
        );

      case "api-request":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiMethod">HTTP 메서드</Label>
              <Select
                value={config.method || "GET"}
                onValueChange={(value) => setConfig({ ...config, method: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="apiUrl">URL</Label>
              <Input
                id="apiUrl"
                value={config.url || ""}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                placeholder="/api/users"
                className="mt-1"
              />
            </div>

            {["POST", "PUT", "PATCH"].includes(config.method) && (
              <div>
                <Label htmlFor="apiBody">Body (JSON)</Label>
                <Textarea
                  id="apiBody"
                  value={typeof config.body === "string" ? config.body : JSON.stringify(config.body || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      setConfig({ ...config, body: JSON.parse(e.target.value) });
                    } catch {
                      setConfig({ ...config, body: e.target.value });
                    }
                  }}
                  placeholder='{"key": "value"}'
                  className="mt-1 font-mono"
                  rows={5}
                />
              </div>
            )}

            <div>
              <Label htmlFor="saveResponseAs">응답 저장 (선택)</Label>
              <Input
                id="saveResponseAs"
                value={config.saveResponseAs || ""}
                onChange={(e) => setConfig({ ...config, saveResponseAs: e.target.value })}
                placeholder='예: "response" (나중에 {{"{{"}}response{{"}}"}} 로 참조)'
                className="mt-1"
              />
            </div>
          </div>
        );

      case "api-assert":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiAssertType">검증 타입</Label>
              <Select
                value={config.type || "status"}
                onValueChange={(value) => setConfig({ ...config, type: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">상태 코드</SelectItem>
                  <SelectItem value="body">응답 본문</SelectItem>
                  <SelectItem value="header">헤더</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.type === "status" && (
              <div>
                <Label htmlFor="statusCode">상태 코드</Label>
                <Input
                  id="statusCode"
                  type="number"
                  value={config.status || 200}
                  onChange={(e) => setConfig({ ...config, status: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
            )}

            {config.type === "body" && (
              <>
                <div>
                  <Label htmlFor="jsonPath">JSON 경로</Label>
                  <Input
                    id="jsonPath"
                    value={config.path || ""}
                    onChange={(e) => setConfig({ ...config, path: e.target.value })}
                    placeholder="data.user.name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="expectedValue">예상 값</Label>
                  <Input
                    id="expectedValue"
                    value={config.expected || ""}
                    onChange={(e) => setConfig({ ...config, expected: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {config.type === "header" && (
              <>
                <div>
                  <Label htmlFor="headerName">헤더 이름</Label>
                  <Input
                    id="headerName"
                    value={config.headerName || ""}
                    onChange={(e) => setConfig({ ...config, headerName: e.target.value })}
                    placeholder="Content-Type"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="headerValue">예상 값</Label>
                  <Input
                    id="headerValue"
                    value={config.expected || ""}
                    onChange={(e) => setConfig({ ...config, expected: e.target.value })}
                    placeholder="application/json"
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>
        );

      case "component":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="componentId">컴포넌트 ID</Label>
              <Input
                id="componentId"
                value={config.componentId || ""}
                onChange={(e) => setConfig({ ...config, componentId: e.target.value })}
                placeholder="컴포넌트 UUID"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="parameters">파라미터 (JSON)</Label>
              <Textarea
                id="parameters"
                value={JSON.stringify(config.parameters || {}, null, 2)}
                onChange={(e) => {
                  try {
                    setConfig({ ...config, parameters: JSON.parse(e.target.value) });
                  } catch {
                    // Keep as is
                  }
                }}
                className="mt-1 font-mono"
                rows={4}
              />
            </div>
          </div>
        );

      case "script":
        return (
          <div>
            <Label htmlFor="scriptCode">JavaScript 코드</Label>
            <Textarea
              id="scriptCode"
              value={config.code || ""}
              onChange={(e) => setConfig({ ...config, code: e.target.value })}
              placeholder="console.log('Hello');"
              className="mt-1 font-mono"
              rows={10}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step ? "스텝 편집" : "새 스텝 추가"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="stepType">스텝 타입</Label>
            <Select value={stepType} onValueChange={(value) => handleStepTypeChange(value as StepType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STEP_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">설명</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='예: "로그인 버튼 클릭"'
              className="mt-1"
            />
          </div>

          <Separator />

          {renderConfigEditor()}

          <Separator />

          <div className="space-y-3">
            <Label>고급 설정</Label>
            <div>
              <Label htmlFor="stepTimeout">타임아웃 (ms, 선택)</Label>
              <Input
                id="stepTimeout"
                type="number"
                value={timeout || ""}
                onChange={(e) => setTimeout(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="기본값 사용"
                className="mt-1"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="continueOnError"
                checked={continueOnError}
                onChange={(e) => setContinueOnError(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="continueOnError" className="text-sm">실패해도 계속 진행</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={!description}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
