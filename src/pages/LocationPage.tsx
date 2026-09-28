import { ExternalLink } from 'lucide-react';
import { useHardware } from '../services/hardwareService';
import { LocationCard } from '../components/widgets';

export function LocationPage() {
  const { location, device } = useHardware();
  return (
    <>
      <div className="page-head">
        <div>
          <h2>Location</h2>
          <p>Where {device.wearer}'s band last reported a GPS fix. It updates whenever the band sends a new position.</p>
        </div>
        {location && (
          <a className="btn" href={`https://www.google.com/maps?q=${location.lat},${location.lng}`} target="_blank" rel="noreferrer">
            <ExternalLink size={17} aria-hidden="true" /> Open in Google Maps
          </a>
        )}
      </div>
      <LocationCard tall />
    </>
  );
}
