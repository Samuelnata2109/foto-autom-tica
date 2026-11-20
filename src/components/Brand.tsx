import { Aperture } from 'lucide-react';

export function Brand() {
  return (
    <div className="brand">
      <span className="brand__mark">
        <Aperture size={23} aria-hidden="true" />
      </span>
      <span>AI Photo Booth</span>
    </div>
  );
}
