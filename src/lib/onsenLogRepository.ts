// src/lib/onsenLogRepository.ts
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { OnsenLog } from "@/types/onsenLog";

export type OnsenLogInput = {
  date: string;
  onsenName: string;
  sleepScore: number;
  memo?: string;
  rating: number;
  lat?: number;
  lng?: number;
  photoUrl?: string;
};

// ★ 新規追加
export async function addOnsenLog(
  data: OnsenLogInput
): Promise<string> {
  const db = getDb();
  const colRef = collection(db, "onsenLogs");

  const payload: Partial<OnsenLogInput> & { createdAt: unknown } = {
    ...data,
    createdAt: serverTimestamp(),
  };

  Object.keys(payload).forEach((key) => {
    const k = key as keyof OnsenLogInput;
    if (payload[k] === undefined) {
      delete payload[k];
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docRef = await addDoc(colRef, payload as any);
  return docRef.id;
}

// ★ 1件取得
export async function getOnsenLogById(
  id: string
): Promise<OnsenLog | null> {
  const db = getDb();
  const ref = doc(db, "onsenLogs", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data() as Omit<OnsenLog, "id">;
  return { id: snap.id, ...data };
}

// ★ 更新
export async function updateOnsenLog(
  id: string,
  data: Partial<OnsenLogInput>
): Promise<void> {
  const db = getDb();
  const ref = doc(db, "onsenLogs", id);

  // ここは型を素直に Partial<OnsenLogInput> にする
  const payload: Partial<OnsenLogInput> = { ...data };

  // undefined を削除（Firestore が嫌うため）
  Object.keys(payload).forEach((key) => {
    const k = key as keyof OnsenLogInput;
    if (payload[k] === undefined) {
      delete payload[k];
    }
  });

  // 型は厳しすぎるのでここだけキャストする
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(ref, payload as any);
}


// ★ 一覧購読
export function subscribeOnsenLogs(
  callback: (logs: OnsenLog[]) => void
): () => void {
  const db = getDb();
  const colRef = collection(db, "onsenLogs");

  const q = query(
    colRef,
    orderBy("date", "desc"),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Omit<OnsenLog, "id">;
      return {
        id: docSnap.id,
        ...data,
      } as OnsenLog;
    });

    callback(logs);
  });

  return unsubscribe;
}
