import { Scissors } from 'lucide-react';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function BookWizard() {
  return (
    <PagePlaceholder
      icon={Scissors}
      title="Book a service"
      description="Choose a service, add extras, pick a time slot, then confirm."
      note="The five-step booking wizard is built in Phase 4."
    />
  );
}
