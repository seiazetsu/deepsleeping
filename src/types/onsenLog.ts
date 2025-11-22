import { Timestamp } from "firebase/firestore";

export type OnsenLog = {
  id: string;
  date: string;
  onsenName: string;
  sleepScore: number;
  memo?: string;
  createdAt: Timestamp;
  lat?: number;
  lng?: number;
  rating?: number;
  photoUrl?: string;   // ★ 追加：写真URL
};

export type OnsenLogInput = {
  date: string;
  onsenName: string;
  sleepScore: number;
  memo?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  photoUrl?: string;   // ★ 追加
};
