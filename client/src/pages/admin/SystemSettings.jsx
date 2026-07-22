import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, X, Globe, Wifi, WifiOff, Wrench } from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import cn from '../../utils/cn';

import settingsApi from '../../api/settings.api';
import { getApiErrorMessage } from '../../config/axios';

const DAYS = [
  ['mon', 'Monday'],
  ['tue', 'Tuesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sun', 'Sunday'],
];

const MODES = [
  { value: 'online', label: 'Online', icon: Wifi, desc: 'Everyone can log in and book.' },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench, desc: 'Only staff and admins can access.' },
  { value: 'offline', label: 'Offline', icon: WifiOff, desc: 'Only admins can access.' },
];

export default function SystemSettings() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'full'],
    queryFn: () => settingsApi.get().then((r) => r.data?.settings),
  });

  if (isLoading || !settings) {
    return (
      <div>
        <PageHeader title="System Settings" description="Configure the whole system." />
        <div className="flex justify-center py-20">
          <Spinner className="text-brand" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="System Settings" description="System mode, localization, hours, nicknames, and shop info." />
      <SettingsForm settings={settings} onSaved={() => {
        qc.invalidateQueries({ queryKey: ['settings'] });
      }} />
      <NicknameManager
        nicknames={settings.nicknames || []}
        onChanged={() => qc.invalidateQueries({ queryKey: ['settings'] })}
      />
    </div>
  );
}

