import { useCallback, useEffect, useState } from 'react';

export type GeoState = 'asking' | 'ok' | 'denied' | 'unavailable';

export interface Position {
  lat: number;
  lng: number;
}

/** Asks the browser for the user's position once. Shared by the medicine and pharmacy views. */
export function useGeolocation(enabled = true) {
  const [position, setPosition] = useState<Position | null>(null);
  const [state, setState] = useState<GeoState>('asking');

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState('unavailable');
      return;
    }
    setState('asking');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
        setState('ok');
      },
      () => setState('denied'),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    if (enabled) locate();
  }, [enabled, locate]);

  return { position, state, locate };
}
