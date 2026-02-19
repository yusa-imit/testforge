import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Search, ChevronDown, FileText, History, Link as LinkIcon, ExternalLink } from "lucide-react";
import { getRegistryElements, getServices, deleteRegistryElement } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Separator } from "../components/ui/separator";
import { cn } from "../lib/utils";
import { Link } from "react-router-dom";

interface LocatorStrategy {
  type: string;
  value?: string;
  role?: string;
  name?: string;
  exact?: boolean;
  selector?: string;
  expression?: string;
  priority: number;
}

interface ElementLocator {
  displayName: string;
  strategies: LocatorStrategy[];
  healing?: {
    enabled: boolean;
    autoApprove: boolean;
    confidenceThreshold: number;
  };
}

interface HistoryEntry {
  locator: ElementLocator;
  changedAt: string;
  reason?: string;
}

interface UsageEntry {
  scenarioId: string;
  stepId: string;
  addedAt?: string;
}

interface RegistryElement {
  id: string;
  service_id: string;
  display_name: string;
  page_pattern?: string;
  currentLocator: ElementLocator;
  history: HistoryEntry[];
  usedIn: UsageEntry[];
  created_at: string;
  updated_at: string;
}

export default function ElementRegistry() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });

  const { data: elementsData, isLoading } = useQuery({
    queryKey: ["registry-elements", serviceFilter !== "all" ? serviceFilter : undefined, searchQuery],
    queryFn: () => getRegistryElements(
      serviceFilter !== "all" ? serviceFilter : undefined,
      searchQuery || undefined
    ),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRegistryElement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry-elements"] });
    },
  });

  const services = servicesData?.data ?? [];
  const elements: RegistryElement[] = elementsData?.data ?? [];

  // Calculate stats
  const totalElements = elements.length;
  const elementsWithHealing = elements.filter(el => el.history.length > 0).length;
  const totalUsages = elements.reduce((sum, el) => sum + el.usedIn.length, 0);

  const getStrategyBadge = (strategy: LocatorStrategy) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      testId: { label: "Test ID", color: "bg-blue-100 text-blue-700" },
      role: { label: "Role", color: "bg-green-100 text-green-700" },
      text: { label: "Text", color: "bg-purple-100 text-purple-700" },
      label: { label: "Label", color: "bg-pink-100 text-pink-700" },
      css: { label: "CSS", color: "bg-orange-100 text-orange-700" },
      xpath: { label: "XPath", color: "bg-red-100 text-red-700" },
    };

    const config = typeMap[strategy.type] || { label: strategy.type, color: "bg-gray-100 text-gray-700" };
    return (
      <Badge variant="outline" className={cn("text-xs", config.color)}>
        {config.label}
      </Badge>
    );
  };

  const getStrategyValue = (strategy: LocatorStrategy) => {
    switch (strategy.type) {
      case "testId":
        return strategy.value;
      case "role":
        return strategy.role + (strategy.name ? ` "${strategy.name}"` : "");
      case "text":
        return `"${strategy.value}"${strategy.exact ? " (exact)" : ""}`;
      case "label":
        return `"${strategy.value}"`;
      case "css":
        return strategy.selector;
      case "xpath":
        return strategy.expression;
      default:
        return JSON.stringify(strategy);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Element Registry</h1>
          <p className="text-gray-600 mt-1">요소 변경 이력 및 사용처 추적</p>
        </div>
        <Button>
          <FileText className="w-4 h-4 mr-2" />
          새 요소 등록
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 요소</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalElements}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">변경 이력 있음</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{elementsWithHealing}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <History className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 사용처</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalUsages}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <LinkIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-48">
                {serviceFilter === "all"
                  ? "전체 서비스"
                  : services.find((s) => s.id === serviceFilter)?.name || "서비스 선택"}
                <ChevronDown className="w-4 h-4 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuItem onClick={() => setServiceFilter("all")}>
                전체 서비스
              </DropdownMenuItem>
              <Separator className="my-1" />
              {services.map((service) => (
                <DropdownMenuItem
                  key={service.id}
                  onClick={() => setServiceFilter(service.id)}
                >
                  {service.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="요소 이름 또는 페이지 패턴으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Elements List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            로딩 중...
          </div>
        ) : elements.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            등록된 요소가 없습니다
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {elements.map((element) => {
              const service = services.find((s) => s.id === element.service_id);
              const primaryStrategy = element.currentLocator.strategies[0];

              return (
                <AccordionItem
                  key={element.id}
                  value={element.id}
                  className="bg-white rounded-lg border border-gray-200 px-6 data-[state=open]:border-blue-200"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center justify-between w-full text-left pr-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {element.display_name}
                          </h3>
                          {primaryStrategy && getStrategyBadge(primaryStrategy)}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>서비스: {service?.name || "Unknown"}</span>
                          {element.page_pattern && (
                            <>
                              <span>•</span>
                              <span>페이지: {element.page_pattern}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>사용처: {element.usedIn.length}개</span>
                          {element.history.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-orange-600">
                                변경 이력: {element.history.length}회
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(element.updated_at), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="pb-6 space-y-6">
                    <Separator />

                    {/* Current Locator Strategies */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        현재 로케이터 전략
                      </h4>
                      <div className="space-y-2">
                        {element.currentLocator.strategies
                          .sort((a, b) => a.priority - b.priority)
                          .map((strategy, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-md"
                            >
                              <span className="text-xs text-gray-500 font-medium w-8">
                                #{strategy.priority}
                              </span>
                              {getStrategyBadge(strategy)}
                              <code className="text-sm text-gray-700 flex-1">
                                {getStrategyValue(strategy)}
                              </code>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Healing Settings */}
                    {element.currentLocator.healing && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          Self-Healing 설정
                        </h4>
                        <div className="p-3 bg-gray-50 rounded-md space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">활성화:</span>
                            <Badge variant={element.currentLocator.healing.enabled ? "default" : "secondary"}>
                              {element.currentLocator.healing.enabled ? "예" : "아니오"}
                            </Badge>
                          </div>
                          {element.currentLocator.healing.enabled && (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">자동 승인:</span>
                                <Badge variant={element.currentLocator.healing.autoApprove ? "default" : "secondary"}>
                                  {element.currentLocator.healing.autoApprove ? "예" : "아니오"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">신뢰도 임계값:</span>
                                <span className="font-medium">
                                  {(element.currentLocator.healing.confidenceThreshold * 100).toFixed(0)}%
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* History */}
                    {element.history.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          변경 이력 ({element.history.length})
                        </h4>
                        <div className="space-y-3">
                          {element.history.map((historyItem, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-orange-50 rounded-md border border-orange-200"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-orange-700 font-medium">
                                  {formatDistanceToNow(new Date(historyItem.changedAt), {
                                    addSuffix: true,
                                    locale: ko,
                                  })}
                                </span>
                                {historyItem.reason && (
                                  <span className="text-xs text-gray-600">
                                    {historyItem.reason}
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1">
                                {historyItem.locator.strategies
                                  .sort((a, b) => a.priority - b.priority)
                                  .slice(0, 2)
                                  .map((strategy, sidx) => (
                                    <div key={sidx} className="flex items-center gap-2 text-xs">
                                      {getStrategyBadge(strategy)}
                                      <code className="text-gray-700">
                                        {getStrategyValue(strategy)}
                                      </code>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Usage (Scenarios using this element) */}
                    {element.usedIn.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          사용처 ({element.usedIn.length})
                        </h4>
                        <div className="space-y-2">
                          {element.usedIn.map((usage, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-blue-50 rounded-md border border-blue-200"
                            >
                              <div className="flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-gray-700">
                                  Scenario: {usage.scenarioId.slice(0, 8)}...
                                </span>
                                <span className="text-xs text-gray-500">
                                  Step: {usage.stepId.slice(0, 8)}...
                                </span>
                              </div>
                              <Link
                                to={`/scenarios/${usage.scenarioId}`}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t">
                      <Button variant="outline" size="sm">
                        수정
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`"${element.display_name}" 요소를 삭제하시겠습니까?`)) {
                            deleteMutation.mutate(element.id);
                          }
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}
