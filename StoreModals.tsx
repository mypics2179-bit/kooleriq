import React, { useState } from 'react';
import { Images, Minus, Plus, Store, Trash2, X } from 'lucide-react';
import {
  ContainerType,
  CoolerDoor,
  DoorHardwareType,
  SkuItem,
} from '../types/kooleriq';
import { HARDWARE_LABELS } from '../utils/formatters';
import { BeverageVisual } from './BeverageVisual';

/* 1. Create New Store & Custom Cooler Layout Modal */
interface CreateStoreModalProps {
  open: boolean;
  onClose: () => void;
  onCreateStore: (payload: {
    storeName: string;
    storeCode: string;
    address: string;
    routeId: string;
    preset: 'bodega-2' | 'cstore-4' | 'plaza-6' | 'custom';
    customDoors: number;
    customShelves: number;
    customFacings: number;
    hardwareType: DoorHardwareType;
    categories: string[];
  }) => void;
}

const DRINK_CATEGORY_OPTIONS = [
  { id: 'energy', label: 'Energy & Performance (Monster, Celsius, Red Bull, Alani)' },
  { id: 'csd', label: 'CSD & Sparkling (Coca-Cola, Sprite, Olipop)' },
  { id: 'hydration', label: 'Hydration & Sports (Gatorade, Liquid Death)' },
  { id: 'coffee', label: 'Cold Brew, Tea & Protein (Starbucks, Yerba Mate, Core Power)' },
];