function SettingsForm({ settings, onSaved }) {
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      systemMode: settings.systemMode || 'online',
      timezone: settings.timezone || 'Asia/Manila',
      region: settings.region || 'PH',
      country: settings.country || 'PH',
      currency: settings.currency || 'PHP',
      taxRatePercent: Math.round((Number(settings.taxRate) || 0) * 10000) / 100,
      slotStepMinutes: settings.slotStepMinutes || 30,
      storeHours: DAYS.reduce((acc, [key]) => {
        const h = settings.storeHours?.[key] || {};
        acc[key] = { open: h.open || '09:00', close: h.close || '20:00', closed: Boolean(h.closed) };
        return acc;
      }, {}),
      shopInfo: {
        name: settings.shopInfo?.name || '',
        tagline: settings.shopInfo?.tagline || '',
        phone: settings.shopInfo?.phone || '',
        email: settings.shopInfo?.email || '',
        address: settings.shopInfo?.address || '',
        mapEmbedUrl: settings.shopInfo?.mapEmbedUrl || '',
        facebook: settings.shopInfo?.socials?.facebook || '',
        instagram: settings.shopInfo?.socials?.instagram || '',
      },
    },
  });

  const mode = watch('systemMode');

  const mutation = useMutation({
    mutationFn: (v) => {
      const socials = {};
      if (v.shopInfo.facebook) socials.facebook = v.shopInfo.facebook;
      if (v.shopInfo.instagram) socials.instagram = v.shopInfo.instagram;
      return settingsApi.update({
        systemMode: v.systemMode,
        timezone: v.timezone,
        region: v.region,
        country: v.country,
        currency: v.currency,
        taxRate: Math.max(0, Math.min(1, Number(v.taxRatePercent) / 100)),
        slotStepMinutes: Number(v.slotStepMinutes),
        storeHours: v.storeHours,
        shopInfo: {
          name: v.shopInfo.name,
          tagline: v.shopInfo.tagline,
          phone: v.shopInfo.phone,
          email: v.shopInfo.email,
          address: v.shopInfo.address,
          mapEmbedUrl: v.shopInfo.mapEmbedUrl,
          socials,
        },
      });
    },
    onSuccess: () => {
      toast.success('Settings saved');
      onSaved();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not save settings')),
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6" noValidate>
      {/* System mode */}
      <Card>
        <CardHeader>
          <CardTitle>System mode</CardTitle>
          <CardDescription>Controls who can access the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {MODES.map((m) => {
              const active = mode === m.value;
              const Icon = m.icon;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setValue('systemMode', m.value)}
                  className={cn(
                    'flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors focus-ring',
                    active ? 'border-brand bg-brand/5' : 'border-line bg-surface hover:bg-surface-2'
                  )}
                >
                  <span className={cn('flex items-center gap-2 font-medium', active ? 'text-brand' : 'text-ink')}>
                    <Icon className="h-4 w-4" />
                    {m.label}
                  </span>
                  <span className="text-xs text-muted">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Localization & pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Localization &amp; pricing</CardTitle>
          <CardDescription>Timezone, region, currency, tax, and slot granularity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Timezone" leftIcon={<Globe className="h-4 w-4" />} {...register('timezone')} />
            <Input label="Region" {...register('region')} />
            <Input label="Country" {...register('country')} />
            <Input label="Currency" {...register('currency')} />
            <Input label="Tax rate (%)" type="number" min={0} max={100} step="0.01" {...register('taxRatePercent')} />
            <Input label="Slot step (min)" type="number" min={5} max={240} step="5" {...register('slotStepMinutes')} />
          </div>
        </CardContent>
      </Card>

      {/* Store hours */}
      <Card>
        <CardHeader>
          <CardTitle>Store hours</CardTitle>
          <CardDescription>Open and close times per day. These drive slot generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {DAYS.map(([key, label]) => {
            const closed = watch(`storeHours.${key}.closed`);
            return (
              <div key={key} className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2">
                <span className="w-24 text-sm font-medium text-ink">{label}</span>
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" className="h-4 w-4 rounded border-line text-brand focus:ring-brand" {...register(`storeHours.${key}.closed`)} />
                  Closed
                </label>
                <div className={cn('flex items-center gap-2', closed && 'opacity-40')}>
                  <input
                    type="time"
                    disabled={closed}
                    className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    {...register(`storeHours.${key}.open`)}
                  />
                  <span className="text-muted">–</span>
                  <input
                    type="time"
                    disabled={closed}
                    className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    {...register(`storeHours.${key}.close`)}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Shop info */}
      <Card>
        <CardHeader>
          <CardTitle>Shop info</CardTitle>
          <CardDescription>Shown on the public landing page.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" {...register('shopInfo.name')} />
            <Input label="Tagline" {...register('shopInfo.tagline')} />
            <Input label="Phone" {...register('shopInfo.phone')} />
            <Input label="Email" type="email" {...register('shopInfo.email')} />
            <Input label="Address" containerClassName="sm:col-span-2" {...register('shopInfo.address')} />
            <Input label="Map embed URL" containerClassName="sm:col-span-2" {...register('shopInfo.mapEmbedUrl')} />
            <Input label="Facebook URL" {...register('shopInfo.facebook')} />
            <Input label="Instagram URL" {...register('shopInfo.instagram')} />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" loading={mutation.isPending}>
            Save settings
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function NicknameManager({ nicknames, onChanged }) {
  const [value, setValue] = useState('');

  const addMutation = useMutation({
    mutationFn: (v) => settingsApi.addNickname(v),
    onSuccess: () => {
      toast.success('Nickname added');
      setValue('');
      onChanged();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not add nickname')),
  });

  const removeMutation = useMutation({
    mutationFn: (v) => settingsApi.removeNickname(v),
    onSuccess: () => {
      toast.success('Nickname removed');
      onChanged();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not remove nickname')),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff nicknames</CardTitle>
        <CardDescription>Title options staff can choose from.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {nicknames.map((n) => (
            <span key={n} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 py-1 pl-3 pr-1.5 text-sm text-ink">
              {n}
              <button
                type="button"
                onClick={() => removeMutation.mutate(n)}
                aria-label={`Remove ${n}`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted hover:bg-danger/10 hover:text-danger focus-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {nicknames.length === 0 && <p className="text-sm text-muted">No nicknames configured.</p>}
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) addMutation.mutate(value.trim());
          }}
        >
          <Input placeholder="Add a nickname…" value={value} onChange={(e) => setValue(e.target.value)} containerClassName="max-w-xs" />
          <Button type="submit" variant="secondary" loading={addMutation.isPending} disabled={!value.trim()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
