import React, { useState } from 'react';
import {
  IonContent, IonHeader, IonPage, IonToolbar, IonList, IonItem, IonLabel,
  useIonAlert, useIonToast, IonSpinner, IonToggle, IonActionSheet, IonAlert
} from '@ionic/react';
import {
  Lock, Download, Info, ShieldCheck, Key, Trash2, Repeat, List, Coins,
  FileSpreadsheet, Check, WalletCards, TrendingUp, Users, User
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useDateStore } from '../../store/dateStore';
import { useSettingsStore } from '../../store/settingsStore';
import { unlockWithPin, setupPin } from '../../services/authService';
import { getAllExpenses } from '../../services/expenseService';
import { db } from '../../db/schema';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { format } from 'date-fns';
import { exportToXLSX } from '../export/xlsxExport';
import BackupRestoreUI from '../export/BackupRestoreUI';
import { useProfileStore } from '../../store/profileStore';
import CategoryManager from './CategoryManager';
import FixedExpensesManager from './FixedExpensesManager';
import IncomeSourceManager from './IncomeSourceManager';
function SettingItem({ icon: IconComponent, iconColor, title, subtitle, onClick, badge, toggle, danger }: {
  icon: any; iconColor: string; title: string; subtitle?: string;
  onClick?: () => void; badge?: React.ReactNode; toggle?: React.ReactNode; danger?: boolean;
}) {
  return (
    <div style={{
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      marginBottom: '0.625rem',
      border: '1px solid var(--vs-border)',
      background: danger ? 'var(--danger-900)' : 'var(--vs-surface)',
    }}>
      <IonItem button={!!onClick} detail={!!onClick && !toggle} onClick={onClick} lines="none" style={{
        '--background': 'transparent',
        '--padding-start': '1rem', '--padding-end': '1rem',
        '--inner-padding-end': '0.5rem',
      }}>
        <div slot="start" style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', flexShrink: 0, marginRight: '0.75rem', background: `${iconColor}1F`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconComponent style={{ color: danger ? 'var(--danger-400)' : iconColor, width: 20, height: 20, strokeWidth: 1.5 }} />
        </div>
        <IonLabel>
          <p style={{ color: danger ? 'var(--danger-500)' : 'var(--stone-900)', fontWeight: 600, margin: 0, fontSize: 'var(--text-body)' }}>{title}</p>
          {subtitle && <p style={{ color: 'var(--stone-500)', fontSize: 'var(--text-caption)', margin: '2px 0 0' }}>{subtitle}</p>}
        </IonLabel>
        {toggle ? <div slot="end" onClick={e => e.stopPropagation()}>{toggle}</div> : (badge && <div slot="end">{badge}</div>)}
      </IonItem>
    </div>
  );
}

