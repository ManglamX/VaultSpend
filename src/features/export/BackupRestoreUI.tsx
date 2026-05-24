import React, { useState, useRef } from 'react';
import { IonSpinner, useIonToast } from '@ionic/react';
import { Cloud, Download, Lock, AlertTriangle, FileText, FolderOpen } from 'lucide-react';
import { createEncryptedBackup, restoreFromBackup } from './encryptedBackup';
import { useProfileStore } from '../../store/profileStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useIncomeStore } from '../../store/incomeStore';
import { useBudgetStore } from '../../store/budgetStore';
import { useBillStore } from '../../store/billStore';
import { useDateStore } from '../../store/dateStore';
import PinGateModal from '../../components/PinGateModal';

const BackupRestoreUI: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [tab, setTab] = useState<'backup' | 'restore'>('backup');
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm]       = useState('');
  const [busy, setBusy]             = useState(false);
  const [restorePass, setRestorePass] = useState('');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName]       = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [presentToast] = useIonToast();
  const { activeProfileId } = useProfileStore();

  // PIN gate state
  const [pinGateOpen, setPinGateOpen]           = useState(false);
  const [pendingAction, setPendingAction]       = useState<'backup' | 'restore' | null>(null);

  // ── PIN gate helpers ──────────────────────────────────────────────────────
  const requirePin = (action: 'backup' | 'restore') => {
    setPendingAction(action);
    setPinGateOpen(true);
  };

  const handlePinVerified = () => {
    setPinGateOpen(false);
    // Automatically execute the action the user intended
    if (pendingAction === 'backup') execBackup();
    if (pendingAction === 'restore') execRestore();
  };

  const handlePinCancel = () => {
    setPinGateOpen(false);
    setPendingAction(null);
  };

  // ── Core actions (only called after PIN verified) ─────────────────────────
  const execBackup = async () => {
    if (passphrase.length < 6) { presentToast({ message: 'Passphrase must be at least 6 characters', duration: 2500, color: 'warning' }); return; }
    if (passphrase !== confirm) { presentToast({ message: 'Passphrases do not match', duration: 2500, color: 'danger' }); return; }
    setBusy(true);
    try {
      if (!activeProfileId) throw new Error('No profile active');
      await createEncryptedBackup(activeProfileId, passphrase);
      presentToast({ message: 'Encrypted backup downloaded!', duration: 3000, color: 'success' });
      setPassphrase(''); setConfirm('');
      onClose();
    } catch (err: any) {
      presentToast({ message: err.message ?? 'Backup failed', duration: 3000, color: 'danger' });
    } finally { setBusy(false); }
  };

  const execRestore = async () => {
    if (!fileContent) { presentToast({ message: 'Select a .vaultspend.enc backup file first', duration: 2500, color: 'warning' }); return; }
    if (!restorePass) { presentToast({ message: 'Enter the backup passphrase', duration: 2500, color: 'warning' }); return; }
    setBusy(true);
    try {
      if (!activeProfileId) throw new Error('No profile active');
      const { message } = await restoreFromBackup(activeProfileId, fileContent, restorePass);

      const viewDate = useDateStore.getState().viewDate;
      await Promise.all([
        useExpenseStore.getState().loadExpenses(activeProfileId, viewDate),
        useExpenseStore.getState().loadCategories(activeProfileId),
        useIncomeStore.getState().loadIncome(activeProfileId, viewDate),
        useIncomeStore.getState().loadIncomeCategories(activeProfileId),
        useBudgetStore.getState().loadBudgets(activeProfileId),
        useBillStore.getState().loadBills(activeProfileId),
      ]);

      presentToast({ message, duration: 4000, color: 'success' });
      setRestorePass(''); setFileContent(null); setFileName('');
      setTimeout(onClose, 800);
    } catch (err: any) {
      presentToast({ message: err.message ?? 'Restore failed', duration: 3500, color: 'danger' });
    } finally { setBusy(false); }
  };

  // ── Button click handlers (trigger PIN gate) ──────────────────────────────
  const handleBackupClick = () => {
    if (passphrase.length < 6) { presentToast({ message: 'Passphrase must be at least 6 characters', duration: 2500, color: 'warning' }); return; }
    if (passphrase !== confirm) { presentToast({ message: 'Passphrases do not match', duration: 2500, color: 'danger' }); return; }
    requirePin('backup');
  };

  const handleRestoreClick = () => {
    if (!fileContent) { presentToast({ message: 'Select a .vaultspend.enc backup file first', duration: 2500, color: 'warning' }); return; }
    if (!restorePass) { presentToast({ message: 'Enter the backup passphrase', duration: 2500, color: 'warning' }); return; }
    requirePin('restore');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setFileContent(reader.result as string);
    reader.readAsText(file);
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--vs-surface)', border: '1px solid var(--vs-border)', borderRadius: 'var(--radius-xl)',
    padding: '1rem', color: 'var(--vs-text)', fontSize: '0.95rem', outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  const btnStyle = (color: string, disabled?: boolean): React.CSSProperties => ({
    width: '100%', padding: '1rem', borderRadius: 'var(--radius-xl)', border: 'none',
    background: disabled ? 'var(--vs-elevated)' : color,
    color: disabled ? 'var(--stone-500)' : '#fff', fontWeight: 700, fontSize: '1rem', cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    opacity: disabled ? 0.6 : 1,
  });

  return (
    <>
      <PinGateModal
        isOpen={pinGateOpen}
        title="Verify Your Identity"
        subtitle={`Enter your app PIN to ${pendingAction === 'backup' ? 'create a backup' : 'restore from backup'}`}
        onVerified={handlePinVerified}
        onCancel={handlePinCancel}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Tab selector */}
        <div style={{ display: 'flex', background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '0.25rem', border: '1px solid var(--vs-border)' }}>
          {(['backup', 'restore'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '0.65rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
              background: tab === t ? 'var(--stone-900)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--stone-600)', fontWeight: 600, fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              transition: 'all 0.15s ease'
            }}>
              {t === 'backup' ? <><Cloud size={16} /> Backup</> : <><Download size={16} /> Restore</>}
            </button>
          ))}
        </div>

        {tab === 'backup' ? (
          <>
            <div style={{ background: 'var(--primary-900)', border: '1px solid var(--primary-500)', borderRadius: 'var(--radius-xl)', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <Lock size={18} color="var(--primary-400)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: 'var(--primary-400)', fontSize: '0.82rem', margin: 0, lineHeight: 1.6 }}>
                Creates a fully encrypted <code>.vaultspend.enc</code> file. Your app PIN is required to authorise this. The backup itself is encrypted with a separate passphrase you set below.
              </p>
            </div>

            {[
              ['Backup Passphrase (min 6 chars)', passphrase, setPassphrase],
              ['Confirm Passphrase', confirm, setConfirm],
            ].map(([label, val, set]) => (
              <div key={label as string}>
                <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.4rem' }}>{label as string}</p>
                <input type="password" value={val as string} onChange={e => (set as (v: string) => void)(e.target.value)}
                  placeholder="••••••••" style={inputStyle} />
              </div>
            ))}

            <button onClick={handleBackupClick} disabled={busy || passphrase.length < 6 || passphrase !== confirm}
              style={btnStyle('var(--primary-600)', busy || passphrase.length < 6 || passphrase !== confirm)}>
              {busy ? <IonSpinner name="crescent" style={{ width: 20, height: 20 }} /> : <><Download size={18} /> Download Encrypted Backup</>}
            </button>
          </>
        ) : (
          <>
            <div style={{ background: 'var(--accent-900)', border: '1px solid var(--accent-500)', borderRadius: 'var(--radius-xl)', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={18} color="var(--accent-400)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: 'var(--accent-400)', fontSize: '0.82rem', margin: 0, lineHeight: 1.6 }}>
                Restoring merges data — it does <strong>not</strong> wipe existing records. Your app PIN is required to authorise this operation.
              </p>
            </div>

            <div>
              <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.4rem' }}>Backup File</p>
              <button onClick={() => fileRef.current?.click()} style={{
                width: '100%', padding: '1.2rem', borderRadius: 'var(--radius-xl)', border: '2px dashed var(--vs-border)',
                background: 'var(--vs-elevated)', color: 'var(--vs-muted)', cursor: 'pointer', textAlign: 'center', fontSize: '0.875rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
              }}>
                {fileName ? <><FileText size={24} color="var(--primary-500)" /> <span style={{ color: 'var(--vs-text)', fontWeight: 600 }}>{fileName}</span></> : <><FolderOpen size={24} /> Tap to select .vaultspend.enc file</>}
              </button>
              <input
                ref={fileRef}
                type="file"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            <div>
              <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.4rem' }}>Backup Passphrase</p>
              <input type="password" value={restorePass} onChange={e => setRestorePass(e.target.value)}
                placeholder="Enter backup passphrase" style={inputStyle} />
            </div>

            <button onClick={handleRestoreClick} disabled={busy || !fileContent || !restorePass}
              style={btnStyle('var(--primary-600)', busy || !fileContent || !restorePass)}>
              {busy ? <IonSpinner name="crescent" style={{ width: 20, height: 20 }} /> : <><Download size={18} /> Restore from Backup</>}
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default BackupRestoreUI;
