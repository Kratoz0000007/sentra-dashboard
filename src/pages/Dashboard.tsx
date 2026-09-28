import { SafetyHero } from '../components/SafetyHero';
import { BatteryWidget, DeviceStatusCard, LiveEventsPanel, LocationCard, RecentActivity, SensorStrip } from '../components/widgets';
import { DemoPanel } from '../components/DemoPanel';

export function Dashboard() {
  return (
    <div className="dash">
      <div className="dash-main">
        <div className="span-12">
          <SafetyHero />
        </div>
        <div className="span-8">
          <DeviceStatusCard />
        </div>
        <div className="span-4">
          <BatteryWidget />
        </div>
        <div className="span-6">
          <LocationCard />
        </div>
        <div className="span-6">
          <RecentActivity />
        </div>
        <div className="span-12">
          <SensorStrip />
        </div>
      </div>
      <aside className="dash-rail" aria-label="Live events and demo controls">
        <LiveEventsPanel />
        <DemoPanel />
      </aside>
    </div>
  );
}
