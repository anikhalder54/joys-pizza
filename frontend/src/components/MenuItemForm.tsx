import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Category, MenuItem, SizeOption } from '../types';
import { CATEGORIES, TAG_OPTIONS, pizzaSizes } from '../data/menu';
import { CloseIcon, PlusIcon, TrashIcon } from './Icons';
import SmartImage from './SmartImage';

export type Draft = Omit<MenuItem, 'id' | 'updatedAt'>;

const blank = (): Draft => ({
  name: '',
  category: 'Pizza',
  description: '',
  price: 0,
  image: '',
  tags: [],
  special: false,
  sizes: pizzaSizes(14.99),
  available: true,
});

const MAX_UPLOAD = 5 * 1024 * 1024; // matches the API's Uploads:MaxBytes

interface Props {
  initial?: MenuItem | null;
  onSave: (draft: Draft) => Promise<void>;
  onUpload: (file: File) => Promise<string>;
  onClose: () => void;
}

export default function MenuItemForm({ initial, onSave, onUpload, onClose }: Props) {
  const editing = !!initial;
  const [d, setD] = useState<Draft>(() => {
    if (!initial) return blank();
    const { id: _id, updatedAt: _u, ...rest } = initial;
    return { ...rest, tags: rest.tags ?? [], available: rest.available !== false };
  });
  const [priceText, setPriceText] = useState(initial ? String(initial.price) : '');
  const [useSizes, setUseSizes] = useState(initial ? !!initial.sizes?.length : true);
  const [customTag, setCustomTag] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const changeCategory = (c: Category) => {
    set('category', c);
    // New item: pizzas default to S/M/L sizes, everything else to a single price.
    if (!editing) setUseSizes(c === 'Pizza');
  };

  const sizes = d.sizes ?? [];
  const setSize = (i: number, patch: Partial<SizeOption>) =>
    set('sizes', sizes.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const toggleTag = (t: string) =>
    set('tags', d.tags?.includes(t) ? d.tags.filter((x) => x !== t) : [...(d.tags ?? []), t]);

  const addCustomTag = () => {
    const t = customTag.trim();
    if (t && !d.tags?.some((x) => x.toLowerCase() === t.toLowerCase())) set('tags', [...(d.tags ?? []), t]);
    setCustomTag('');
  };

  const onFile = async (f?: File) => {
    setUploadErr('');
    if (!f) return;
    if (!f.type.startsWith('image/')) return setUploadErr('Please choose an image file.');
    if (f.size > MAX_UPLOAD) return setUploadErr('Image is too large (max 5 MB).');
    setUploading(true);
    try {
      set('image', await onUpload(f));
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ---------- validation ----------
  const errors: Record<string, string> = {};
  if (!d.name.trim()) errors.name = 'Enter a name';
  if (d.description.trim().length < 10) errors.description = 'Add a short description (10+ characters)';
  if (useSizes) {
    if (sizes.length === 0) errors.sizes = 'Add at least one size';
    else if (sizes.some((s) => !s.label.trim() || !(s.price > 0))) errors.sizes = 'Every size needs a label and a price';
  } else if (!(Number(priceText) > 0)) errors.price = 'Enter a price greater than $0';
  const show = (k: string) => (submitted && errors[k] ? <span className="field-error">{errors[k]}</span> : null);
  const bad = (k: string) => (submitted && errors[k] ? 'invalid' : '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSaveErr('');
    if (Object.keys(errors).length) return;
    const cleanSizes = sizes.map((s) => ({ label: s.label.trim(), price: +(+s.price).toFixed(2) }));
    setSaving(true);
    try {
      await onSave({
      ...d,
      name: d.name.trim(),
      description: d.description.trim(),
      image: d.image.trim(),
      sizes: useSizes ? cleanSizes : undefined,
      price: useSizes ? Math.min(...cleanSizes.map((s) => s.price)) : +Number(priceText).toFixed(2),
      });
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Could not save.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-labelledby="item-form-title">
      <div className="scrim show" onClick={onClose} />
      <form className="modal" onSubmit={submit} noValidate>
        <header className="modal-head">
          <h2 id="item-form-title">{editing ? `Edit “${initial!.name}”` : 'Add a menu item'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        <div className="modal-body">
          <div className="item-form-grid">
            {/* ---- left column ---- */}
            <div className="stack">
              <label>
                Item name *
                <input ref={firstField} className={bad('name')} value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Hawaiian Pizza" />
                {show('name')}
              </label>

              <label>
                Category *
                <select value={d.category} onChange={(e) => changeCategory(e.target.value as Category)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>

              <label>
                Description *
                <textarea rows={3} className={bad('description')} value={d.description} onChange={(e) => set('description', e.target.value)} placeholder="Ingredients, how it's prepared, serving size…" />
                {show('description')}
              </label>

              {/* Pricing */}
              <fieldset className="fieldset">
                <legend>Pricing *</legend>
                <div className="seg small-seg">
                  <button type="button" className={!useSizes ? 'active' : ''} onClick={() => setUseSizes(false)}>Single price</button>
                  <button type="button" className={useSizes ? 'active' : ''} onClick={() => { setUseSizes(true); if (!sizes.length) set('sizes', pizzaSizes(Number(priceText) || 14.99)); }}>
                    Multiple sizes
                  </button>
                </div>

                {!useSizes ? (
                  <label className="price-input">
                    Price (USD)
                    <div className="input-prefix">
                      <span>$</span>
                      <input className={bad('price')} inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" />
                    </div>
                    {show('price')}
                  </label>
                ) : (
                  <div className="size-rows">
                    {sizes.map((s, i) => (
                      <div key={i} className="size-row">
                        <input value={s.label} onChange={(e) => setSize(i, { label: e.target.value })} placeholder='e.g. Large 16"' aria-label={`Size ${i + 1} label`} />
                        <div className="input-prefix">
                          <span>$</span>
                          <input
                            inputMode="decimal"
                            value={Number.isFinite(s.price) && s.price !== 0 ? s.price : ''}
                            onChange={(e) => setSize(i, { price: parseFloat(e.target.value.replace(/[^\d.]/g, '')) || 0 })}
                            placeholder="0.00"
                            aria-label={`Size ${i + 1} price`}
                          />
                        </div>
                        <button type="button" className="icon-btn" onClick={() => set('sizes', sizes.filter((_, j) => j !== i))} aria-label="Remove size">
                          <TrashIcon width={16} height={16} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-ghost-dark btn-sm add-size" onClick={() => set('sizes', [...sizes, { label: '', price: 0 }])}>
                      <PlusIcon width={14} height={14} /> Add size
                    </button>
                    {show('sizes')}
                  </div>
                )}
              </fieldset>
            </div>

            {/* ---- right column ---- */}
            <div className="stack">
              <div className="image-field">
                <span className="field-label">Photo</span>
                <div className="image-preview">
                  {d.image ? <SmartImage key={d.image} src={d.image} alt={d.name || 'Menu item'} /> : <span className="muted small">No photo yet</span>}
                </div>
                <input value={d.image} onChange={(e) => set('image', e.target.value)} placeholder="Paste an image URL (https://…) or upload" aria-label="Image URL" />
                <div className="row gap">
                  <button type="button" className="btn btn-outline btn-sm" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? 'Uploading…' : 'Upload photo'}</button>
                  {d.image && <button type="button" className="btn btn-ghost-dark btn-sm" onClick={() => set('image', '')}>Remove</button>}
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                </div>
                {uploadErr && <span className="field-error">{uploadErr}</span>}
              </div>

              <div>
                <span className="field-label">Tags</span>
                <div className="tag-picker">
                  {[...TAG_OPTIONS, ...(d.tags ?? []).filter((t) => !TAG_OPTIONS.includes(t))].map((t) => (
                    <button type="button" key={t} className={`tag-toggle ${d.tags?.includes(t) ? 'on' : ''}`} aria-pressed={!!d.tags?.includes(t)} onClick={() => toggleTag(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                <div className="custom-tag">
                  <input value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }} placeholder="Custom tag (e.g. Seasonal)" aria-label="Custom tag" />
                  <button type="button" className="btn btn-outline btn-sm" onClick={addCustomTag}>Add</button>
                </div>
              </div>

              <label className="check-row">
                <input type="checkbox" checked={!!d.special} onChange={(e) => set('special', e.target.checked)} />
                <span><strong>Chef's special</strong><small>Show in “Our Specials” on the home page</small></span>
              </label>

              <label className="check-row">
                <span className={`switch ${d.available ? 'on' : ''}`}>
                  <input type="checkbox" checked={!!d.available} onChange={(e) => set('available', e.target.checked)} />
                  <span />
                </span>
                <span>
                  <strong>{d.available ? 'Available' : 'Unavailable'}</strong>
                  <small>{d.available ? 'Customers can see and order this item' : 'Hidden from the website menu'}</small>
                </span>
              </label>
            </div>
          </div>
        </div>

        <footer className="modal-foot">
          {submitted && Object.keys(errors).length > 0 && <span className="field-error">Please fix the highlighted fields.</span>}
          {saveErr && <span className="field-error">{saveErr}</span>}
          <button type="button" className="btn btn-ghost-dark" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add to menu'}
          </button>
        </footer>
      </form>
    </div>
  );
}
