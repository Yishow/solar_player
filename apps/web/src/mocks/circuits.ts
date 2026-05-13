export type CircuitMock = {
  id: string;
  label: string;
  zone: string;
  powerKw: number;
  status: "connected" | "disconnected" | "connecting";
  efficiency: number;
};

export const circuitMocks: CircuitMock[] = [
  { id: "C-01", label: "中廠 A 區", zone: "Roof A", powerKw: 96, status: "connected", efficiency: 97 },
  { id: "C-02", label: "中廠 B 區", zone: "Roof B", powerKw: 88, status: "connected", efficiency: 95 },
  { id: "C-03", label: "沖壓側棚", zone: "Canopy", powerKw: 74, status: "connected", efficiency: 94 },
  { id: "C-04", label: "總裝物流", zone: "Logistics", powerKw: 102, status: "connected", efficiency: 98 },
  { id: "C-05", label: "行政停車棚", zone: "Parking", powerKw: 61, status: "connecting", efficiency: 89 },
  { id: "C-06", label: "備援測試組", zone: "Test Bed", powerKw: 0, status: "disconnected", efficiency: 0 }
];
