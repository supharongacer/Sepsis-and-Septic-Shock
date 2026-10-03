import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

export interface SavedAuditRecord {
  id: string;
  userId: string;
  userEmail?: string;
  an: string;
  hn: string;
  patientName: string;
  pdx: string;
  verdict: 'PASS' | 'WARNING' | 'DENY';
  ruleId?: string;
  primaryIssue?: string;
  estimatedClaim: number;
  atRiskClaim: number;
  secondaryDxCount: number;
  complicationCount: number;
  comorbidCount: number;
  auditNotes?: string;
  createdAt?: any;
  updatedAt?: any;
}

const COLLECTION_NAME = 'audit_records';

export async function saveAuditRecordToFirebase(record: Omit<SavedAuditRecord, 'userId' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('กรุณาลงชื่อเข้าใช้ด้วย Google เพื่อบันทึกผลการตรวจสอบลงฐานข้อมูล Cloud');
  }

  const recordDocRef = doc(db, COLLECTION_NAME, record.id);
  const dataToSave = {
    ...record,
    userId: user.uid,
    userEmail: user.email || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(recordDocRef, dataToSave);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${record.id}`);
  }
}

export async function deleteAuditRecordFromFirebase(recordId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('กรุณาลงชื่อเข้าใช้ก่อนลบรายการ');
  }

  const docRef = doc(db, COLLECTION_NAME, recordId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${recordId}`);
  }
}

export function subscribeToUserAuditRecords(
  userId: string,
  onRecordsUpdated: (records: SavedAuditRecord[]) => void,
  onError?: (err: any) => void
) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records: SavedAuditRecord[] = [];
      snapshot.forEach((docSnap) => {
        records.push({
          ...(docSnap.data() as SavedAuditRecord),
          id: docSnap.id,
        });
      });
      onRecordsUpdated(records);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  );
}
