export interface Medicine {
  code: string;
  name: string;
  activeIngredient: string | null;
  category: string;
  form: string | null;
  approxPriceRon: number | null;
  minAgeYears: number | null;
  requiresPrescription: boolean;
  warning: string | null;
}

export interface StockLocation {
  pharmacyId: number;
  pharmacyName: string;
  street: string | null;
  hourInterval: string | null;
  latitude: number;
  longitude: number;
  /** null when the browser gave us no position */
  distanceKm: number | null;
  quantity: number;
  lowStock: boolean;
}

export interface MedicineAvailability {
  medicine: Medicine;
  /** how many pharmacies in the radius carry it, not just the ones listed */
  pharmacyCount: number;
  pharmacies: StockLocation[];
}

export interface AvailabilityQuery {
  symptomId?: string;
  category?: string;
  ingredient?: string;
  lat?: number;
  lng?: number;
  city?: string;
  age?: number;
  radiusKm?: number;
  limit?: number;
}

export function availabilityUrl(q: AvailabilityQuery): string {
  const params = new URLSearchParams();
  Object.entries(q).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return `/api/medicines/availability?${params.toString()}`;
}

export function formatDistance(km: number | null): string {
  if (km === null) return '';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
}

export function formatPrice(ron: number | null): string {
  return ron === null ? '' : `~${ron.toFixed(0)} lei`;
}
