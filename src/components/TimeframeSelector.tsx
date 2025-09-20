"use client";

import { useState } from "react";
import type { Timeframe } from "@/lib/types";

interface TimeframeSelectorProps {
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

export default function TimeframeSelector({
  timeframe,
  onTimeframeChange,
}: TimeframeSelectorProps) {
  const [startDate, setStartDate] = useState(
    timeframe.start.toISOString().slice(0, 10)
  );

  // Restrict to 1-day range: start and end must be the same date (ignore time)
  const handleDateChange = (value: string) => {
    setStartDate(value);
    // Parse as local date at midnight
    const [year, month, day] = value.split("-").map(Number);
    const startDateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endDateObj = new Date(year, month - 1, day, 23, 59, 59, 999);
    onTimeframeChange({
      start: startDateObj,
      end: endDateObj,
    });
  };

  // For 1-day range, quick select sets both start and end to the same date (today or yesterday)
  const setQuickTimeframe = (daysAgo: number) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0); // midnight today
    date.setDate(date.getDate() - daysAgo);
    const iso = date.toISOString().slice(0, 10);
    setStartDate(iso);
    const [year, month, day] = iso.split("-").map(Number);
    const startDateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endDateObj = new Date(year, month - 1, day, 23, 59, 59, 999);
    onTimeframeChange({ start: startDateObj, end: endDateObj });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="block text-sm font-medium text-gray-700 mb-2">
          Time Range for Vessel Tracking
        </div>

        <div>
          <label
            htmlFor="date-picker"
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            Date
          </label>
          <input
            id="date-picker"
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="text-xs text-gray-500 mt-1">
            Select a single day (start and end will be the same)
          </div>
        </div>
      </div>

      <div>
        <div className="block text-xs font-medium text-gray-600 mb-2">
          Quick Select
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setQuickTimeframe(0)}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setQuickTimeframe(1)}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
          >
            Yesterday
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Selected day: {timeframe.start.toLocaleDateString()} (1-day range)
      </div>
    </div>
  );
}
