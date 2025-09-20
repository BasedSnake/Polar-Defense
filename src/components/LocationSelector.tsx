"use client";

import { useState } from "react";
import type { ArcticLocation } from "@/lib/types";
import { arcticLocations } from "@/lib/arctic-locations";

interface LocationSelectorProps {
  selectedLocation: ArcticLocation | null;
  onLocationSelect: (location: ArcticLocation | null) => void;
}

export default function LocationSelector({
  selectedLocation,
  onLocationSelect,
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <label
        htmlFor="location-selector"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Arctic Surveillance Location
      </label>

      <button
        id="location-selector"
        type="button"
        className="relative w-full bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="block truncate">
          {selectedLocation ? selectedLocation.name : "Select a location..."}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          <button
            type="button"
            className="w-full text-gray-900 cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
            onClick={() => {
              onLocationSelect(null);
              setIsOpen(false);
            }}
          >
            <span className="block truncate font-normal">All locations</span>
          </button>

          {arcticLocations.map((location) => (
            <button
              key={location.id}
              type="button"
              className="w-full text-gray-900 cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
              onClick={() => {
                onLocationSelect(location);
                setIsOpen(false);
              }}
            >
              <div className="flex flex-col">
                <span className="block truncate font-normal">
                  {location.name}
                </span>
                <span className="block truncate text-xs text-gray-500 mt-1">
                  {location.description}
                </span>
              </div>
              {selectedLocation?.id === location.id && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedLocation && (
        <div className="mt-3 p-3 bg-blue-50 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Location Details
          </h4>
          <p className="text-sm text-blue-800 mb-2">
            {selectedLocation.strategicImportance}
          </p>
          <div className="text-xs text-blue-700">
            <strong>Surveillance Challenges:</strong>
            <ul className="list-disc list-inside mt-1">
              {selectedLocation.surveillanceChallenges.map((challenge) => (
                <li key={challenge}>{challenge}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
