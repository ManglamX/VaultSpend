import type { Bill } from '../types';
import { db } from '../db/schema';
import { encryptedPut, encryptedGetAll } from '../crypto/storage';
import { LocalNotifications } from '@capacitor/local-notifications';

export async function getBills(profileId: number): Promise<Bill[]> {
  return encryptedGetAll<Bill>(
    db.bills,
    (r) => r.profileId === profileId
  );
}

export async function addBill(data: Omit<Bill, 'id'>): Promise<number> {
  const id = await encryptedPut(db.bills, data, {
    profileId: data.profileId,
    dueDate: data.dueDate,
  });
  
  // Schedule notification
  await scheduleBillNotification(id, data);
  
  return id;
}

export async function updateBill(id: number, data: Omit<Bill, 'id'>): Promise<number> {
  const result = await encryptedPut(db.bills, data, {
    id,
    profileId: data.profileId,
    dueDate: data.dueDate,
  });
  
  // Reschedule notification
  await LocalNotifications.cancel({ notifications: [{ id }] });
  if (!data.isPaid) {
    await scheduleBillNotification(id, data);
  }
  
  return result;
}

export async function deleteBill(id: number): Promise<void> {
  await db.bills.delete(id);
  await LocalNotifications.cancel({ notifications: [{ id }] });
}

async function scheduleBillNotification(id: number, bill: Omit<Bill, 'id'>) {
  if (bill.isPaid) return;

  const now = new Date();
  
  const notifications = [];

  // 1. On Due Date (at 9 AM)
  const onDue = new Date(bill.dueDate);
  onDue.setHours(9, 0, 0, 0);
  if (onDue > now) {
    notifications.push({
      title: 'Bill Due Today',
      body: `Your payment for ${bill.name} (${bill.amount}) is due today!`,
      id: id * 10 + 1,
      schedule: { at: onDue },
      extra: { billId: id }
    });
  }

  // 2. Week Before
  if (bill.notifyOption === 'week_before') {
    const weekBefore = new Date(bill.dueDate);
    weekBefore.setDate(weekBefore.getDate() - 7);
    weekBefore.setHours(9, 0, 0, 0);
    if (weekBefore > now) {
      notifications.push({
        title: 'Bill Due in 7 Days',
        body: `${bill.name} (${bill.amount}) is due in a week.`,
        id: id * 10 + 2,
        schedule: { at: weekBefore },
        extra: { billId: id }
      });
    }
  }

  // 3. Daily Reminders (Simplify to 3 days before up to due date)
  if (bill.notifyOption === 'daily') {
     // For simplicity in this demo, notify every day for the last 3 days
     for(let i=1; i<=3; i++) {
        const reminder = new Date(bill.dueDate);
        reminder.setDate(reminder.getDate() - i);
        reminder.setHours(10, 0, 0, 0);
        if (reminder > now) {
            notifications.push({
                title: 'Upcoming Bill Reminder',
                body: `${bill.name} is due in ${i} days.`,
                id: id * 100 + i,
                schedule: { at: reminder },
                extra: { billId: id }
            });
        }
     }
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}