export const CreateStoreModal: React.FC<CreateStoreModalProps> = ({
  open,
  onClose,
  onCreateStore,
}) => {
  const [storeName, setStoreName] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [address, setAddress] = useState('');
  const [routeId, setRouteId] = useState('ROUTE-TX-12');
  const [preset, setPreset] = useState<'bodega-2' | 'cstore-4' | 'plaza-6' | 'custom'>('cstore-4');
  const [customDoors, setCustomDoors] = useState(3);
  const [customShelves, setCustomShelves] = useState(5);
  const [customFacings, setCustomFacings] = useState(5);
  const [hardwareType, setHardwareType] = useState<DoorHardwareType>('standard-glass');
  const [categories, setCategories] = useState<string[]>(['energy', 'csd', 'hydration']);

  if (!open) return null;

  const toggleCategory = (catId: string) => {
    setCategories((prev) =>
      prev.includes(catId)
        ? prev.length > 1
          ? prev.filter((c) => c !== catId)
          : prev
        : [...prev, catId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return;
    onCreateStore({
      storeName: storeName.trim(),
      storeCode: storeCode.trim() || `STR-${Math.floor(100 + Math.random() * 899)}`,
      address: address.trim() || 'Custom Retail Location',
      routeId: routeId.trim() || 'ROUTE-01',
      preset,
      customDoors,
      customShelves,
      customFacings,
      hardwareType,
      categories,
    });
    setStoreName('');
    setStoreCode('');
    setAddress('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto glacier-hud rounded-xl p-5 sm:p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--kq-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <Store className="w-5 h-5 text-[var(--kq-accent)]" />
            <h2 className="text-base font-display font-bold text-[var(--kq-text)]">
              Add Store &amp; Custom Cooler Layout
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                Store Name
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g., Sunset Corner Mart #14"
                className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                Store Code
              </label>
              <input
                type="text"
                value={storeCode}
                onChange={(e) => setStoreCode(e.target.value)}
                placeholder="e.g., SCM-014"
                className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm font-mono-tabular text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, City, State"
                className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                Route ID
              </label>
              <input
                type="text"
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm font-mono-tabular text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
              />
            </div>
          </div>

          {/* Cooler Architecture Template */}
          <div>
            <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-2">
              Cooler Hardware Architecture
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'bodega-2', title: '2-Door Slim / Mini', desc: '4 facings wide · 4–5 shelves' },
                  { id: 'cstore-4', title: '4-Door C-Store', desc: '6 facings wide · 5 shelves' },
                  { id: 'plaza-6', title: '6-Door Travel Plaza', desc: 'Air curtain + cave doors' },
                  { id: 'custom', title: 'Custom Dimensions', desc: 'Pick exact doors, shelves, facings' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreset(opt.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    preset === opt.id
                      ? 'bg-[var(--kq-accent-soft)] border-[var(--kq-accent)] text-[var(--kq-text)]'
                      : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border)] text-[var(--kq-text-secondary)] hover:border-[var(--kq-border-strong)]'
                  }`}
                >
                  <div className="text-xs font-semibold">{opt.title}</div>
                  <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {preset === 'custom' && (
            <div className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-3.5 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="block text-[11px] text-[var(--kq-text-muted)] mb-1">
                    Doors (1–8)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCustomDoors((v) => Math.max(1, v - 1))}
                      className="min-h-[36px] min-w-[36px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono-tabular text-sm font-bold flex-1 text-center text-[var(--kq-text)]">
                      {customDoors}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomDoors((v) => Math.min(8, v + 1))}
                      className="min-h-[36px] min-w-[36px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="block text-[11px] text-[var(--kq-text-muted)] mb-1">
                    Shelves (3–7)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCustomShelves((v) => Math.max(3, v - 1))}
                      className="min-h-[36px] min-w-[36px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono-tabular text-sm font-bold flex-1 text-center text-[var(--kq-text)]">
                      {customShelves}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomShelves((v) => Math.min(7, v + 1))}
                      className="min-h-[36px] min-w-[36px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="block text-[11px] text-[var(--kq-text-muted)] mb-1">
                    Facings (3–8)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCustomFacings((v) => Math.max(3, v - 1))}
                      className="min-h-[36px] min-w-[36px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono-tabular text-sm font-bold flex-1 text-center text-[var(--kq-text)]">
                      {customFacings}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomFacings((v) => Math.min(8, v + 1))}
                      className="min-h-[36px] min-w-[36px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--kq-text-muted)] mb-1">
                  Door Hardware Type
                </label>
                <select
                  value={hardwareType}
                  onChange={(e) => setHardwareType(e.target.value as DoorHardwareType)}
                  className="w-full min-h-[40px] px-3 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)]"
                >
                  {Object.entries(HARDWARE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Drinks Carried at This Store */}
          <div>
            <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-2">
              Beverage Categories Carried at Store
            </label>
            <div className="space-y-1.5">
              {DRINK_CATEGORY_OPTIONS.map((cat) => {
                const active = categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`w-full min-h-[40px] px-3 py-2 rounded-lg border text-left text-xs transition-colors flex items-center justify-between ${
                      active
                        ? 'bg-[var(--kq-emerald-soft)] border-[var(--kq-emerald)] text-[var(--kq-text)]'
                        : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border)] text-[var(--kq-text-muted)]'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="font-mono-tabular text-[11px] font-semibold">
                      {active ? 'Included' : 'Off'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--kq-border)]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)]"
            >
              Create Store Layout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* 2. Cooler Door Hardware & Dimension Editor Modal */
interface DoorLayoutEditorModalProps {
  open: boolean;
  onClose: () => void;
  doors: CoolerDoor[];
  activeDoorId: string;
  onUpdateDoorLayout: (
    doorId: string,
    patch: {
      label: string;
      category: string;
      hardwareType: DoorHardwareType;
      shelvesCount: number;
      facingsPerShelf: number;
      defaultMaxDepth: number;
    }
  ) => void;
  onAddDoor: (payload: {
    label: string;
    category: string;
    hardwareType: DoorHardwareType;
    shelvesCount: number;
    facingsPerShelf: number;
    defaultMaxDepth: number;
  }) => void;
  onDeleteDoor: (doorId: string) => void;
}

