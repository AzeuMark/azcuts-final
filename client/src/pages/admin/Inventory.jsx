import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Scissors, Sparkles, Search } from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ImagePicker from '../../components/ui/ImagePicker';
import { Tabs } from '../../components/ui/Tabs';

import inventoryApi from '../../api/inventory.api';
import { getApiErrorMessage } from '../../config/axios';
import { formatMoney } from '../../utils/formatMoney';
import { serverAsset } from '../../utils/serverAsset';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

// The inventory endpoints return the full list, so filtering + pagination are
// done on the client. Returns the current page's rows plus paging metadata.
function usePagedRows(rows, search, page, limit) {
  return useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? rows.filter((r) => r.name?.toLowerCase().includes(term))
      : rows;
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const current = Math.min(page, pages);
    const start = (current - 1) * limit;
    return { slice: filtered.slice(start, start + limit), total, pages, current };
  }, [rows, search, page, limit]);
}

export default function Inventory() {
  const [tab, setTab] = useState('services');
  return (
    <div>
      <PageHeader title="Inventory" description="Manage services, extras, prices, and images." />
      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'services', label: 'Services' },
            { value: 'extras', label: 'Extras' },
          ]}
        />
      </div>
      {tab === 'services' ? <ServicesPanel /> : <ExtrasPanel />}
    </div>
  );
}

