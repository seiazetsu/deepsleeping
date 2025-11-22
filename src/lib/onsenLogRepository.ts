// src/lib/onsenLogRepository.ts
"use client";

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { OnsenLog, OnsenLogInput } from "@/types/onsenLog";

const COLLECTION_NAME = "onsenLogs";

type OnsenLogDoc = {
  date: string;
  onsenName: string;
  sleepScore: number;
  memo?: string;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  photoUrl?: string | null;
  createdAt?: Timestamp;
};

export async function addOnsenLog(input: OnsenLogInput) {
  const db = getDb();
  const ref = collection(db, COLLECTION_NAME);

  await addDoc(ref, {
    date: input.date,
    onsenName: input.onsenName,
    sleepScore: Number(input.sleepScore),
    memo: input.memo ?? "",
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    rating: input.rating ?? null,
    photoUrl: input.photoUrl ?? null,
    createdAt: serverTimestamp(),
  });
}

export function subscribeOnsenLogs(
  callback: (logs: OnsenLog[]) => void
) {
  const db = getDb();
  const ref = collection(db, COLLECTION_NAME);
  const q = query(ref, orderBy("createdAt", "desc"), limit(100));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data: OnsenLog[] = snapshot.docs.map((doc) => {
      const d = doc.data() as OnsenLogDoc;
      return {
        id: doc.id,
        date: d.date,
        onsenName: d.onsenName,
        sleepScore: d.sleepScore,
        memo: d.memo ?? "",
        lat: d.lat ?? undefined,
        lng: d.lng ?? undefined,
        rating: d.rating ?? undefined,
        photoUrl: d.photoUrl ?? undefined,
        createdAt: d.createdAt as Timestamp,
      };
    });
    callback(data);
  });

  return unsubscribe;
}