export const DoorLayoutEditorModal: React.FC<DoorLayoutEditorModalProps> = ({
  open,
  onClose,
  doors,
  activeDoorId,
  onUpdateDoorLayout,
  onAddDoor,
  onDeleteDoor,
}) => {
  const activeDoor = doors.find((d) => d.id === activeDoorId) ?? doors[0];
  const [mode, setMode] = useState<'edit' | 'add'>('edit');

  const [label, setLabel] = useState(activeDoor.label);
  const [category, setCategory] = useState(activeDoor.category);
  const [hardwareType, setHardwareType] = useState<DoorHardwareType>(activeDoor.hardwareType);
  const [shelvesCount, setShelvesCount] = useState(activeDoor.shelves.length);
  const [facingsPerShelf, setFacingsPerShelf] = useState(activeDoor.facingsPerShelf);
  const [defaultMaxDepth, setDefaultMaxDepth] = useState(activeDoor.defaultMaxDepth);

  React.useEffect(() => {
    if (open && mode === 'edit' && activeDoor) {
      setLabel(activeDoor.label);
      setCategory(activeDoor.category);
      setHardwareType(activeDoor.hardwareType);
      setShelvesCount(activeDoor.shelves.length);
      setFacingsPerShelf(activeDoor.facingsPerShelf);
      setDefaultMaxDepth(activeDoor.defaultMaxDepth);
    }
  }, [open, mode, activeDoor]);

  if (!open) return null;

  const switchMode = (next: 'edit' | 'add') => {
    setMode(next);
    if (next === 'add') {
      const nextNum = String(doors.length + 1).padStart(2, '0');
      setLabel(`Door ${nextNum} · Custom Cooler Bay`);
      setCategory('Specialty & Singles');
      setHardwareType('standard-glass');
      setShelvesCount(5);
      setFacingsPerShelf(6);
      setDefaultMaxDepth(6);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'edit') {
      onUpdateDoorLayout(activeDoor.id, {
        label: label.trim() || activeDoor.label,
        category: category.trim() || activeDoor.category,
        hardwareType,
        shelvesCount,
        facingsPerShelf,
        defaultMaxDepth,
      });
    } else {
      onAddDoor({
        label: label.trim() || `Door ${doors.length + 1}`,
        category: category.trim() || 'Beverage Bay',
        hardwareType,
        shelvesCount,
        facingsPerShelf,
        defaultMaxDepth,
      });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg glacier-hud rounded-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--kq-border)] pb-3">
          <h2 className="text-base font-display font-bold text-[var(--kq-text)]">
            Cooler Door Geometry &amp; Hardware
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]"
            aria-label="Close layout editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)]">
          <button
            type="button"
            onClick={() => switchMode('edit')}
            className={`flex-1 min-h-[36px] rounded text-xs font-semibold transition-colors ${
              mode === 'edit'
                ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)]'
                : 'text-[var(--kq-text-secondary)]'
            }`}
          >
            Edit Door {activeDoor.number}
          </button>
          <button
            type="button"
            onClick={() => switchMode('add')}
            className={`flex-1 min-h-[36px] rounded text-xs font-semibold transition-colors ${
              mode === 'add'
                ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)]'
                : 'text-[var(--kq-text-secondary)]'
            }`}
          >
            + Add New Cooler Door
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
              Door Label
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                Cooler Form Factor
              </label>
              <select
                value={hardwareType}
                onChange={(e) => setHardwareType(e.target.value as DoorHardwareType)}
                className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)]"
              >
                {Object.entries(HARDWARE_LABELS).map(([k, txt]) => (
                  <option key={k} value={k}>
                    {txt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-[var(--kq-surface-muted)] p-3.5 rounded-lg border border-[var(--kq-border)]">
            <div>
              <span className="block text-[11px] text-[var(--kq-text-muted)] mb-1">
                Shelves (3–7)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShelvesCount((v) => Math.max(3, v - 1))}
                  className="min-h-[38px] min-w-[38px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono-tabular text-sm font-bold flex-1 text-center text-[var(--kq-text)]">
                  {shelvesCount}
                </span>
                <button
                  type="button"
                  onClick={() => setShelvesCount((v) => Math.min(7, v + 1))}
                  className="min-h-[38px] min-w-[38px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <span className="block text-[11px] text-[var(--kq-text-muted)] mb-1">
                Facings (3–8)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFacingsPerShelf((v) => Math.max(3, v - 1))}
                  className="min-h-[38px] min-w-[38px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono-tabular text-sm font-bold flex-1 text-center text-[var(--kq-text)]">
                  {facingsPerShelf}
                </span>
                <button
                  type="button"
                  onClick={() => setFacingsPerShelf((v) => Math.min(8, v + 1))}
                  className="min-h-[38px] min-w-[38px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <span className="block text-[11px] text-[var(--kq-text-muted)] mb-1">
                Depth (4–10)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDefaultMaxDepth((v) => Math.max(4, v - 1))}
                  className="min-h-[38px] min-w-[38px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono-tabular text-sm font-bold flex-1 text-center text-[var(--kq-text)]">
                  {defaultMaxDepth}
                </span>
                <button
                  type="button"
                  onClick={() => setDefaultMaxDepth((v) => Math.min(10, v + 1))}
                  className="min-h-[38px] min-w-[38px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--kq-border)]">
            {mode === 'edit' && doors.length > 1 ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteDoor(activeDoor.id);
                  onClose();
                }}
                className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[var(--kq-crimson-soft)] border border-[var(--kq-crimson)] text-[var(--kq-crimson-text)] text-xs font-semibold flex items-center gap-1.5 hover:opacity-90"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Door
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)]"
              >
                {mode === 'edit' ? 'Apply Door Layout' : 'Add Cooler Door'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* 3. Add Custom Beverage SKU Modal */
interface AddCustomSkuModalProps {
  open: boolean;
  onClose: () => void;
  onCreateSku: (sku: SkuItem) => void;
  initialUpc?: string;
  pickedImageUrl?: string;
  onClearPickedImage?: () => void;
  onOpenImagePicker?: () => void;
}

const COLOR_PRESETS = [
  { label: 'Cobalt', primary: '#0F172A', secondary: '#0284C7', brand: '#0284C7' },
  { label: 'Crimson', primary: '#DC2626', secondary: '#FFFFFF', brand: '#E41E2B' },
  { label: 'Lime', primary: '#1E293B', secondary: '#5AC500', brand: '#5AC500' },
  { label: 'Coral', primary: '#F8FAFC', secondary: '#FF6A39', brand: '#FF6A39' },
  { label: 'Violet', primary: '#F3E8FF', secondary: '#9333EA', brand: '#A855F7' },
  { label: 'Amber', primary: '#FEF3C7', secondary: '#F59E0B', brand: '#F59E0B' },
];

export const AddCustomSkuModal: React.FC<AddCustomSkuModalProps> = ({
  open,
  onClose,
  onCreateSku,
  initialUpc = '',
  pickedImageUrl = '',
  onClearPickedImage,
  onOpenImagePicker,
}) => {
  const [name, setName] = useState('');
  const [brandLabel, setBrandLabel] = useState('');
  const [skuCode, setSkuCode] = useState('');
  const [upc, setUpc] = useState(initialUpc);
  const [size, setSize] = useState('12 oz');
  const [containerType, setContainerType] = useState<ContainerType>('tall-can');
  const [price, setPrice] = useState('3.49');
  const [backroomQty, setBackroomQty] = useState('24');
  const [colorIdx, setColorIdx] = useState(0);

  React.useEffect(() => {
    if (open) {
      setUpc(initialUpc || '');
    }
  }, [open, initialUpc]);

  if (!open) return null;

  const chosenColors = COLOR_PRESETS[colorIdx] ?? COLOR_PRESETS[0];
  const previewSku: SkuItem = {
    id: 'preview',
    skuCode: skuCode.trim().toUpperCase() || 'CST-001',
    name: name.trim() || 'Custom Drink SKU',
    shortName: (name.trim() || 'Custom Drink').slice(0, 14),
    brand: 'custom',
    brandLabel: brandLabel.trim() || 'House Brand',
    brandColor: chosenColors.brand,
    size: size.trim() || '12 oz',
    containerType,
    price: Number(price) || 3.49,
    weeklyVelocity: 35,
    marginPct: 44,
    backroomQty: Math.max(0, Number(backroomQty) || 24),
    parLevel: 36,
    primaryColor: chosenColors.primary,
    secondaryColor: chosenColors.secondary,
    capColor: chosenColors.brand,
    upc: upc.trim() || undefined,
    imageUrl: pickedImageUrl || undefined,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = `sku-custom-${Date.now()}`;
    onCreateSku({
      ...previewSku,
      id,
      skuCode:
        skuCode.trim().toUpperCase() ||
        `CST-${String(Math.floor(100 + Math.random() * 899))}`,
      upc: upc.trim() || undefined,
      imageUrl: pickedImageUrl || undefined,
    });
    setName('');
    setBrandLabel('');
    setSkuCode('');
    setUpc('');
    onClearPickedImage?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg glacier-hud rounded-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--kq-border)] pb-3">
          <h2 className="text-base font-display font-bold text-[var(--kq-text)]">
            Add Custom Drink to Store Catalog
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-16 rounded bg-[var(--kq-cabinet)] border border-[var(--kq-border)] flex items-center justify-center shrink-0">
                <BeverageVisual sku={previewSku} size="md" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono-tabular text-[var(--kq-accent)] font-semibold">
                  {previewSku.skuCode} · {previewSku.size}
                </div>
                <div className="text-sm font-semibold text-[var(--kq-text)] truncate">
                  {previewSku.name}
                </div>
                <div className="text-xs text-[var(--kq-text-muted)]">
                  {previewSku.brandLabel} · ${previewSku.price.toFixed(2)}
                </div>
              </div>
            </div>

            {onOpenImagePicker && (
              <div className="flex items-center gap-1.5 shrink-0">
                {pickedImageUrl && onClearPickedImage && (
                  <button
                    type="button"
                    onClick={onClearPickedImage}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text-secondary)]"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenImagePicker}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Images className="w-3.5 h-3.5" />
                  {pickedImageUrl ? 'Change Photo' : 'Image Library'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                Drink Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Topo Chico Sabores Lime"
                className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                Brand
              </label>
              <input
                type="text"
                value={brandLabel}
                onChange={(e) => setBrandLabel(e.target.value)}
                placeholder="e.g., Topo Chico"
                className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                Size
              </label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm font-mono-tabular text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                Retail ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm font-mono-tabular text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                Backroom Qty
              </label>
              <input
                type="number"
                min="0"
                value={backroomQty}
                onChange={(e) => setBackroomQty(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm font-mono-tabular text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                Container
              </label>
              <select
                value={containerType}
                onChange={(e) => setContainerType(e.target.value as ContainerType)}
                className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)]"
              >
                <option value="tall-can">Tall Slim Can</option>
                <option value="can">Standard Can</option>
                <option value="bottle">PET Bottle</option>
                <option value="glass-bottle">Glass Bottle</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                UPC Barcode
              </label>
              <input
                type="text"
                value={upc}
                onChange={(e) => setUpc(e.target.value)}
                placeholder="e.g. 049000000443"
                className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-mono-tabular text-[var(--kq-text)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                SKU Code
              </label>
              <input
                type="text"
                value={skuCode}
                onChange={(e) => setSkuCode(e.target.value)}
                placeholder="Optional (auto)"
                className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-mono-tabular text-[var(--kq-text)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1.5">
              Package Colorway
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((c, idx) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setColorIdx(idx)}
                  className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs flex items-center gap-2 ${
                    colorIdx === idx
                      ? 'bg-[var(--kq-surface-elevated)] border-[var(--kq-accent)] text-[var(--kq-text)] font-semibold'
                      : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border)] text-[var(--kq-text-secondary)]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: c.brand }}
                    aria-hidden="true"
                  />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--kq-border)]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)]"
            >
              Save Drink to Catalog
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
