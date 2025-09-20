declare module 'react-leaflet' {
  // Temporary loose component typings until real leaflet types installed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const MapContainer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const TileLayer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Polyline: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const CircleMarker: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Tooltip: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Rectangle: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const LayerGroup: any;
}

declare module 'leaflet' {
  export type LatLngBoundsExpression = unknown;
}
