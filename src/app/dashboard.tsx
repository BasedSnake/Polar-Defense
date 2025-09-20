"use client";
import { VesselDashboard } from "@/components/VesselDashboard";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Arctic Vessel Surveillance Dashboard
          </h1>
          <p className="mt-2 text-gray-600 text-sm">
            Unified list, per-vessel analysis & geospatial view with consistency
            reporting
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VesselDashboard />
      </div>
    </div>
  );
}
