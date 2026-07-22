import { Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import Button from '../../components/ui/Button';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function Maintenance() {
  const navigate = useNavigate();
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-app px-4 text-center">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Logo to={null} />
      <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
        <Wrench className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">We&apos;ll be right back</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        AzCuts is temporarily unavailable while we tidy up the shop. Please check back in a little
        while.
      </p>
      <Button variant="outline" className="mt-6" onClick={() => navigate('/')}>
        Try again
      </Button>
    </div>
  );
}
