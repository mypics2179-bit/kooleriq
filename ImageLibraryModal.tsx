import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  ImagePlus,
  Images,
  Link2,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  CoolerDoor,
  ImageAsset,
  MediaAssetCategory,
  SkuItem,
} from '../types/kooleriq';

interface ImageLibraryModalProps {
  open: boolean;
  onClose: () => void;
  assets: ImageAsset[];
  doors: CoolerDoor[];
  skuCatalog: Record<string, SkuItem>;
  carriedSkuIds: string[];
  selectionMode?: 'manage' | 'pick-for-sku';
  onAddAsset: (asset: ImageAsset) => void;
  onDeleteAsset: (assetId: string) => void;
  onAssignToSku: (skuId: string, url: string) => void;
  onAssignToDoor: (doorId: string, url: string) => void;
  onPickUrl?: (url: string, title: string) => void;
}

const CATEGORY_LABELS: Record<'all' | MediaAssetCategory, string> = {
  all: 'All Media',
  'cooler-capture': 'Cooler Captures',
  'product-pack': 'Product Packs',
  'brand-signage': 'Brand & Signage',
};

async function compressImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        const maxSide = 880;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const ImageLibraryModal: React.FC<ImageLibraryModalProps> = ({
  open,
  onClose,
  assets,
  doors,
  skuCatalog,
  carriedSkuIds,
  selectionMode = 'manage',
  onAddAsset,
  onDeleteAsset,
  onAssignToSku,
  onAssignToDoor,
  onPickUrl,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | MediaAssetCategory>('all');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<MediaAssetCategory>('product-pack');
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [assignSkuId, setAssignSkuId] = useState<string>(carriedSkuIds[0] || '');
  const [assignDoorId, setAssignDoorId] = useState<string>(doors[0]?.id || '');
  const [brokenIds, setBrokenIds] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (categoryFilter !== 'all' && asset.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        asset.title.toLowerCase().includes(q) ||
        (asset.doorLabel || '').toLowerCase().includes(q) ||
        (asset.storeName || '').toLowerCase().includes(q) ||
        asset.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [assets, categoryFilter, search]);

  const selectedAsset = useMemo(
    () =>
      assets.find((a) => a.id === selectedAssetId) ??
      filteredAssets[0] ??
      null,
    [assets, selectedAssetId, filteredAssets]
  );

  const skuOptions = useMemo(() => {
    const carriedSet = new Set(carriedSkuIds);
    return Object.values(skuCatalog)
      .sort((a, b) => {
        const ac = carriedSet.has(a.id) ? 0 : 1;
        const bc = carriedSet.has(b.id) ? 0 : 1;
        if (ac !== bc) return ac - bc;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 120);
  }, [skuCatalog, carriedSkuIds]);

  if (!open) return null;

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    for (const file of Array.from(files).slice(0, 6)) {
      try {
        const dataUrl = await compressImageFileToDataUrl(file);
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
        const newAsset: ImageAsset = {
          id: `img-${Date.now()}-${Math.floor(Math.random() * 999)}`,
          title: cleanTitle || 'Uploaded Asset',
          category: uploadCategory,
          url: dataUrl,
          createdAtIso: new Date().toISOString(),
          tags: [uploadCategory, 'uploaded'],
        };
        onAddAsset(newAsset);
        setSelectedAssetId(newAsset.id);
      } catch {
        setUploadError(`Could not process image "${file.name}".`);
      }
    }
  };

  const handleAddUrlAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;
    const newAsset: ImageAsset = {
      id: `img-url-${Date.now()}`,
      title: urlTitle.trim() || 'Linked Beverage / Cooler Photo',
      category: uploadCategory,
      url: trimmedUrl,
      createdAtIso: new Date().toISOString(),
      tags: [uploadCategory, 'url'],
    };
    onAddAsset(newAsset);
    setSelectedAssetId(newAsset.id);
    setUrlInput('');
    setUrlTitle('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] overflow-y-auto glacier-hud rounded-xl p-5 sm:p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--kq-border)] pb-3.5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[var(--kq-accent)] font-semibold">
              <Images className="w-4 h-4" />
              <span>Image Library · {assets.length} Stored Assets</span>
            </div>
            <h2 className="text-lg font-display font-bold text-[var(--kq-text)] mt-0.5">
              Cooler Audit Captures, Product Packs &amp; Brand Media
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-lg text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:bg-[var(--kq-surface-muted)] flex items-center justify-center"
            aria-label="Close image library"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload / Add Bar */}
        <div className="rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-2.5">
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as MediaAssetCategory)}
              aria-label="Asset category"
              className="min-h-[40px] px-3 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)]"
            >
              <option value="product-pack">Product Pack Photo</option>
              <option value="cooler-capture">Cooler Door Capture</option>
              <option value="brand-signage">Brand &amp; Signage</option>
            </select>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleUploadFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <ImagePlus className="w-4 h-4" />
              Upload Photos
            </button>

            <form onSubmit={handleAddUrlAsset} className="flex-1 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                placeholder="Label (optional)"
                className="sm:w-40 min-h-[40px] px-3 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)]"
              />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Or paste https:// image URL..."
                className="flex-1 min-h-[40px] px-3 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)]"
              />
              <button
                type="submit"
                disabled={!urlInput.trim()}
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs font-semibold text-[var(--kq-text)] hover:border-[var(--kq-accent)] disabled:opacity-40 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Link2 className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                Add URL
              </button>
            </form>
          </div>

          {uploadError && (
            <div className="text-xs text-[var(--kq-crimson-text)]">{uploadError}</div>
          )}
        </div>

        {/* Search & Category Tabs */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--kq-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search image title, cooler door, or tag..."
              className="w-full min-h-[40px] pl-9 pr-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] overflow-x-auto">
            {(Object.keys(CATEGORY_LABELS) as Array<'all' | MediaAssetCategory>).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`min-h-[34px] px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold'
                    : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid + Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Asset Thumbnails */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
            {filteredAssets.length === 0 ? (
              <div className="col-span-full py-10 text-center text-xs text-[var(--kq-text-muted)]">
                No images in this category yet. Upload product photos or capture a cooler audit frame.
              </div>
            ) : (
              filteredAssets.map((asset) => {
                const isSelected = selectedAsset?.id === asset.id;
                const isBroken = brokenIds[asset.id];
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`rounded-xl border overflow-hidden text-left transition-colors bg-[var(--kq-surface-muted)] ${
                      isSelected
                        ? 'border-[var(--kq-accent)] ring-1 ring-[var(--kq-accent)]'
                        : 'border-[var(--kq-border)] hover:border-[var(--kq-border-strong)]'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-[var(--kq-cabinet)] flex items-center justify-center overflow-hidden">
                      {!isBroken ? (
                        <img
                          src={asset.url}
                          alt={asset.title}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setBrokenIds((prev) => ({ ...prev, [asset.id]: true }))
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400">
                          <Images className="w-6 h-6 mb-1 opacity-60" />
                          <span className="text-[10px] truncate max-w-full">{asset.title}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <div className="text-xs font-semibold text-[var(--kq-text)] truncate">
                        {asset.title}
                      </div>
                      <div className="text-[10px] font-mono-tabular text-[var(--kq-text-muted)] truncate mt-0.5">
                        {CATEGORY_LABELS[asset.category]}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Inspector & Assignment */}
          <div className="lg:col-span-5 rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-4 space-y-4">
            {selectedAsset ? (
              <>
                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[var(--kq-cabinet)] border border-[var(--kq-border)] flex items-center justify-center">
                  {!brokenIds[selectedAsset.id] ? (
                    <img
                      src={selectedAsset.url}
                      alt={selectedAsset.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-xs text-slate-400">Image preview unavailable</div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-semibold text-[var(--kq-text)]">
                    {selectedAsset.title}
                  </div>
                  <div className="text-[11px] font-mono-tabular text-[var(--kq-text-muted)]">
                    {CATEGORY_LABELS[selectedAsset.category]} ·{' '}
                    {new Date(selectedAsset.createdAtIso).toLocaleDateString()}
                    {selectedAsset.doorLabel ? ` · ${selectedAsset.doorLabel}` : ''}
                  </div>
                </div>

                {selectionMode === 'pick-for-sku' && onPickUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      onPickUrl(selectedAsset.url, selectedAsset.title);
                      onClose();
                    }}
                    className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Use This Image for Drink SKU
                  </button>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-[var(--kq-border)]">
                    {/* Attach to SKU */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-medium text-[var(--kq-text-secondary)]">
                        Assign as Product Pack Thumbnail
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={assignSkuId}
                          onChange={(e) => setAssignSkuId(e.target.value)}
                          className="flex-1 min-w-0 min-h-[38px] px-2.5 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)]"
                        >
                          {skuOptions.map((sku) => (
                            <option key={sku.id} value={sku.id}>
                              {sku.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (assignSkuId) onAssignToSku(assignSkuId, selectedAsset.url);
                          }}
                          className="min-h-[38px] px-3 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold whitespace-nowrap shrink-0"
                        >
                          Attach SKU
                        </button>
                      </div>
                    </div>

                    {/* Attach to Door */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-medium text-[var(--kq-text-secondary)]">
                        Set as Cooler Door Reference Frame
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={assignDoorId}
                          onChange={(e) => setAssignDoorId(e.target.value)}
                          className="flex-1 min-w-0 min-h-[38px] px-2.5 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)]"
                        >
                          {doors.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (assignDoorId) onAssignToDoor(assignDoorId, selectedAsset.url);
                          }}
                          className="min-h-[38px] px-3 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs font-semibold text-[var(--kq-text)] hover:border-[var(--kq-accent)] whitespace-nowrap shrink-0"
                        >
                          Attach Door
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--kq-border)]">
                  <a
                    href={selectedAsset.url}
                    download={`${selectedAsset.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text)] hover:border-[var(--kq-accent)] inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                    Download
                  </a>

                  {!selectedAsset.builtIn && (
                    <button
                      type="button"
                      onClick={() => onDeleteAsset(selectedAsset.id)}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[var(--kq-crimson-soft)] border border-[var(--kq-crimson)] text-[var(--kq-crimson-text)] text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-[var(--kq-text-muted)]">
                Select an image asset to inspect, download, or assign to a beverage SKU or cooler door.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
