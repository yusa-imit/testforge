import { useState } from "react";
import type { ElementLocator, LocatorStrategy } from "@testforge/core";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card } from "./ui/card";
import { Trash2 } from "lucide-react";

interface LocatorEditorProps {
  value: ElementLocator;
  onChange: (locator: ElementLocator) => void;
}

export function LocatorEditor({ value, onChange }: LocatorEditorProps) {
  const [displayName, setDisplayName] = useState(value.displayName);
  const [strategies, setStrategies] = useState(value.strategies);
  const [healing, setHealing] = useState(value.healing);

  const handleUpdate = (updates: Partial<ElementLocator>) => {
    onChange({
      ...value,
      ...updates,
    });
  };

  const addStrategy = () => {
    const newStrategy: LocatorStrategy = {
      type: "testId",
      value: "",
      priority: strategies.length + 1,
    };
    const newStrategies = [...strategies, newStrategy];
    setStrategies(newStrategies);
    handleUpdate({ strategies: newStrategies });
  };

  const updateStrategy = (index: number, updates: Partial<LocatorStrategy>) => {
    const newStrategies = [...strategies];
    newStrategies[index] = { ...newStrategies[index], ...updates } as LocatorStrategy;
    setStrategies(newStrategies);
    handleUpdate({ strategies: newStrategies });
  };

  const removeStrategy = (index: number) => {
    const newStrategies = strategies.filter((_, i) => i !== index);
    // Reindex priorities
    newStrategies.forEach((s, i) => {
      s.priority = i + 1;
    });
    setStrategies(newStrategies);
    handleUpdate({ strategies: newStrategies });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="displayName">요소 표시명</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            handleUpdate({ displayName: e.target.value });
          }}
          placeholder='예: "로그인 버튼"'
          className="mt-1"
        />
      </div>

      <div className="space-y-3">
        <Label>전략 (우선순위 순)</Label>
        {strategies.map((strategy, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">전략 {index + 1} {index === 0 && "(우선)"}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStrategy(index)}
                  disabled={strategies.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label>타입</Label>
                <Select
                  value={strategy.type}
                  onValueChange={(type) => {
                    // Reset strategy with new type
                    const baseStrategy = { type, priority: strategy.priority } as any;
                    if (type === "testId" || type === "css" || type === "label" || type === "text") {
                      baseStrategy.value = "";
                      if (type === "text") baseStrategy.exact = true;
                    } else if (type === "role") {
                      baseStrategy.role = "";
                      baseStrategy.name = "";
                    } else if (type === "xpath") {
                      baseStrategy.expression = "";
                    }
                    updateStrategy(index, baseStrategy);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="testId">data-testid</SelectItem>
                    <SelectItem value="role">역할(Role)</SelectItem>
                    <SelectItem value="text">텍스트</SelectItem>
                    <SelectItem value="label">Label</SelectItem>
                    <SelectItem value="css">CSS 선택자</SelectItem>
                    <SelectItem value="xpath">XPath</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {strategy.type === "testId" && (
                <div>
                  <Label>값</Label>
                  <Input
                    value={(strategy as any).value || ""}
                    onChange={(e) => updateStrategy(index, { value: e.target.value } as any)}
                    placeholder="data-testid 값"
                    className="mt-1"
                  />
                </div>
              )}

              {strategy.type === "role" && (
                <>
                  <div>
                    <Label>Role</Label>
                    <Input
                      value={(strategy as any).role || ""}
                      onChange={(e) => updateStrategy(index, { role: e.target.value } as any)}
                      placeholder="button, link, etc."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Name (선택)</Label>
                    <Input
                      value={(strategy as any).name || ""}
                      onChange={(e) => updateStrategy(index, { name: e.target.value } as any)}
                      placeholder="접근 가능한 이름"
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              {strategy.type === "text" && (
                <>
                  <div>
                    <Label>텍스트</Label>
                    <Input
                      value={(strategy as any).value || ""}
                      onChange={(e) => updateStrategy(index, { value: e.target.value } as any)}
                      placeholder="요소 텍스트"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`exact-${index}`}
                      checked={(strategy as any).exact ?? true}
                      onChange={(e) => updateStrategy(index, { exact: e.target.checked } as any)}
                      className="rounded"
                    />
                    <Label htmlFor={`exact-${index}`} className="text-sm">정확히 일치</Label>
                  </div>
                </>
              )}

              {strategy.type === "label" && (
                <div>
                  <Label>Label 텍스트</Label>
                  <Input
                    value={(strategy as any).value || ""}
                    onChange={(e) => updateStrategy(index, { value: e.target.value } as any)}
                    placeholder="label 텍스트"
                    className="mt-1"
                  />
                </div>
              )}

              {strategy.type === "css" && (
                <div>
                  <Label>CSS 선택자</Label>
                  <Input
                    value={(strategy as any).selector || ""}
                    onChange={(e) => updateStrategy(index, { selector: e.target.value } as any)}
                    placeholder=".class, #id, etc."
                    className="mt-1"
                  />
                </div>
              )}

              {strategy.type === "xpath" && (
                <div>
                  <Label>XPath 표현식</Label>
                  <Input
                    value={(strategy as any).expression || ""}
                    onChange={(e) => updateStrategy(index, { expression: e.target.value } as any)}
                    placeholder="//div[@class='example']"
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addStrategy}
          className="w-full"
        >
          + 전략 추가
        </Button>
      </div>

      <div className="space-y-3 border-t pt-4">
        <Label>Self-Healing 설정</Label>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="healing-enabled"
            checked={healing.enabled}
            onChange={(e) => {
              const newHealing = { ...healing, enabled: e.target.checked };
              setHealing(newHealing);
              handleUpdate({ healing: newHealing });
            }}
            className="rounded"
          />
          <Label htmlFor="healing-enabled" className="text-sm">Self-Healing 활성화</Label>
        </div>

        {healing.enabled && (
          <>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="healing-auto"
                checked={healing.autoApprove}
                onChange={(e) => {
                  const newHealing = { ...healing, autoApprove: e.target.checked };
                  setHealing(newHealing);
                  handleUpdate({ healing: newHealing });
                }}
                className="rounded"
              />
              <Label htmlFor="healing-auto" className="text-sm">
                높은 신뢰도 시 자동 승인 (임계값: {healing.confidenceThreshold})
              </Label>
            </div>

            {healing.autoApprove && (
              <div>
                <Label>신뢰도 임계값</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={healing.confidenceThreshold}
                  onChange={(e) => {
                    const newHealing = {
                      ...healing,
                      confidenceThreshold: parseFloat(e.target.value),
                    };
                    setHealing(newHealing);
                    handleUpdate({ healing: newHealing });
                  }}
                  className="mt-1"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
