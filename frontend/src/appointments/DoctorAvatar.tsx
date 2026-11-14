import { useState } from 'react';
import { photoSrc, type Doctor } from './clinicApi';
import { initials } from './format';

/** The doctor's photo, with an initials circle if the image can't be loaded. */
export default function DoctorAvatar({ doctor, size = 72 }: { doctor: Doctor; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="appt-avatar appt-avatar--fallback" style={{ width: size, height: size }} aria-hidden="true">
        {initials(doctor.name)}
      </span>
    );
  }
  return (
    <img
      className="appt-avatar"
      style={{ width: size, height: size }}
      src={photoSrc(doctor.photoUrl)}
      alt={`Fotografie ${doctor.name}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
