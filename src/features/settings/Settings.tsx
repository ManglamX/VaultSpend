import React, { useState } from 'react';
import {
  IonContent, IonHeader, IonPage, IonToolbar, IonList, IonItem, IonLabel,
  IonModal, useIonAlert, useIonToast, IonSpinner, IonToggle, IonActionSheet, IonAlert
} from '@ionic/react';
import {
  Lock, Download, Info, ShieldCheck, Key, Trash2, Repeat, List, Coins,
  FileSpreadsheet, Check, WalletCards, TrendingUp, Users, User, ChevronLeft, ChevronRight, X, AlertTriangle
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
import { format, subMonths, addMonths } from 'date-fns';
import { exportToXLSX } from '../export/xlsxExport';
import BackupRestoreUI from '../export/BackupRestoreUI';
import { useProfileStore } from '../../store/profileStore';
import CategoryManager from './CategoryManager';
import FixedExpensesManager from './FixedExpensesManager';
import IncomeSourceManager from './IncomeSourceManager';
import PinGateModal from '../../components/PinGateModal';
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
  // Excel PIN gate + picker
  const [showXlsxPinGate, setShowXlsxPinGate] = useState(false);
  const [showXlsxPicker, setShowXlsxPicker]   = useState(false);
  const [xlsxPickerDate, setXlsxPickerDate]   = useState(new Date());
  // Wipe PIN gate + confirm sheet
  const [showWipePinGate, setShowWipePinGate] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [wipeText, setWipeText]               = useState('');
  // Lock confirmation & CSV picker sheets
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showCsvPicker, setShowCsvPicker]     = useState(false);
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

  const handleExportXLSX = async (scope: 'month' | 'year' | 'all', customDate?: Date) => {
    setXlsxBusy(true);
    const d = customDate ?? viewDate;
    try {
      if (scope === 'month') {
        const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
        await exportToXLSX(activeProfileId || 1, { from: start, to: end }, `vaultspend_${format(d, 'MMM_yyyy')}.xlsx`);
      } else if (scope === 'year') {
        const start = new Date(d.getFullYear(), 0, 1).getTime();
        const end   = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
        await exportToXLSX(activeProfileId || 1, { from: start, to: end }, `vaultspend_year_${d.getFullYear()}.xlsx`);
      } else {
        await exportToXLSX(activeProfileId || 1, undefined, `vaultspend_all_time_${new Date().toISOString().slice(0, 10)}.xlsx`);
      }
      presentToast({ message: 'Excel file downloaded!', duration: 2500, color: 'success', position: 'bottom' });
    } catch {
      presentToast({ message: 'Excel export failed', duration: 2000, color: 'danger' });
    } finally { setXlsxBusy(false); setShowXlsxPicker(false); }
  };

  // Step 1: open PIN gate
  const confirmExportXLSX = () => setShowXlsxPinGate(true);

  // Step 2: after PIN verified, show the picker
  const handleXlsxPinVerified = () => {
    setShowXlsxPinGate(false);
    setXlsxPickerDate(viewDate);
    setShowXlsxPicker(true);
  };

  const confirmExport = () => setShowCsvPicker(true);

  const confirmLock = () => setShowLockConfirm(true);

  // Wipe: Step 1 — open PIN gate
  const confirmWipe = () => {
    setWipeText('');
    setShowWipePinGate(true);
  };
  // Wipe: Step 2 — PIN verified, show typed confirmation
  const handleWipePinVerified = () => {
    setShowWipePinGate(false);
    setWipeText('');
    setShowWipeConfirm(true);
  };
  // Wipe: Step 3 — execute
  const handleWipeExecute = async () => {
    if (wipeText !== 'WIPE') {
      presentToast({ message: 'Type WIPE exactly to confirm', duration: 2000, color: 'warning' });
      return;
    }
    try {
      setShowWipeConfirm(false);
      await db.delete();
      presentToast({ message: 'All data wiped', duration: 2000, color: 'warning' });
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      presentToast({ message: 'Wipe failed', duration: 2000, color: 'danger' });
    }
  };

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

        {/* Excel PIN gate */}
        <PinGateModal
          isOpen={showXlsxPinGate}
          title="Verify Your Identity"
          subtitle="Enter your app PIN to export financial data"
          onVerified={handleXlsxPinVerified}
          onCancel={() => setShowXlsxPinGate(false)}
        />

        {/* Excel period picker */}
        <IonModal isOpen={showXlsxPicker} onDidDismiss={() => setShowXlsxPicker(false)} initialBreakpoint={0.65} breakpoints={[0, 0.65]} style={{ '--backdrop-opacity': 0.6 }}>
          <IonContent className="force-dark">
            <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ width: 40, height: 4, background: 'var(--stone-700)', borderRadius: 2, margin: '0 auto 0.5rem' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: 'var(--vs-text)', margin: 0, fontWeight: 850, fontSize: '1.35rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileSpreadsheet size={22} color="#10b981" /> Export Excel
                </h2>
                <button onClick={() => setShowXlsxPicker(false)} style={{ background: 'var(--vs-surface)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderStyle: 'solid', borderWidth: 1, borderColor: 'var(--vs-border)' }}>
                  <X size={18} color="var(--vs-muted)" strokeWidth={2} />
                </button>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-xl)', padding: '0.85rem 1rem' }}>
                <p style={{ color: '#10b981', fontSize: 'var(--text-micro)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>Features Included</p>
                <p style={{ color: 'var(--vs-text)', fontSize: '0.82rem', margin: 0, lineHeight: 1.5, opacity: 0.8 }}>
                  Generates an Excel workbook containing: <strong>Transactions, Income, Recurring Bills, Monthly Category Totals, Net Savings, & Percentage growth.</strong>
                </p>
              </div>

              {/* Month picker */}
              <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1.1rem', border: '1px solid var(--vs-border)', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.1)' }}>
                <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.75rem', letterSpacing: '0.05em' }}>Target Period</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button onClick={() => setXlsxPickerDate(d => subMonths(d, 1))} style={{ background: 'var(--vs-elevated)', border: '1px solid var(--vs-border)', borderRadius: 'var(--radius-xl)', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <ChevronLeft size={20} color="var(--vs-text)" />
                  </button>
                  <span style={{ color: 'var(--vs-text)', fontWeight: 800, fontSize: '1.15rem' }}>{format(xlsxPickerDate, 'MMMM yyyy')}</span>
                  <button onClick={() => setXlsxPickerDate(d => addMonths(d, 1))} disabled={addMonths(xlsxPickerDate, 1) > new Date()} style={{ background: 'var(--vs-elevated)', border: '1px solid var(--vs-border)', borderRadius: 'var(--radius-xl)', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: addMonths(xlsxPickerDate, 1) > new Date() ? 0.3 : 1 }}>
                    <ChevronRight size={20} color="var(--vs-text)" />
                  </button>
                </div>
              </div>

              {/* Export buttons */}
              <button onClick={() => handleExportXLSX('month', xlsxPickerDate)} disabled={xlsxBusy} style={{ width: '100%', padding: '1.1rem', borderRadius: 'var(--radius-xl)', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontWeight: 800, fontSize: 'var(--text-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', opacity: xlsxBusy ? 0.6 : 1 }}>
                {xlsxBusy ? <IonSpinner name="crescent" style={{ width: 20, height: 20, color: '#fff' }} /> : <><FileSpreadsheet size={18} /> Download Excel for {format(xlsxPickerDate, 'MMM yyyy')}</>}
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => handleExportXLSX('year', xlsxPickerDate)} disabled={xlsxBusy} style={{ flex: 1, padding: '0.95rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--vs-border)', background: 'var(--vs-surface)', color: 'var(--vs-text)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'background 0.1s' }}>
                  <FileSpreadsheet size={16} color="var(--primary-600)" /> Entire Year {xlsxPickerDate.getFullYear()}
                </button>
                <button onClick={() => handleExportXLSX('all')} disabled={xlsxBusy} style={{ flex: 1, padding: '0.95rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--vs-border)', background: 'var(--vs-surface)', color: 'var(--vs-text)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'background 0.1s' }}>
                  <FileSpreadsheet size={16} color="var(--primary-600)" /> Full History
                </button>
              </div>
            </div>
          </IonContent>
        </IonModal>

        {/* Wipe PIN gate */}
        <PinGateModal
          isOpen={showWipePinGate}
          title="Verify Your Identity"
          subtitle="Enter your PIN to proceed with data wipe"
          onVerified={handleWipePinVerified}
          onCancel={() => setShowWipePinGate(false)}
        />

        {/* Wipe final confirmation sheet */}
        <IonModal isOpen={showWipeConfirm} onDidDismiss={() => setShowWipeConfirm(false)} initialBreakpoint={0.65} breakpoints={[0, 0.65]} style={{ '--backdrop-opacity': 0.8 }}>
          <IonContent className="force-dark">
            <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div style={{ width: 40, height: 4, background: 'var(--stone-700)', borderRadius: 2, margin: '0 auto 0.5rem' }} />

              {/* Danger icon + title */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '0.25rem 0' }}>
                <div style={{ 
                  width: 60, height: 60, borderRadius: '50%', 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  border: '1.5px solid var(--danger-500)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(239, 68, 68, 0.25)'
                }}>
                  <Trash2 size={26} color="var(--danger-500)" strokeWidth={1.5} />
                </div>
                <h2 style={{ color: 'var(--vs-text)', fontWeight: 850, fontSize: '1.35rem', margin: 0, letterSpacing: '-0.02em' }}>Wipe All Data</h2>
                <p style={{ color: 'var(--vs-muted)', fontSize: '0.85rem', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
                  This will <strong style={{ color: 'var(--danger-500)' }}>permanently delete everything</strong> — all profiles, expenses, incomes, budgets, and keys.<br />
                  This operation is <strong style={{ color: 'var(--danger-500)' }}>completely irreversible</strong>.
                </p>
              </div>

              {/* Danger banner */}
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-xl)', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={18} color="var(--danger-500)" style={{ flexShrink: 0 }} />
                <p style={{ color: 'var(--danger-400)', fontSize: '0.82rem', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                  To proceed, type <code style={{ background: 'var(--danger-900)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>WIPE</code> in the field below.
                </p>
              </div>

              {/* WIPE text input */}
              <input
                value={wipeText}
                onChange={e => setWipeText(e.target.value)}
                placeholder="Type WIPE"
                autoComplete="off"
                style={{
                  background: 'var(--vs-surface)', border: `1.5px solid ${wipeText === 'WIPE' ? 'var(--danger-500)' : 'var(--vs-border)'}`,
                  borderRadius: 'var(--radius-xl)', padding: '1.1rem', color: wipeText === 'WIPE' ? 'var(--danger-500)' : 'var(--vs-text)',
                  fontSize: '1.2rem', fontWeight: 800, outline: 'none', width: '100%', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '0.2em',
                  transition: 'all 0.15s ease',
                  boxShadow: wipeText === 'WIPE' ? '0 0 10px rgba(239, 68, 68, 0.15)' : 'none'
                }}
              />

              {/* Action buttons */}
              <button
                onClick={handleWipeExecute}
                disabled={wipeText !== 'WIPE'}
                style={{
                  width: '100%', padding: '1.1rem', borderRadius: 'var(--radius-xl)', border: 'none',
                  background: wipeText === 'WIPE' ? 'var(--danger-600)' : 'var(--vs-elevated)',
                  color: wipeText === 'WIPE' ? '#fff' : 'var(--stone-500)',
                  fontWeight: 800, fontSize: 'var(--text-body)', cursor: wipeText === 'WIPE' ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  opacity: wipeText === 'WIPE' ? 1 : 0.5, transition: 'all 0.2s',
                  boxShadow: wipeText === 'WIPE' ? '0 4px 12px rgba(239, 68, 68, 0.25)' : 'none'
                }}
              >
                <Trash2 size={18} /> Confirm Destruction
              </button>
              <button onClick={() => setShowWipeConfirm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--vs-muted)', fontSize: 'var(--text-body)', cursor: 'pointer', padding: '0.5rem', textAlign: 'center', fontWeight: 600 }}>
                Cancel — Keep All Data
              </button>
            </div>
          </IonContent>
        </IonModal>

        {/* Lock app modal */}
        <IonModal isOpen={showLockConfirm} onDidDismiss={() => setShowLockConfirm(false)} initialBreakpoint={0.4} breakpoints={[0, 0.4]} style={{ '--backdrop-opacity': 0.6 }}>
          <IonContent className="force-dark">
            <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
              <div style={{ width: 40, height: 4, background: 'var(--stone-700)', borderRadius: 2, margin: '0 auto 0.5rem' }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', textAlign: 'center' }}>
                <div style={{ 
                  width: 56, height: 56, borderRadius: '50%', 
                  background: 'rgba(239, 104, 104, 0.12)', 
                  border: '1.5px solid var(--accent-500)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(239, 104, 104, 0.15)'
                }}>
                  <Lock size={24} color="var(--accent-500)" strokeWidth={1.5} />
                </div>
                <h2 style={{ color: 'var(--vs-text)', fontWeight: 850, fontSize: '1.3rem', margin: 0, letterSpacing: '-0.02em' }}>Lock VaultSpend?</h2>
                <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-caption)', margin: 0, padding: '0 1rem', lineHeight: 1.5 }}>
                  This will securely clear the encryption keys from local memory. You will need your PIN to re-unlock the app.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => setShowLockConfirm(false)} style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--vs-border)', background: 'var(--vs-surface)', color: 'var(--vs-text)', fontWeight: 700, fontSize: 'var(--text-body)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={() => { setShowLockConfirm(false); setLocked(true); }} style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-xl)', border: 'none', background: 'var(--accent-500)', color: '#fff', fontWeight: 800, fontSize: 'var(--text-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(239, 104, 104, 0.2)' }}>
                  <Lock size={16} /> Lock Now
                </button>
              </div>
            </div>
          </IonContent>
        </IonModal>

        {/* CSV export modal */}
        <IonModal isOpen={showCsvPicker} onDidDismiss={() => setShowCsvPicker(false)} initialBreakpoint={0.5} breakpoints={[0, 0.5]} style={{ '--backdrop-opacity': 0.6 }}>
          <IonContent className="force-dark">
            <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ width: 40, height: 4, background: 'var(--stone-700)', borderRadius: 2, margin: '0 auto 0.5rem' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: 'var(--vs-text)', margin: 0, fontWeight: 850, fontSize: '1.35rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Download size={22} color="var(--primary-500)" /> Export CSV
                </h2>
                <button onClick={() => setShowCsvPicker(false)} style={{ background: 'var(--vs-surface)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderStyle: 'solid', borderWidth: 1, borderColor: 'var(--vs-border)' }}>
                  <X size={18} color="var(--vs-muted)" strokeWidth={2} />
                </button>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-xl)', padding: '0.85rem 1rem' }}>
                <p style={{ color: 'var(--accent-500)', fontSize: 'var(--text-micro)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>Security Warning</p>
                <p style={{ color: 'var(--vs-text)', fontSize: '0.82rem', margin: 0, lineHeight: 1.5, opacity: 0.8 }}>
                  Decrypted CSV files do <strong>not</strong> contain password protection. Anyone who gets hold of this file can read your full financial transactions.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => { setShowCsvPicker(false); handleExportMonth(); }} style={{ width: '100%', padding: '1.1rem', borderRadius: 'var(--radius-xl)', border: 'none', background: 'var(--primary-600)', color: '#fff', fontWeight: 800, fontSize: 'var(--text-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Download size={18} /> Current Month ({format(viewDate, 'MMM yyyy')})
                </button>
                <button onClick={() => { setShowCsvPicker(false); handleExportAll(); }} style={{ width: '100%', padding: '1.1rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--vs-border)', background: 'var(--vs-surface)', color: 'var(--vs-text)', fontWeight: 700, fontSize: 'var(--text-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Download size={18} color="var(--primary-500)" /> All Time History (CSV)
                </button>
              </div>
            </div>
          </IonContent>
        </IonModal>

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