/* ------------------------------------------------------------------ SERVICES */
function ServicesPanel() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'services'],
    queryFn: () => inventoryApi.listServices().then((r) => r.data?.services || []),
    placeholderData: keepPreviousData,
  });

  const paged = usePagedRows(data || [], search, page, limit);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'services'] });
    qc.invalidateQueries({ queryKey: ['services'] });
  };

  const deleteMutation = useMutation({
    mutationFn: () => inventoryApi.deleteService(deleteTarget._id),
    onSuccess: () => {
      toast.success('Service deleted');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not delete service')),
  });

  const columns = [
    {
      key: 'name',
      header: 'Service',
      render: (s) => (
        <div className="flex items-center gap-3">
          {serverAsset(s.image) ? (
            <img src={serverAsset(s.image)} alt="" className="h-9 w-9 rounded-md object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand/10 text-brand">
              {s.category === 'salon' ? <Sparkles className="h-4 w-4" /> : <Scissors className="h-4 w-4" />}
            </span>
          )}
          <span className="font-medium text-ink">{s.name}</span>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (s) => <Badge tone={s.category === 'salon' ? 'accent' : 'brand'}>{s.category}</Badge> },
    { key: 'price', header: 'Price', align: 'right', render: (s) => formatMoney(s.price) },
    { key: 'duration', header: 'Duration', align: 'right', render: (s) => `${s.durationMinutes} min` },
    { key: 'active', header: 'Active', render: (s) => <Badge tone={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'Active' : 'Hidden'}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(s)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(s)} title="Delete">
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Search services…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          containerClassName="sm:max-w-xs"
        />
        <Button onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" />
          Add service
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={paged.slice}
        loading={isLoading}
        page={paged.current}
        totalPages={paged.pages}
        onPageChange={setPage}
        pageSize={limit}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={(size) => {
          setLimit(size);
          setPage(1);
        }}
        total={paged.total}
      />

      {editing && (
        <ServiceFormModal
          service={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title={`Delete ${deleteTarget?.name || 'service'}?`}
        description="Consider hiding it instead (set inactive) to preserve booking history."
        confirmLabel="Delete"
        tone="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function ServiceFormModal({ service, onClose, onSaved }) {
  const isEdit = Boolean(service);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: service?.name || '',
      category: service?.category || 'haircut',
      description: service?.description || '',
      price: service?.price ?? '',
      durationMinutes: service?.durationMinutes ?? 30,
      isActive: service?.isActive ?? true,
    },
  });

  // Image selection from the picker: a File (upload), a URL string, or neither
  // (keep the existing image on edit).
  const [image, setImage] = useState({ file: null, url: null });

  const mutation = useMutation({
    mutationFn: (v) => {
      const payload = {
        name: v.name,
        category: v.category,
        description: v.description || '',
        price: Number(v.price),
        durationMinutes: Number(v.durationMinutes),
        isActive: Boolean(v.isActive),
      };
      if (image.file) payload.image = image.file; // → multipart upload
      else if (image.url) payload.image = image.url; // → stored as an external URL
      return isEdit ? inventoryApi.updateService(service._id, payload) : inventoryApi.createService(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Service updated' : 'Service created');
      onSaved();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not save service')),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit service' : 'Add service'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create service'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Name is required' })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" {...register('category')}>
            <option value="haircut">Haircut</option>
            <option value="salon">Salon</option>
          </Select>
          <Input
            label="Price (PHP)"
            type="number"
            min={0}
            step="1"
            error={errors.price?.message}
            {...register('price', { required: 'Price is required', min: { value: 0, message: 'Must be ≥ 0' } })}
          />
        </div>
        <Input
          label="Duration (minutes)"
          type="number"
          min={0}
          step="5"
          error={errors.durationMinutes?.message}
          {...register('durationMinutes', { required: 'Duration is required', min: { value: 0, message: 'Must be ≥ 0' } })}
        />
        <Textarea label="Description" rows={3} {...register('description')} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Image</label>
          <ImagePicker
            preview={serverAsset(service?.image)}
            aspect="video"
            onChange={setImage}
            hint="PNG, JPG, or JPEG · max 5MB. For the best appearance, use a landscape (16:9) image."
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" className="h-4 w-4 rounded border-line text-brand focus:ring-brand" {...register('isActive')} />
          Active (visible to customers)
        </label>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------- EXTRAS */
function ExtrasPanel() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'extras'],
    queryFn: () => inventoryApi.listExtras().then((r) => r.data?.extras || []),
    placeholderData: keepPreviousData,
  });

  const paged = usePagedRows(data || [], search, page, limit);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'extras'] });
    qc.invalidateQueries({ queryKey: ['extras'] });
  };

  const deleteMutation = useMutation({
    mutationFn: () => inventoryApi.deleteExtra(deleteTarget._id),
    onSuccess: () => {
      toast.success('Extra deleted');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not delete extra')),
  });

  const columns = [
    { key: 'name', header: 'Extra', render: (x) => <span className="font-medium text-ink">{x.name}</span> },
    { key: 'price', header: 'Price', align: 'right', render: (x) => formatMoney(x.price) },
    { key: 'duration', header: 'Added time', align: 'right', render: (x) => `${x.durationMinutes || 0} min` },
    { key: 'active', header: 'Active', render: (x) => <Badge tone={x.isActive ? 'success' : 'neutral'}>{x.isActive ? 'Active' : 'Hidden'}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (x) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(x)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(x)} title="Delete">
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Search extras…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          containerClassName="sm:max-w-xs"
        />
        <Button onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" />
          Add extra
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={paged.slice}
        loading={isLoading}
        page={paged.current}
        totalPages={paged.pages}
        onPageChange={setPage}
        pageSize={limit}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={(size) => {
          setLimit(size);
          setPage(1);
        }}
        total={paged.total}
      />

      {editing && (
        <ExtraFormModal
          extra={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title={`Delete ${deleteTarget?.name || 'extra'}?`}
        description="Consider hiding it instead (set inactive) to preserve booking history."
        confirmLabel="Delete"
        tone="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function ExtraFormModal({ extra, onClose, onSaved }) {
  const isEdit = Boolean(extra);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: extra?.name || '',
      price: extra?.price ?? '',
      durationMinutes: extra?.durationMinutes ?? 0,
      isActive: extra?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: (v) => {
      const payload = {
        name: v.name,
        price: Number(v.price),
        durationMinutes: Number(v.durationMinutes),
        isActive: Boolean(v.isActive),
      };
      return isEdit ? inventoryApi.updateExtra(extra._id, payload) : inventoryApi.createExtra(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Extra updated' : 'Extra created');
      onSaved();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not save extra')),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit extra' : 'Add extra'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create extra'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Name is required' })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Price (PHP)"
            type="number"
            min={0}
            step="1"
            error={errors.price?.message}
            {...register('price', { required: 'Price is required', min: { value: 0, message: 'Must be ≥ 0' } })}
          />
          <Input label="Added time (min)" type="number" min={0} step="5" {...register('durationMinutes')} />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" className="h-4 w-4 rounded border-line text-brand focus:ring-brand" {...register('isActive')} />
          Active (available when booking)
        </label>
      </form>
    </Modal>
  );
}
