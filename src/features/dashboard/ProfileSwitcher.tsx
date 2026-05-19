import React, { useState } from 'react';
import { IonActionSheet, IonAlert, useIonToast } from '@ionic/react';
import { useProfileStore } from '../../store/profileStore';
import { addProfile, getProfiles } from '../../services/profileService';
import { seedDefaultCategories } from '../../services/categoryService';
import { seedDefaultIncomeCategories } from '../../services/incomeCategoryService';
import { Plus } from 'lucide-react';

export const ProfileSwitcher: React.FC = () => {
  const { activeProfileId, profiles, setActiveProfileId, setProfiles } = useProfileStore();
  const [showPicker, setShowPicker] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [presentToast] = useIonToast();

  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const initials = activeProfile?.name.slice(0, 2).toUpperCase() || 'VS';

  const handleCreateProfile = async (name: string) => {
    if (!name.trim()) return;
    try {
      const newId = await addProfile({ name: name.trim(), currency: '₹' });
      await seedDefaultCategories(newId);
      await seedDefaultIncomeCategories(newId);
      
      const all = await getProfiles();
      setProfiles(all);
      setActiveProfileId(newId);
      presentToast({ message: `Profile '${name}' created!`, duration: 2000, color: 'success' });
    } catch {
      presentToast({ message: 'Failed to create profile.', duration: 2000, color: 'danger' });
    }
  };

  const buttons = profiles.map((p) => ({
    text: p.name,
    role: p.id === activeProfileId ? 'selected' : undefined,
    handler: () => {
      setActiveProfileId(p.id);
    },
  }));

  buttons.push({
    text: 'Create New Profile...',
    icon: Plus,
    handler: () => setShowAdd(true),
  } as any);

  buttons.push({
    text: 'Cancel',
    role: 'cancel',
    handler: () => {},
  } as any);

  return (
    <>
      <button
        aria-label="Switch User Profile"
        onClick={() => setShowPicker(true)}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--primary-600)',
          border: '1px solid var(--primary-300)',
          color: '#fff', fontWeight: 700, fontSize: '0.9rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0,
        }}
      >
        {initials}
      </button>

      <IonActionSheet
        isOpen={showPicker}
        onDidDismiss={() => setShowPicker(false)}
        header="Switch User Profile"
        buttons={buttons}
      />

      <IonAlert
        isOpen={showAdd}
        onDidDismiss={() => setShowAdd(false)}
        header="New Profile"
        message="Enter a name for your new vault profile (e.g. 'Business' or 'Travel')"
        inputs={[{ name: 'name', type: 'text', placeholder: 'Profile Name' }]}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          { text: 'Create', handler: (data) => handleCreateProfile(data.name) }
        ]}
      />
    </>
  );
};
