import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getComponent,
  createComponent,
  updateComponent,
  deleteComponent,
  getComponentUsages,
} from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";

interface ParameterDef {
  name: string;
  type: "string" | "number" | "boolean" | "enum";
  required: boolean;
  defaultValue?: any;
  options?: string[];
  description?: string;
}

interface StepData {
  id: string;
  type: string;
  description: string;
  config: any;
}

export default function ComponentEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNewComponent = id === "new";

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"flow" | "assertion" | "setup" | "teardown">("flow");
  const [parameters, setParameters] = useState<ParameterDef[]>([]);
  const [steps, setSteps] = useState<StepData[]>([]);

  // UI state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteUsageCount, setDeleteUsageCount] = useState(0);

  // Load component data
  const { data: componentData, isLoading } = useQuery({
    queryKey: ["components", id],
    queryFn: () => getComponent(id!),
    enabled: !isNewComponent,
  });

  // Load usage data for delete confirmation
  const { data: usageData } = useQuery({
    queryKey: ["components", id, "usages"],
    queryFn: () => getComponentUsages(id!),
    enabled: !isNewComponent && showDeleteDialog,
  });

  // Initialize form when component data loads
  useEffect(() => {
    if (componentData?.data) {
      const component = componentData.data;
      setName(component.name || "");
      setDescription(component.description || "");
      setType(component.type || "flow");
      setParameters(component.parameters || []);
      setSteps(component.steps || []);
    }
  }, [componentData]);

  useEffect(() => {
    if (usageData?.data) {
      setDeleteUsageCount(usageData.data.totalUsages || 0);
    }
  }, [usageData]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createComponent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["components"] });
      navigate(`/components/${data.data.id}/edit`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateComponent(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["components"] });
      queryClient.invalidateQueries({ queryKey: ["components", id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteComponent(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["components"] });
      navigate("/components");
    },
  });

  // Handlers
  const handleSave = () => {
    const componentData = {
      name,
      description,
      type,
      parameters,
      steps,
    };

    if (isNewComponent) {
      createMutation.mutate(componentData);
    } else {
      updateMutation.mutate(componentData);
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
  };

  const addParameter = () => {
    setParameters([
      ...parameters,
      {
        name: `param${parameters.length + 1}`,
        type: "string",
        required: true,
        description: "",
      },
    ]);
  };

  const updateParameter = (index: number, field: keyof ParameterDef, value: any) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const addStep = () => {
    const newStep: StepData = {
      id: `step-${Date.now()}`,
      type: "navigate",
      description: "New step",
      config: {},
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  // Loading state
  if (isLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  if (!isNewComponent && !componentData?.success) {
    return <div className="text-center py-12">컴포넌트를 찾을 수 없습니다.</div>;
  }

  const _hasUnsavedChanges =
    (componentData?.data?.name !== name ||
      componentData?.data?.description !== description ||
      componentData?.data?.type !== type) &&
    !isNewComponent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <Link to="/components" className="hover:text-gray-700">
              컴포넌트
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">
              {isNewComponent ? "새 컴포넌트" : name}
            </span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNewComponent ? "새 컴포넌트" : "컴포넌트 편집"}
          </h1>
        </div>
        <div className="flex space-x-3">
          {!isNewComponent && (
            <Button variant="outline" onClick={handleDelete}>
              삭제
            </Button>
          )}
          <Button onClick={handleSave} disabled={!name.trim()}>
            {createMutation.isPending || updateMutation.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      {/* Basic Info Section */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">기본 정보</h2>

        <div className="space-y-2">
          <Label htmlFor="name">이름 *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 관리자 로그인"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">설명</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="컴포넌트에 대한 설명을 입력하세요"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">타입</Label>
          <Select value={type} onValueChange={(value: any) => setType(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flow">Flow</SelectItem>
              <SelectItem value="assertion">Assertion</SelectItem>
              <SelectItem value="setup">Setup</SelectItem>
              <SelectItem value="teardown">Teardown</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            {type === "flow" && "일반적인 플로우 (예: 로그인, 검색)"}
            {type === "assertion" && "검증 전용 컴포넌트"}
            {type === "setup" && "테스트 사전 준비"}
            {type === "teardown" && "테스트 정리"}
          </p>
        </div>
      </div>

      {/* Parameters Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">파라미터</h2>
            <p className="text-sm text-gray-500">
              이 컴포넌트를 사용할 때 전달받을 파라미터를 정의하세요
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addParameter}>
            + 파라미터 추가
          </Button>
        </div>
        <div className="p-6">
          {parameters.length === 0 ? (
            <p className="text-sm text-gray-500">파라미터가 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {parameters.map((param, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>파라미터 이름</Label>
                      <Input
                        value={param.name}
                        onChange={(e) => updateParameter(index, "name", e.target.value)}
                        placeholder="email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>타입</Label>
                      <Select
                        value={param.type}
                        onValueChange={(value) => updateParameter(index, "type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="enum">Enum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label>설명</Label>
                      <Input
                        value={param.description || ""}
                        onChange={(e) =>
                          updateParameter(index, "description", e.target.value)
                        }
                        placeholder="파라미터 설명"
                      />
                    </div>

                    {param.type === "enum" && (
                      <div className="col-span-2 space-y-2">
                        <Label>선택지 (쉼표로 구분)</Label>
                        <Input
                          value={param.options?.join(", ") || ""}
                          onChange={(e) =>
                            updateParameter(
                              index,
                              "options",
                              e.target.value.split(",").map((s) => s.trim())
                            )
                          }
                          placeholder="admin, user, guest"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>기본값</Label>
                      <Input
                        value={param.defaultValue || ""}
                        onChange={(e) =>
                          updateParameter(index, "defaultValue", e.target.value)
                        }
                        placeholder="기본값"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        type="checkbox"
                        id={`required-${index}`}
                        checked={param.required}
                        onChange={(e) =>
                          updateParameter(index, "required", e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor={`required-${index}`} className="font-normal">
                        필수
                      </Label>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeParameter(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    삭제
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Steps Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">스텝</h2>
            <p className="text-sm text-gray-500">
              파라미터를 사용하려면 <code className="text-purple-600">{"{{"}</code>paramName
              <code className="text-purple-600">{"}}"}</code> 형식으로 참조하세요
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addStep}>
            + 스텝 추가
          </Button>
        </div>
        <div className="p-6">
          {steps.length === 0 ? (
            <p className="text-sm text-gray-500">스텝이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {steps.map((step, index) => (
                <li
                  key={step.id}
                  className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
                    {index + 1}
                  </span>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {step.description}
                      </span>
                      <Badge variant="secondary">{step.type}</Badge>
                    </div>
                    {/* Show parameter placeholders in description */}
                    {step.description.match(/\{\{([^}]+)\}\}/g) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {step.description
                          .match(/\{\{([^}]+)\}\}/g)
                          ?.map((match, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded"
                            >
                              {match}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" className="text-gray-400">
                      편집
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      삭제
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Parameter Usage Hint */}
      {parameters.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-purple-900 mb-2">
            사용 가능한 파라미터
          </h3>
          <div className="flex flex-wrap gap-2">
            {parameters.map((param, index) => (
              <code
                key={index}
                className="text-sm px-2 py-1 bg-purple-100 text-purple-700 rounded"
              >
                {"{{"}{param.name}{"}}"}
              </code>
            ))}
          </div>
          <p className="text-sm text-purple-700 mt-2">
            스텝 설정에서 위 형식으로 파라미터를 참조할 수 있습니다.
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>컴포넌트 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 컴포넌트를 삭제하시겠습니까?
              {deleteUsageCount > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  경고: 이 컴포넌트는 현재 {deleteUsageCount}개의 시나리오에서 사용 중입니다.
                  삭제하면 해당 시나리오들이 정상 작동하지 않을 수 있습니다.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {deleteMutation.isPending ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
