// src/app/add/page.tsx
"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addOnsenLog } from "@/lib/onsenLogRepository";
import { getFirebaseStorage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AddOnsenLogPage() {
  const router = useRouter();

  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [onsenName, setOnsenName] = useState("");
  const [sleepScore, setSleepScore] = useState("");
  const [memo, setMemo] = useState("");
  const [rating, setRating] = useState<number>(3);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date || !onsenName || !sleepScore) {
      setError("日付・温泉名・睡眠スコアは必須です。");
      return;
    }

    const scoreNum = Number(sleepScore);
    if (Number.isNaN(scoreNum)) {
      setError("睡眠スコアは数値で入力してください。");
      return;
    }

    if (rating < 1 || rating > 5) {
      setError("評価は1〜5の範囲で指定してください。");
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. ジオコード取得
      let lat: number | undefined;
      let lng: number | undefined;

      try {
        const res = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ onsenName }),
        });

        if (res.ok) {
          const data = (await res.json()) as { lat: number; lng: number };
          if (!Number.isNaN(data.lat) && !Number.isNaN(data.lng)) {
            lat = data.lat;
            lng = data.lng;
          }
        } else {
          // 失敗しても lat/lng なしで続行
          await res.json().catch(() => ({}));
        }
      } catch (geoErr) {
        console.warn("[add] geocode error", geoErr);
      }

      // 2. 写真アップロード（あれば）
      let uploadedPhotoUrl: string | undefined;

      if (imageFile) {
        try {
          const resized = await resizeImageToWidth(imageFile, 600);
          const storage = getFirebaseStorage();
          const filePath = `onsenPhotos/${Date.now()}_${imageFile.name}`;
          const storageRef = ref(storage, filePath);
          const snap = await uploadBytes(storageRef, resized);
          uploadedPhotoUrl = await getDownloadURL(snap.ref);
        } catch (uploadErr) {
          console.warn("[add] image upload failed", uploadErr);
          // 写真だけ失敗してもログ保存は続ける
        }
      }

      // 3. Firestore 保存
      await addOnsenLog({
        date,
        onsenName: onsenName.trim(),
        sleepScore: scoreNum,
        memo: memo.trim() || undefined,
        rating,
        lat,
        lng,
        photoUrl: uploadedPhotoUrl,
      });

      // 4. 一覧に戻る
      router.push("/");
    } catch (err) {
      console.error("[add] failed", err);
      setError("登録に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "16px 16px 48px",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, #0f172a, #020617 60%)",
        color: "#e5e7eb",
      }}
    >
      <header
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            新規ログ作成
          </h1>
          <p
            style={{
              marginTop: "4px",
              fontSize: "13px",
              color: "#9ca3af",
            }}
          >
            温泉に入った日の睡眠ログを記録します。
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/")}
          style={{
            fontSize: "13px",
            borderRadius: "999px",
            border: "1px solid #4b5563",
            padding: "6px 12px",
            background: "transparent",
            color: "#e5e7eb",
            cursor: "pointer",
          }}
        >
          ← 戻る
        </button>
      </header>

      <section
        style={{
          borderRadius: "16px",
          background:
            "linear-gradient(135deg, #020617, #0b1120)",
          padding: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        }}
      >
        {/* プレビュー行 */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "16px",
              overflow: "hidden",
              backgroundColor: "#111827",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "13px",
              textAlign: "center",
              padding: "4px",
            }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={onsenName || "onsen photo"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <span>{onsenName || "新しい温泉"}</span>
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#9ca3af",
                marginBottom: "2px",
              }}
            >
              PREVIEW
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              {onsenName || "温泉名を入力してください"}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#9ca3af",
                marginTop: "2px",
              }}
            >
              日付: {date || "未設定"}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: "10px" }}
        >
          <label style={labelStyle}>
            <span style={labelTextStyle}>日付</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>温泉名</span>
            <input
              type="text"
              value={onsenName}
              onChange={(e) => setOnsenName(e.target.value)}
              placeholder="例）別府温泉"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>睡眠スコア</span>
            <input
              type="number"
              value={sleepScore}
              onChange={(e) => setSleepScore(e.target.value)}
              placeholder="例）85"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>温泉評価（★1〜5）</span>
            <StarRating
              value={rating}
              onChange={(v) => setRating(v)}
            />
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>写真（任意）</span>
            <input
              type="file"
              accept="image/*"
              style={inputStyle}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  setPreviewUrl(URL.createObjectURL(file));
                } else {
                  setImageFile(null);
                  setPreviewUrl("");
                }
              }}
            />
            <span
              style={{
                fontSize: "11px",
                color: "#9ca3af",
              }}
            >
              アップロード時に幅600pxに縮小されます。
            </span>
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>メモ</span>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="例）ビール1杯、23時就寝、朝までぐっすり"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </label>

          {error && (
            <p style={{ color: "#fecaca", fontSize: "12px" }}>
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "8px",
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/")}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: "999px",
                border: "1px solid #4b5563",
                backgroundColor: "transparent",
                color: "#e5e7eb",
                cursor: "pointer",
              }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                background:
                  "linear-gradient(135deg, #38bdf8, #6366f1)",
                color: "#fff",
                fontWeight: 600,
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "登録中..." : "登録する"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

/* 星評価コンポーネント（新規作成ページ用） */
type StarRatingProps = {
  value: number;
  onChange: (v: number) => void;
};

function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((v) => {
        const active = v <= value;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: "22px",
              padding: "0 2px",
              color: active ? "#fbbf24" : "#d1d5db",
            }}
          >
            {active ? "★" : "☆"}
          </button>
        );
      })}
    </div>
  );
}

/* 共通っぽいスタイル */
const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const labelTextStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#e5e7eb",
};

const inputStyle: React.CSSProperties = {
  borderRadius: "8px",
  border: "1px solid #4b5563",
  padding: "6px 8px",
  fontSize: "13px",
  outline: "none",
  backgroundColor: "#020617",
  color: "#e5e7eb",
};

/* 幅600pxに縮小するヘルパー */
async function resizeImageToWidth(
  file: File,
  maxWidth: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const scale = maxWidth / img.width;
      const width = maxWidth;
      const height = img.height * scale;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.8
      );
    };

    img.onerror = (e) => reject(e);
    img.src = URL.createObjectURL(file);
  });
}
