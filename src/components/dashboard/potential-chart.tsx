"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LeadRow } from "@/components/leads/types";

type PotentialChartProps = {
  leads: LeadRow[];
};

type PotentialData = {
  hoch: number;
  medium: number;
  niedrig: number;
  none: number;
};

export function PotentialChart({ leads }: PotentialChartProps) {
  const potentialData = useMemo(() => {
    const data: PotentialData = {
      hoch: 0,
      medium: 0,
      niedrig: 0,
      none: 0,
    };

    leads.forEach((lead) => {
      const potential = lead.potential;
      if (potential === "Hoch") {
        data.hoch++;
      } else if (potential === "Medium") {
        data.medium++;
      } else if (potential === "Niedrig") {
        data.niedrig++;
      } else {
        data.none++;
      }
    });

    return data;
  }, [leads]);

  const total = leads.length;
  const hasData = total > 0;

  // Berechne Prozente und Winkel für SVG
  const hochPercent = total > 0 ? (potentialData.hoch / total) * 100 : 0;
  const mediumPercent = total > 0 ? (potentialData.medium / total) * 100 : 0;
  const niedrigPercent = total > 0 ? (potentialData.niedrig / total) * 100 : 0;
  const nonePercent = total > 0 ? (potentialData.none / total) * 100 : 0;

  // SVG Donut Chart Berechnungen
  const size = 200;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Start- und End-Winkel für jeden Segment
  let currentOffset = 0;
  const hochOffset = currentOffset;
  const hochLength = (hochPercent / 100) * circumference;
  currentOffset += hochLength;

  const mediumOffset = currentOffset;
  const mediumLength = (mediumPercent / 100) * circumference;
  currentOffset += mediumLength;

  const niedrigOffset = currentOffset;
  const niedrigLength = (niedrigPercent / 100) * circumference;
  currentOffset += niedrigLength;

  const noneOffset = currentOffset;
  const noneLength = (nonePercent / 100) * circumference;

  return (
    <Card className="border border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Lead-Potential Verteilung</CardTitle>
        <CardDescription>
          Übersicht der Leads nach Potential-Kategorien
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
            {/* Donut Chart */}
            <div className="relative">
              <svg width={size} height={size} className="transform -rotate-90">
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  className="text-muted"
                />
                {/* Hoch (Grün) */}
                {hochPercent > 0 && (
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${hochLength} ${circumference}`}
                    strokeDashoffset={-hochOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                )}
                {/* Medium (Gelb) */}
                {mediumPercent > 0 && (
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#eab308"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${mediumLength} ${circumference}`}
                    strokeDashoffset={-mediumOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                )}
                {/* Niedrig (Rot) */}
                {niedrigPercent > 0 && (
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${niedrigLength} ${circumference}`}
                    strokeDashoffset={-niedrigOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                )}
                {/* Kein Potential (Grau) */}
                {nonePercent > 0 && (
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${noneLength} ${circumference}`}
                    strokeDashoffset={-noneOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">{total}</p>
                  <p className="text-xs text-muted-foreground">Leads</p>
                </div>
              </div>
            </div>

            {/* Legende */}
            <div className="space-y-3 min-w-[200px]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Hoch</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{potentialData.hoch}</p>
                  <p className="text-xs text-muted-foreground">
                    {hochPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium">Medium</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{potentialData.medium}</p>
                  <p className="text-xs text-muted-foreground">
                    {mediumPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-red-500" />
                  <span className="text-sm font-medium">Niedrig</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{potentialData.niedrig}</p>
                  <p className="text-xs text-muted-foreground">
                    {niedrigPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
              {potentialData.none > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-gray-400" />
                    <span className="text-sm font-medium">Kein Potential</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{potentialData.none}</p>
                    <p className="text-xs text-muted-foreground">
                      {nonePercent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Noch keine Leads vorhanden
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sobald Leads erfasst werden, erscheint hier die Potential-Verteilung
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
