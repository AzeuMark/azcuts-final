import { Boxes } from 'lucide-react';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function Inventory() {
  return (
    <PagePlaceholder
      icon={Boxes}
      title="Inventory"
      description="Services and extras: prices, durations, images, and active toggles."
      note="Inventory management is built in Phase 8."
    />
  );
}
