import type { ArcticLocation } from './types';

export const arcticLocations: ArcticLocation[] = [
  // --- High Priority Chokepoints / Subzones (Approximate Bounding Boxes) ---
  {
    id: 'lancaster-sound',
    name: 'Lancaster Sound',
    description: 'Eastern gateway to the central Northwest Passage; biodiversity hotspot and strategic entry corridor.',
    bbox: {
      southwest: { lat: 73.0, lng: -88.5 },
      northeast: { lat: 74.9, lng: -78.0 }
    },
    strategicImportance: 'Controls eastern access to the Northwest Passage; environmental & sovereignty relevance.',
    surveillanceChallenges: [
      'Seasonal ice edge shifts making persistent monitoring difficult',
      'Variable mix of commercial, research and local traffic',
      'Potential AIS gaps or spoofing during shoulder seasons'
    ]
  },
  {
    id: 'peel-sound',
    name: 'Peel Sound',
    description: 'Central narrow segment of the Northwest Passage prone to congestion and ice choke points.',
    bbox: {
      southwest: { lat: 72.0, lng: -99.5 },
      northeast: { lat: 74.0, lng: -94.0 }
    },
    strategicImportance: 'Critical mid-passage corridor where diversions or delays propagate route-wide impacts.',
    surveillanceChallenges: [
      'Ice floe compression can force slow or erratic vessel paths',
      'Limited persistent wide-area sensors',
      'Potential for dark transits tucked behind ice features'
    ]
  },
  {
    id: 'victoria-strait',
    name: 'Victoria Strait',
    description: 'Historically challenging segment with heavy ice history; central to full Northwest Passage transits.',
    bbox: {
      southwest: { lat: 68.8, lng: -101.5 },
      northeast: { lat: 70.6, lng: -96.5 }
    },
    strategicImportance: 'Bottleneck for east–west continuity in difficult ice years.',
    surveillanceChallenges: [
      'Heavy ice remnants affect radar & optical persistence',
      'Sparse coastal infrastructure',
      'Mixed signal reflection from ice complicates SAR interpretation'
    ]
  },
  {
    id: 'bellot-strait',
    name: 'Bellot Strait',
    description: 'Very narrow, high-current strait offering shortcut between Peel Sound and Prince Regent Inlet.',
    bbox: {
      southwest: { lat: 72.0, lng: -95.3 },
      northeast: { lat: 72.7, lng: -93.7 }
    },
    strategicImportance: 'Chokepoint where timing of transit can reveal routing strategy.',
    surveillanceChallenges: [
      'Short time window to observe each vessel',
      'High current + ice fragments create clutter',
      'Opportunity for AIS off/on toggling around entry/exit'
    ]
  },
  {
    id: 'prince-of-wales-strait',
    name: 'Prince of Wales Strait',
    description: 'Alternate narrow route between Amundsen Gulf and Viscount Melville Sound.',
    bbox: {
      southwest: { lat: 71.5, lng: -118.0 },
      northeast: { lat: 73.5, lng: -113.5 }
    },
    strategicImportance: 'Alternative path that may be used to avoid congestion or ice further east.',
    surveillanceChallenges: [
      'Sparse AIS relay infrastructure',
      'Low traffic baseline makes anomaly baselining harder',
      'Weather & polar night constraints'
    ]
  },
  {
    id: 'hudson-strait-chokepoint',
    name: 'Hudson Strait Entrance (East)',
    description: 'Eastern approach funnel where Atlantic traffic concentrates before dispersing into Hudson Bay system.',
    bbox: {
      southwest: { lat: 60.0, lng: -70.0 },
      northeast: { lat: 63.0, lng: -62.0 }
    },
    strategicImportance: 'Gateway for resupply & bulk export traffic into/out of Hudson Bay.',
    surveillanceChallenges: [
      'Seasonal ice and fog reduce multi-sensor coverage continuity',
      'Fishing vessel density complicates filtering',
      'Potential for identity swapping or AIS power cycling'
    ]
  },
  {
    id: 'beaufort-shelf',
    name: 'Beaufort Shelf Corridor',
    description: 'Shallow hydrocarbon interest zone and seasonal west–east trans-Arctic traffic staging area.',
    bbox: {
      southwest: { lat: 70.5, lng: -154.0 },
      northeast: { lat: 72.5, lng: -140.0 }
    },
    strategicImportance: 'Resource exploration interface and staging for longer Arctic routes.',
    surveillanceChallenges: [
      'Ice edge retreats north unevenly year to year',
      'Sparse coastal radar baseline',
      'Potential for loitering support vessels with intermittent AIS'
    ]
  },
  {
    id: 'northwest-passage',
    name: 'Northwest Passage',
    description: 'Increasingly used as Arctic ice recedes. High-value shipping route between the Atlantic and Pacific.',
    bbox: {
      southwest: { lat: 68.5, lng: -110.0 },
      northeast: { lat: 74.5, lng: -74.0 }
    },
    strategicImportance: 'Critical shipping corridor connecting Atlantic and Pacific oceans',
    surveillanceChallenges: [
      'Many narrow straits and chokepoints (Lancaster Sound, Peel Sound, Victoria Strait)',
      'Dark vessels may hide among legitimate traffic or ice floes',
      'Seasonal accessibility complicates monitoring patterns'
    ]
  },
  {
    id: 'beaufort-sea',
    name: 'Beaufort Sea',
    description: 'Known for oil & gas interest and seasonal shipping. North of Yukon & Northwest Territories.',
    bbox: {
      southwest: { lat: 69.0, lng: -156.0 },
      northeast: { lat: 76.0, lng: -125.0 }
    },
    strategicImportance: 'Oil and gas exploration area with increasing commercial activity',
    surveillanceChallenges: [
      'Vast, sparsely monitored waters',
      'Surveillance gaps due to remote location',
      'Weather conditions affect monitoring capabilities'
    ]
  },
  {
    id: 'baffin-bay-davis-strait',
    name: 'Baffin Bay & Davis Strait',
    description: 'Busy fishing and cargo routes between Nunavut and Greenland.',
    bbox: {
      southwest: { lat: 60.0, lng: -70.0 },
      northeast: { lat: 78.0, lng: -50.0 }
    },
    strategicImportance: 'Critical connection between Arctic and Atlantic shipping lanes',
    surveillanceChallenges: [
      'High volume of legitimate fishing and cargo traffic',
      'Weather patterns affect visibility',
      'International waters complicate jurisdiction'
    ]
  },
  {
    id: 'hudson-bay-strait',
    name: 'Hudson Bay / Hudson Strait',
    description: 'Gateway to Arctic resupply for northern communities.',
    bbox: {
      southwest: { lat: 51.0, lng: -95.0 },
      northeast: { lat: 70.0, lng: -64.0 }
    },
    strategicImportance: 'Essential supply route for northern Canadian communities',
    surveillanceChallenges: [
      'Potential for unregistered vessels during summer navigation season',
      'Large area with limited monitoring infrastructure',
      'Seasonal ice coverage affects year-round surveillance'
    ]
  },
  {
    id: 'canadian-arctic-archipelago',
    name: 'Canadian Arctic Archipelago',
    description: 'Remote, ice-covered areas where ships could "go dark".',
    bbox: {
      southwest: { lat: 68.0, lng: -120.0 },
      northeast: { lat: 83.0, lng: -60.0 }
    },
    strategicImportance: 'Sovereign waters with potential for covert vessel activity',
    surveillanceChallenges: [
      'Remote, ice-covered areas where ships could go dark',
      'Hard to distinguish between icebergs and vessels using only satellite SAR',
      'Extreme weather conditions limit monitoring capabilities'
    ]
  },
  {
    id: 'port-of-churchill',
    name: 'Port of Churchill',
    description: 'Northern Canadian port on Hudson Bay serving as a key Arctic shipping hub.',
    bbox: {
      southwest: { lat: 58.7700, lng: -94.2000 },
      northeast: { lat: 58.7800, lng: -94.1800 }
    },
    strategicImportance: 'Gateway for supplies to northern communities and Arctic trade',
    surveillanceChallenges: [
      'Small port with limited monitoring infrastructure',
      'Seasonal ice coverage restricts shipping access',
      'Potential for unregistered vessels during navigation season'
    ]
  },
  {
    id: 'vancouver',
    name: 'Vancouver',
    description: 'Major city in British Columbia, Canada, located on the southwestern coast near the Pacific Ocean.',
    bbox: {
      southwest: { lat: 49.00, lng: -123.40 },
      northeast: { lat: 49.50, lng: -122.90 }
    },
    strategicImportance: 'Major Pacific port, key gateway for trade with Asia, and important economic and transportation hub',
    surveillanceChallenges: [
      'High volume of shipping and commercial traffic',
      'Dense urban and port infrastructure complicates monitoring',
      'Weather and fog can affect visibility and surveillance operations'
    ]
  }
];

export const getLocationById = (id: string): ArcticLocation | undefined => {
  return arcticLocations.find(location => location.id === id);
};

export const getLocationBounds = (id: string) => {
  const location = getLocationById(id);
  if (!location) return null;

  return {
    southwest: location.bbox.southwest,
    northeast: location.bbox.northeast
  };
};

// Hackathon-grade helper: compute rough geographic center of bbox
export const getLocationCenter = (id: string): { lat: number; lng: number } | null => {
  const loc = getLocationById(id);
  if (!loc) return null;
  const { southwest: sw, northeast: ne } = loc.bbox;
  return {
    lat: (sw.lat + ne.lat) / 2,
    lng: (sw.lng + ne.lng) / 2
  };
};