// ── Change PIN Modal ──────────────────────────────────────────────────────────
function ChangePinFlow({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
  const [step, setStep]       = useState<'old' | 'new' | 'confirm'>('old');
  const [newPin, setNewPin]   = useState('');
  const [input, setInput]     = useState('');
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);

  const handleSubmit = async () => {
    if (input.length < 4) { setError('PIN must be at least 4 digits.'); return; }
    setSaving(true); setError('');
    try {
      if (step === 'old') {
        const { success } = await unlockWithPin(input);
        if (!success) { setError('Incorrect current PIN.'); setSaving(false); return; }
        setInput(''); setStep('new');
      } else if (step === 'new') {
        setNewPin(input); setInput(''); setStep('confirm');
      } else {
        if (input !== newPin) { setError('PINs do not match.'); setInput(''); setStep('new'); setSaving(false); return; }
        await setupPin(input);
        onSuccess();
      }
    } catch { setError('Something went wrong.'); }
    finally { setSaving(false); }
  };

  const labels: Record<string, string> = { old: 'Enter current PIN', new: 'Enter new PIN (4–6 digits)', confirm: 'Confirm new PIN' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ color: 'var(--vs-muted)', fontSize: '0.9rem', textAlign: 'center' }}>{labels[step]}</p>
      <input
        type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6}
        value={input} onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
        placeholder="••••••"
        style={{ background: 'var(--vs-surface)', border: '1px solid var(--vs-border)', borderRadius: 'var(--radius-xl)', padding: '1rem', color: 'var(--vs-text)', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.5rem', width: '100%', outline: 'none' }}
      />
      {error && <p style={{ color: 'var(--danger-500)', textAlign: 'center', fontSize: 'var(--text-caption)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--vs-border)', background: 'transparent', color: 'var(--stone-600)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSubmit} disabled={saving || input.length < 4} style={{ flex: 2, padding: '0.9rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--primary-600)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: input.length < 4 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          {saving ? <IonSpinner name="crescent" style={{ width: 18, height: 18 }} /> : step === 'confirm' ? <><Check size={18} /> Update PIN</> : 'Next →'}
        </button>
      </div>
    </div>
  );
}

// ── Main Settings Component ───────────────────────────────────────────────────
const Settings: React.FC = () => {
  const { setLocked } = useAuthStore();
  const { expenses }  = useExpenseStore();
  const { viewDate }  = useDateStore();
  const { 
    currency, setCurrency,
    screenshotsEnabled, setScreenshotsEnabled 
  } = useSettingsStore();
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();
  const [showChangePin, setShowChangePin] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showIncomeSources, setShowIncomeSources] = useState(false);
  const [showFixed, setShowFixed] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [xlsxBusy, setXlsxBusy] = useState(false);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const [showNewProfile, setShowNewProfile] = useState(false);
  const { activeProfileId, profiles, setActiveProfileId, setProfiles } = useProfileStore();

  const doExport = async (data: typeof expenses, filename: string) => {
    try {
      const header = 'Id,Amount,Category,Note,Date';
      const rows = data.map((e) =>
        `${e.id},${e.amount},"${e.categoryName ?? e.categoryId}","${e.note.replace(/"/g, '""')}",${new Date(e.date).toISOString()}`
      );
      const csv = [header, ...rows].join('\n');
      
      if (Capacitor.isNativePlatform()) {
        // Convert string to base64 safely
        const base64 = btoa(unescape(encodeURIComponent(csv)));
        const result = await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Cache,
        });
        await Share.share({ title: 'VaultSpend CSV Export', url: result.uri });
      } else {
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: filename });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
      presentToast({ message: `${rows.length} records exported`, duration: 2000, color: 'success', position: 'bottom' });
    } catch { presentToast({ message: 'Export failed', duration: 2000, color: 'danger' }); }
  };

  const handleExportMonth = () => {
    doExport(expenses, `vaultspend_${format(viewDate, 'MMM_yyyy')}.csv`);
  };

  const handleExportAll = async () => {
    if (!activeProfileId) return;
    const allData = await getAllExpenses(activeProfileId);
    doExport(allData, `vaultspend_all_time_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportXLSX = async (scope: 'month' | 'year' | 'all') => {
    setXlsxBusy(true);
    try {
      if (scope === 'month') {
        const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getTime();
        const end   = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
        await exportToXLSX(activeProfileId || 1, { from: start, to: end }, `vaultspend_month_${format(viewDate, 'MMM_yyyy')}.xlsx`);
      } else if (scope === 'year') {
        const start = new Date(viewDate.getFullYear(), 0, 1).getTime();
        const end   = new Date(viewDate.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
        await exportToXLSX(activeProfileId || 1, { from: start, to: end }, `vaultspend_year_${viewDate.getFullYear()}.xlsx`);
      } else {
        await exportToXLSX(activeProfileId || 1, undefined, `vaultspend_all_time_${new Date().toISOString().slice(0, 10)}.xlsx`);
      }
      presentToast({ message: 'Excel file downloaded!', duration: 2500, color: 'success', position: 'bottom' });
    } catch {
      presentToast({ message: 'Excel export failed', duration: 2000, color: 'danger' });
    } finally { setXlsxBusy(false); }
  };

  const confirmExportXLSX = () => presentAlert({
    header: 'Export Excel (.xlsx)',
    message: '5-sheet Excel file: Transactions, Income, Bills, Monthly Summary, Net Savings.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: `Month (${format(viewDate, 'MMM')})`, handler: () => handleExportXLSX('month') },
      { text: `Year (${viewDate.getFullYear()})`,  handler: () => handleExportXLSX('year') },
      { text: 'All Time History',  handler: () => handleExportXLSX('all') },
    ],
  });

  const confirmExport = () => presentAlert({
    header: 'Export Expenses', message: 'Decrypted CSV downloads are readable by anyone.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: `Current Month (${format(viewDate, 'MMM')})`, handler: handleExportMonth },
      { text: 'All Time History', handler: handleExportAll }
    ],
  });

  const confirmLock = () => presentAlert({
    header: 'Lock VaultSpend', message: 'Session key will be cleared. PIN required to re-enter.',
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Lock', handler: () => setLocked(true) }],
  });

  const confirmWipe = () => presentAlert({
    header: '⚠️ Wipe ALL Data',
    message: 'This permanently deletes EVERYTHING. This CANNOT be undone. Type "CLEAR" to confirm.',
    inputs: [{ name: 'confirmText', type: 'text', placeholder: 'Type CLEAR' }],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'DELETE EVERYTHING',
        role: 'destructive',
        handler: async (data) => {
          if (data.confirmText !== 'CLEAR') {
            presentToast({ message: 'Wipe cancelled: Confirmation text mismatch', duration: 2000, color: 'warning' });
            return;
          }
          try {
            await db.delete();
            presentToast({ message: 'All data wiped', duration: 2000, color: 'warning' });
            setTimeout(() => window.location.reload(), 1500);
          } catch {
            presentToast({ message: 'Wipe failed', duration: 2000, color: 'danger' });
          }
        },
      },
    ],
  });

  const SectionLabel = ({ label }: { label: string }) => (
    <p style={{ color: 'var(--vs-muted)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '1.25rem 0 0.625rem 0.5rem' }}>{label}</p>
  );

  return (
    <IonPage className="vs-page-enter">
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': 'transparent', '--border-style': 'none' }}>
          <div style={{ padding: '1rem 1.25rem 0.5rem', paddingTop: 'calc(env(safe-area-inset-top, 20px) + 1rem)' }}>
            <p style={{ color: 'var(--stone-500)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 0.2rem' }}>Configuration</p>
            <h1 style={{ color: 'var(--vs-text)', fontSize: '1.8rem', margin: '0 0 1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Settings</h1>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: '0.5rem 1rem', paddingBottom: '5rem' }}>

          {/* Change PIN */}
          {showChangePin && (
            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', border: '1px solid var(--vs-border)', marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--stone-900)', margin: '0 0 1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} color="var(--primary-600)" /> Change PIN
              </h3>
              <ChangePinFlow 
                onSuccess={() => { 
                  setShowChangePin(false); 
                  presentToast({ message: 'PIN updated!', duration: 2000, color: 'success' }); 
                }} 
                onCancel={() => setShowChangePin(false)} 
              />
            </div>
          )}

          <SectionLabel label="Preferences" />
          <IonList style={{ background: 'transparent', padding: 0 }}>
            <SettingItem icon={Users} iconColor="var(--primary-600)" title="Switch Profile" subtitle={`Active: ${profiles.find(p => p.id === activeProfileId)?.name || 'Default'}`} onClick={() => setShowProfileSwitcher(true)} />
            <SettingItem icon={Coins} iconColor="#10b981" title="Currency" subtitle={`Current: ${currency}`} onClick={() => {
              presentAlert({
                header: 'Select Currency',
                inputs: [
                  { label: 'INR (₹)', type: 'radio', value: '₹', checked: currency === '₹' },
                  { label: 'USD ($)', type: 'radio', value: '$', checked: currency === '$' },
                  { label: 'EUR (€)', type: 'radio', value: '€', checked: currency === '€' },
                  { label: 'GBP (£)', type: 'radio', value: '£', checked: currency === '£' }
                ],
                buttons: [
                  { text: 'Cancel', role: 'cancel' },
                  { text: 'Save', handler: (v) => setCurrency(v) }
                ]
              });
            }} />
          </IonList>

          <SectionLabel label="Security" />
          <IonList style={{ background: 'transparent', padding: 0 }}>
            <SettingItem icon={Lock} iconColor="var(--accent-500)" title="Lock App Now" subtitle="Clear key from memory" onClick={confirmLock} />
            <SettingItem icon={Key} iconColor="var(--primary-600)" title="Change PIN" subtitle="Requires current PIN" onClick={() => setShowChangePin((v) => !v)} />

            <SettingItem 
              icon={ShieldCheck} 
              iconColor="var(--accent-500)" 
              title="Privacy Mode" 
              subtitle="Block screenshots & app switcher"
              toggle={
                <IonToggle 
                  checked={!screenshotsEnabled} 
                  onIonChange={e => setScreenshotsEnabled(!e.detail.checked)}
                  style={{ '--track-background-checked': 'var(--primary-500)' }}
                />
              }
            />

            <SettingItem icon={Info} iconColor="var(--primary-600)" title="Encryption" subtitle="AES-256-GCM · PBKDF2 310k"
              badge={<span style={{ fontSize: '0.75rem', background: 'rgba(47,130,83,0.15)', color: 'var(--primary-600)', borderRadius: 'var(--radius-full)', padding: '0.2rem 0.6rem', fontWeight: 600 }}>Active</span>} />
          </IonList>

          <SectionLabel label="Data Management" />
          <IonList style={{ background: 'transparent', padding: 0 }}>
            <SettingItem icon={List} iconColor="#3b82f6" title="Expense Categories" subtitle="Customize labels & icons" onClick={() => setShowCategories(true)} />
            <SettingItem icon={TrendingUp} iconColor="#10b981" title="Income Sources" subtitle="Manage where money comes from" onClick={() => setShowIncomeSources(true)} />
            <SettingItem icon={Repeat} iconColor="#8b5cf6" title="Fixed Expenses" subtitle="Recurring monthly bills" onClick={() => setShowFixed(true)} />
            <SettingItem icon={Download} iconColor="#5E8F7A" title="Export CSV" subtitle="Decrypted snapshot · current or all time" onClick={confirmExport} />
            <SettingItem icon={FileSpreadsheet} iconColor="var(--primary-600)" title={xlsxBusy ? 'Exporting…' : 'Export Excel (.xlsx)'} subtitle="5 sheets: Transactions, Income, Summary…" onClick={confirmExportXLSX} />
            <SettingItem icon={Lock} iconColor="var(--accent-500)" title="Encrypted Backup / Restore" subtitle="AES-256 encrypted .vaultspend.enc file" onClick={() => setShowBackup(v => !v)} />
          </IonList>

          {/* Backup/Restore inline panel */}
          {showBackup && (
            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', border: '1px solid var(--vs-border)', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
              <BackupRestoreUI onClose={() => setShowBackup(false)} />
            </div>
          )}

          <SectionLabel label="Danger Zone" />
          <IonList style={{ background: 'transparent', padding: 0 }}>
            <SettingItem icon={Trash2} iconColor="var(--danger-500)" title="Wipe All Data" subtitle="Permanently delete everything" onClick={confirmWipe} danger />
          </IonList>

          <SectionLabel label="About" />
          <IonList style={{ background: 'transparent', padding: 0 }}>
            <SettingItem icon={Info} iconColor="#706C61" title="VaultSpend" subtitle="v1.0.0 · Privacy-first expense tracker"
              badge={<WalletCards size={24} color="var(--primary-600)" strokeWidth={1} />} />
          </IonList>

          <div style={{ margin: '2rem 0', padding: '1.25rem', borderRadius: 'var(--radius-xl)', background: 'var(--primary-900)', border: '1px solid var(--primary-500)', textAlign: 'center' }}>
            <p style={{ color: '#fff', fontWeight: 700, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Lock size={16} /> 100% On-Device
            </p>
            <p style={{ color: 'var(--primary-500)', fontSize: 'var(--text-micro)', margin: 0 }}>Your data never leaves this device.<br />No accounts, no servers, no cloud.</p>
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem', opacity: 0.8 }}>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.75rem' }}>Developed By</p>
            <a 
              href="https://github.com/ManglamX" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'var(--vs-elevated)', border: '1px solid var(--vs-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--stone-900)' }}>
                <User size={22} strokeWidth={1.5} />
              </div>
              <span style={{ color: 'var(--stone-900)', fontWeight: 700, fontSize: '0.95rem' }}>Manglam Jaiswal</span>
              <span style={{ color: 'var(--primary-600)', fontSize: 'var(--text-micro)', fontWeight: 500 }}>@ManglamX</span>
            </a>
          </div>
        </div>

        <CategoryManager isOpen={showCategories} onClose={() => setShowCategories(false)} profileId={activeProfileId || 1} />
        <IncomeSourceManager isOpen={showIncomeSources} onClose={() => setShowIncomeSources(false)} profileId={activeProfileId || 1} />
        <FixedExpensesManager isOpen={showFixed} onClose={() => setShowFixed(false)} profileId={activeProfileId || 1} />

        {/* Profile Switcher ActionSheet */}
        <IonActionSheet
          isOpen={showProfileSwitcher}
          onDidDismiss={() => setShowProfileSwitcher(false)}
          header="Switch Profile"
          buttons={[
            ...profiles.map(p => ({
              text: p.name + (p.id === activeProfileId ? ' (Active)' : ''),
              handler: () => setActiveProfileId(p.id)
            })),
            {
              text: 'Create New Profile...',
              icon: 'add',
              handler: () => setShowNewProfile(true)
            },
            {
              text: 'Cancel',
              role: 'cancel'
            }
          ]}
        />

        <IonAlert
          isOpen={showNewProfile}
          onDidDismiss={() => setShowNewProfile(false)}
          header="New Profile"
          message="Enter profile name"
          inputs={[{ name: 'name', type: 'text', placeholder: 'e.g. Travel' }]}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { 
              text: 'Create', 
              handler: async (data) => {
                if (!data.name) return;
                const { addProfile, getProfiles } = await import('../../services/profileService');
                const { seedDefaultCategories } = await import('../../services/categoryService');
                const { seedDefaultIncomeCategories } = await import('../../services/incomeCategoryService');
                const newId = await addProfile({ name: data.name, currency: '₹' });
                await seedDefaultCategories(newId);
                await seedDefaultIncomeCategories(newId);
                const all = await getProfiles();
                setProfiles(all);
                setActiveProfileId(newId);
              } 
            }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default Settings;
