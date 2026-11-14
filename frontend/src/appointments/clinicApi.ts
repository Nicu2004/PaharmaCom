// Calls to the demo clinic server ("Clinica Demo Vest").
export const CLINIC_API: string =
  (import.meta.env?.VITE_CLINIC_API_URL as string | undefined) || 'http://localhost:3000';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  photoUrl: string;
  nextFreeAt: string | null;
  freeSlots: string[];
}

export interface DoctorsResponse {
  clinicName: string;
  slotMinutes: number;
  doctors: Doctor[];
}

export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface BookingState {
  id: string;
  status: BookingStatus;
  scheduledAt: string | null;
  clinicNote: string;
  doctorName: string | null;
}

export interface BookingPayload {
  doctorId: string;
  slotAt: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  reason: string;
  symptomSummary: string;
}

export class ClinicError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(CLINIC_API + path, init);
  } catch {
    throw new ClinicError('Nu ne-am putut conecta la clinică. Încearcă din nou în câteva momente.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ClinicError((data as { message?: string }).message || `Eroare ${res.status}`, res.status);
  return data as T;
}

export const fetchDoctors = (signal?: AbortSignal) => request<DoctorsResponse>('/api/public/doctors', { signal });

export const createBooking = (payload: BookingPayload) =>
  request<BookingState>('/api/public/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const fetchBooking = (id: string) => request<BookingState>(`/api/public/bookings/${encodeURIComponent(id)}`);

export const photoSrc = (photoUrl: string) => (photoUrl.startsWith('http') ? photoUrl : CLINIC_API + photoUrl);
