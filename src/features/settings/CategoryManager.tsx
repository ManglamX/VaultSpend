import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import {
  IonModal, IonContent, IonSpinner, IonSkeletonText
} from '@ionic/react';
import { X, Plus, Save, Edit2, icons } from 'lucide-react';
import type { Category } from '../../types';
import {
  getCategories, addCategory, updateCategory, deleteCategory,
} from '../../services/categoryService';
import { useExpenseStore } from '../../store/expenseStore';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: number;
}

const PRESET_COLORS = ['#D97A46','#5E8F7A','#9A5E4E','#A34343','#2F8253','#C68032','#706C61','#55605A','#B85C38','#4A5D23','#E63946','#8A9A5B'];
const PRESET_ICONS  = ['Coffee','Car','ShoppingBag','Film','Pill','Zap','Home','Book','Smile','Package','Plane','Music','Monitor','Dog','Shirt','Gamepad2','Coins','Wrench','Droplet','Gift'];

const renderIcon = (name: string, color?: string, size = 20) => {
  const IconCmp = (icons as any)[name] || icons.Package;
  return <IconCmp size={size} color={color} strokeWidth={1.5} />;
};

const CategoryManager: React.FC<CategoryManagerProps> = ({ isOpen, onClose, profileId }) => {
  const { loadCategories } = useExpenseStore();
  const [cats, setCats]   = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);

  const [fName,  setFName]  = useState('');
  const [fIcon,  setFIcon]  = useState('Package');
  const [fColor, setFColor] = useState('#64748b');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await getCategories(profileId);
    setCats(data);
    setLoading(false);
  };

  const resetForm = () => { setFName(''); setFIcon('Package'); setFColor('#64748b'); setFormError(''); };

  const openNew = () => { setEditCat(null); resetForm(); setShowForm(true); };
  const openEdit = (cat: Category) => {
    setEditCat(cat); setFName(cat.name); setFIcon(cat.icon); setFColor(cat.color);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!fName.trim()) { setFormError('Enter a category name.'); return; }
    setSaving(true);
    try {
      const data = { name: DOMPurify.sanitize(fName.trim()), icon: fIcon, color: fColor, profileId };
      if (editCat) await updateCategory(editCat.id, data);
      else await addCategory(data);
      await load();
      await loadCategories(profileId);
      setShowForm(false); resetForm();
    } catch { setFormError('Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (cat: Category) => {
    if (cat.isDefault) return; // protect defaults
    await deleteCategory(cat.id);
    setCats((prev) => prev.filter((c) => c.id !== cat.id));
    await loadCategories(profileId);
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} onIonModalDidPresent={load} initialBreakpoint={0.85} breakpoints={[0, 0.85, 1]} style={{ '--backdrop-opacity': 0.5 }}>
      <IonContent className="force-dark">
        <div style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: 'calc(env(safe-area-inset-top, 1rem) + 0.5rem)' }}>
          <div style={{ width: 40, height: 4, background: 'var(--stone-700)', borderRadius: 2, margin: '0 auto' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
            <h2 style={{ color: 'var(--vs-text)', margin: 0, fontWeight: 700, fontSize: 'var(--text-h2)' }}>Categories</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={openNew} style={{ background: 'var(--primary-900)', border: '1px solid var(--primary-500)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary-400)' }}>
                <Plus size={20} strokeWidth={2} />
              </button>
              <button onClick={onClose} style={{ background: 'var(--vs-surface)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={20} color="var(--vs-muted)" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        {showForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ color: 'var(--vs-text)', margin: 0, fontSize: 'var(--text-h3)' }}>{editCat ? 'Edit Category' : 'New Category'}</h3>

            {/* Name */}
            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
              <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Name</p>
              <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="e.g. Gaming"
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--vs-text)', fontSize: '1.15rem', width: '100%', fontFamily: 'inherit' }} />
            </div>

            {/* Icon Picker */}
            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
              <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem' }}>Icon</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {PRESET_ICONS.map((icon) => (
                  <button key={icon} onClick={() => setFIcon(icon)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: `2px solid ${fIcon === icon ? 'var(--primary-500)' : 'transparent'}`,
                    background: fIcon === icon ? 'var(--primary-900)' : 'var(--vs-elevated)',
                    color: fIcon === icon ? 'var(--primary-400)' : 'var(--vs-muted)',
                  }}>{renderIcon(icon, undefined, 24)}</button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
              <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem' }}>Color</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {PRESET_COLORS.map((color) => (
                  <button key={color} onClick={() => setFColor(color)} style={{
                    width: '2.5rem', height: '2.5rem', borderRadius: '50%', cursor: 'pointer',
                    background: color, border: `3px solid ${fColor === color ? '#fff' : 'transparent'}`,
                    boxShadow: fColor === color ? `0 0 0 2px ${color}` : 'none',
                  }} />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: `${fColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {renderIcon(fIcon, fColor, 24)}
              </div>
              <div>
                <p style={{ color: fColor, fontWeight: 700, margin: 0 }}>{fName || 'Category Name'}</p>
                <p style={{ color: 'var(--vs-muted)', fontSize: '0.8rem', margin: 0 }}>Preview</p>
              </div>
            </div>

            {formError && <p style={{ color: 'var(--danger-500)', textAlign: 'center', fontSize: 'var(--text-caption)', margin: 0 }}>{formError}</p>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={{ flex: 1, padding: '0.9rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--vs-border)', background: 'transparent', color: 'var(--vs-muted)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '0.9rem', borderRadius: 'var(--radius-xl)', border: 'none', background: 'var(--primary-600)', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {saving ? <IonSpinner name="crescent" style={{ width: 18, height: 18 }} /> : (editCat ? <><Edit2 size={18} /> Update</> : <><Save size={18} /> Save</>)}
              </button>
            </div>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '0.9rem 1rem', border: `1px solid var(--vs-border)`, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-lg)', margin: 0 }} />
                <div style={{ flex: 1 }}>
                  <IonSkeletonText animated style={{ width: '50%', height: '16px', borderRadius: '4px', marginBottom: '4px' }} />
                  <IonSkeletonText animated style={{ width: '30%', height: '12px', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {cats.map((cat) => (
              <div key={cat.id} style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '0.9rem 1rem', border: `1px solid var(--vs-border)`, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: `${cat.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {renderIcon(cat.icon, cat.color, 22)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--vs-text)', fontWeight: 600, margin: 0 }}>{cat.name}</p>
                  {cat.isDefault && <p style={{ color: 'var(--vs-muted)', fontSize: '0.75rem', margin: 0 }}>Default</p>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => openEdit(cat)} style={{ background: 'var(--vs-elevated)', border: 'none', borderRadius: 8, padding: '0.35rem 0.7rem', color: 'var(--vs-text)', cursor: 'pointer', fontSize: 'var(--text-micro)' }}>Edit</button>
                  {!cat.isDefault && (
                    <button onClick={() => handleDelete(cat)} style={{ background: 'var(--danger-900)', border: 'none', borderRadius: 8, padding: '0.35rem 0.7rem', color: 'var(--danger-400)', cursor: 'pointer', fontSize: 'var(--text-micro)' }}>Del</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default CategoryManager;
