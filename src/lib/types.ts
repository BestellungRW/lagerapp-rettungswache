import type { Role } from "@/lib/roles";

export interface Profile {
  id: string;
  email: string;
  role: Role | null;
  station_id: string | null;
  created_at?: string;
}

export interface Station {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  station_id: string;
  barcode: string;
  name: string;
  soll: number;
}

/**
 * Eine Packung, die beim Scannen im Modus
 * „Verfallsdatenkontrolle“ erfasst wird.
 */
export interface PackageRow {
  count: number;
  expiry: string; // Format "MM.JJJJ"
}

export interface ScanEntry {
  product: Product;
  ist: number;
  packages: PackageRow[];
}

export interface OrderRow {
  name: string;
  barcode: string;
  soll: number;
  ist: number;
  order: number;
  packages: { count: number; expiry: string; expired: boolean }[];
}