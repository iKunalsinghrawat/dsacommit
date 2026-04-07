"use client";

import { useMemo, useState } from "react";

import { ChangeRequestHistoryCard } from "@/components/approvals/change-request-history-card";
import { RoadmapRequestSection } from "@/components/approvals/roadmap-request-section";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ChangeRequestOperationType, type ChangeRequestEntityType, RoadmapLevel, ChangeRequestStatus } from "@/generated/prisma/enums";

type RoadmapRecord = {
  id: string;
  title: string;
  slug: string;
  level: RoadmapLevel;
  summary: string;
  details: string;
  sortOrder: number;
  topicId: string | null;
};

type TopicOption = {
  id: string;
  name: string;
};

type HistoryRequest = {
  id: string;
  summary: string;
  status: ChangeRequestStatus;
  entityType: ChangeRequestEntityType;
  operationType: string;
  rejectionReason: string | null;
  createdAt: Date | string;
  reviewedAt: Date | string | null;
  reviewedBy: {
    id: string;
    name: string;
  } | null;
};

export function RoadmapApprovalPanel({
  items,
  requests,
  topics,
}: {
  items: RoadmapRecord[];
  requests: HistoryRequest[];
  topics: TopicOption[];
}) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");

  const currentItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Choose a live roadmap item</CardTitle>
            <CardDescription>
              Select an existing checkpoint before sending an edit or remove request. Add requests do not need a selection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <label className="text-sm font-medium" htmlFor="roadmap-request-selector">
              Roadmap item
            </label>
            <Select
              id="roadmap-request-selector"
              onChange={(event) => setSelectedId(event.target.value)}
              value={selectedId}
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({item.level})
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>

        <RoadmapRequestSection
          availableModes={[
            ChangeRequestOperationType.CREATE,
            ...(currentItem ? [ChangeRequestOperationType.UPDATE, ChangeRequestOperationType.DELETE] : []),
          ]}
          currentItem={currentItem}
          topics={topics}
        />
      </div>

      <ChangeRequestHistoryCard
        description="Recent roadmap requests you submitted from this workspace."
        requests={requests}
        title="Roadmap request history"
      />
    </div>
  );
}
