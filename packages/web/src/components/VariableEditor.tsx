import { useState } from "react";
import type { Variable } from "@testforge/core";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card } from "./ui/card";
import { Trash2 } from "lucide-react";

interface VariableEditorProps {
  variables: Variable[];
  onChange: (variables: Variable[]) => void;
}

export function VariableEditor({ variables, onChange }: VariableEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addVariable = () => {
    const newVariable: Variable = {
      name: "",
      type: "string",
      defaultValue: undefined,
      description: undefined,
    };
    onChange([...variables, newVariable]);
    setEditingIndex(variables.length);
  };

  const updateVariable = (index: number, updates: Partial<Variable>) => {
    const newVariables = [...variables];
    newVariables[index] = { ...newVariables[index], ...updates };
    onChange(newVariables);
  };

  const removeVariable = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  return (
    <div className="space-y-3">
      {variables.map((variable, index) => (
        <Card key={index} className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>변수 {index + 1}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeVariable(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`var-name-${index}`}>이름</Label>
                <Input
                  id={`var-name-${index}`}
                  value={variable.name}
                  onChange={(e) => updateVariable(index, { name: e.target.value })}
                  placeholder="userEmail"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`var-type-${index}`}>타입</Label>
                <Select
                  value={variable.type}
                  onValueChange={(value) => updateVariable(index, { type: value as Variable["type"] })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">문자열</SelectItem>
                    <SelectItem value="number">숫자</SelectItem>
                    <SelectItem value="boolean">불린</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor={`var-default-${index}`}>기본값 (선택)</Label>
              {variable.type === "boolean" ? (
                <Select
                  value={variable.defaultValue?.toString() || ""}
                  onValueChange={(value) => updateVariable(index, { defaultValue: value === "true" })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="선택 안 함" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              ) : variable.type === "number" ? (
                <Input
                  id={`var-default-${index}`}
                  type="number"
                  value={variable.defaultValue || ""}
                  onChange={(e) =>
                    updateVariable(index, {
                      defaultValue: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="기본값"
                  className="mt-1"
                />
              ) : variable.type === "json" ? (
                <Input
                  id={`var-default-${index}`}
                  value={
                    typeof variable.defaultValue === "string"
                      ? variable.defaultValue
                      : JSON.stringify(variable.defaultValue || "")
                  }
                  onChange={(e) => {
                    try {
                      updateVariable(index, { defaultValue: JSON.parse(e.target.value) });
                    } catch {
                      updateVariable(index, { defaultValue: e.target.value });
                    }
                  }}
                  placeholder='{"key": "value"}'
                  className="mt-1"
                />
              ) : (
                <Input
                  id={`var-default-${index}`}
                  value={variable.defaultValue || ""}
                  onChange={(e) => updateVariable(index, { defaultValue: e.target.value || undefined })}
                  placeholder="기본값"
                  className="mt-1"
                />
              )}
            </div>

            <div>
              <Label htmlFor={`var-desc-${index}`}>설명 (선택)</Label>
              <Input
                id={`var-desc-${index}`}
                value={variable.description || ""}
                onChange={(e) => updateVariable(index, { description: e.target.value || undefined })}
                placeholder="변수 설명"
                className="mt-1"
              />
            </div>
          </div>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addVariable}
        className="w-full"
      >
        + 변수 추가
      </Button>
    </div>
  );
}
