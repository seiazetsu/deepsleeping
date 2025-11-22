// src/app/page.tsx
"use client";

import type React from "react";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { addOnsenLog, subscribeOnsenLogs } from "@/lib/onsenLogRepository";
import type { OnsenLog } from "@/types/onsenLog";
import { getFirebaseStorage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type Tab = "logs" | "map";

// Leaflet マップはクライアント側のみ読み込む
const OnsenMap = dynamic(() => import("@/components/OnsenMap"), {
  ssr: false,
});

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("logs");
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [onsenName, setOnsenName] = useState("");
  const [sleepScore, setSleepScore] = useState("");
  const [memo, setMemo] = useState("");
  const [rating, setRating] = useState<number>(3);

  // 写真関連
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [logs, setLogs] = useState<OnsenLog[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const touchStartX = useRef<number | null>(null);

  const averageSleepScore = logs.length
  ? Math.round(
      logs.reduce((sum, log) => sum + (log.sleepScore || 0), 0) /
        logs.length
    )
  : null;

  useEffect(() => {
    const unsub = subscribeOnsenLogs((data) => {
      setLogs(data);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    console.log("[submit] start");

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
        console.log("[submit] call /api/geocode", onsenName);
        const res = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ onsenName }),
        });

        console.log("[submit] geocode status", res.status);
        if (res.ok) {
          const data = (await res.json()) as { lat: number; lng: number };
          console.log("[submit] geocode data", data);
          if (!Number.isNaN(data.lat) && !Number.isNaN(data.lng)) {
            lat = data.lat;
            lng = data.lng;
          }
        } else {
          const errJson = await res.json().catch(() => ({}));
          console.warn("[submit] geocode failed", res.status, errJson);
        }
      } catch (geoErr) {
        console.warn("[submit] geocode error", geoErr);
      }

      // 2. 写真アップロード（あれば）
      let uploadedPhotoUrl: string | undefined;

      if (imageFile) {
        try {
          console.log("[submit] resize image");
          const resized = await resizeImageToWidth(imageFile, 600); // 幅600px

          console.log("[submit] upload to storage");
          const storage = getFirebaseStorage();
          const filePath = `onsenPhotos/${Date.now()}_${imageFile.name}`;
          const storageRef = ref(storage, filePath);
          const snap = await uploadBytes(storageRef, resized);
          uploadedPhotoUrl = await getDownloadURL(snap.ref);
          console.log("[submit] uploaded url", uploadedPhotoUrl);
        } catch (uploadErr) {
          console.warn("[submit] image upload failed", uploadErr);
          // 写真だけ失敗してもログ保存は続ける
        }
      }

      // 3. Firestore 保存
      console.log("[submit] addOnsenLog start");
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
      console.log("[submit] addOnsenLog done");

      // 4. フォームリセット & モーダル閉じる
      setOnsenName("");
      setSleepScore("");
      setMemo("");
      setRating(3);
      setImageFile(null);
      setPreviewUrl("");
      setIsModalOpen(false);

      console.log("[submit] done");
    } catch (err) {
      console.error("[submit] failed", err);
      setError("登録に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  // スワイプでタブ切り替え
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 50;

    if (deltaX > threshold && activeTab === "map") {
      setActiveTab("logs");
    } else if (deltaX < -threshold && activeTab === "logs") {
      setActiveTab("map");
    }

    touchStartX.current = null;
  };

  return (
    <main
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "16px 16px 80px",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, #0f172a, #020617 60%)",
        color: "#e5e7eb",
      }}
    >
      {/* ヘッダー */}
      <header className="ds-header">
        {/* 左側：タイトルと説明 */}
        <div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            DEEPSLEEPING
          </h1>
          <p
            style={{
              marginTop: "4px",
              fontSize: "13px",
              color: "#9ca3af",
            }}
          >
            温泉と睡眠の関係を、ゆるく・楽しく・みんなで記録。
          </p>
        </div>

        {/* 右側：平均睡眠スコア */}
        <div className="ds-header-average">
          <div
            style={{
              fontSize: "11px",
              color: "#9ca3af",
              marginBottom: "2px",
            }}
          >
            温泉に入った時の睡眠平均スコアは
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {averageSleepScore !== null ? averageSleepScore : "–"}
          </div>
        </div>
      </header>



      {/* タブヘッダ */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #1f2933",
          marginTop: "8px",
        }}
      >
        <TabButton
          label="ログ"
          active={activeTab === "logs"}
          onClick={() => setActiveTab("logs")}
        />
        <TabButton
          label="マップ"
          active={activeTab === "map"}
          onClick={() => setActiveTab("map")}
        />
      </div>

      {/* タブコンテンツ */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ marginTop: "16px" }}
      >
        {activeTab === "logs" ? (
          <LogsTab logs={logs} />
        ) : (
          <MapTab logs={logs} />
        )}
      </div>

      {/* 右下の＋ボタン */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: "none",
          fontSize: "32px",
          lineHeight: "0",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          background:
            "linear-gradient(135deg, #38bdf8, #6366f1)",
          color: "#fff",
        }}
      >
        +
      </button>

      {/* 入力モーダル */}
      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              color: "#111827",
            }}
          >
            {/* 上部：写真 or 温泉名 */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "16px",
                  overflow: "hidden",
                  backgroundColor: "#e5e7eb",
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
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    marginBottom: "4px",
                  }}
                >
                  温泉ログを追加
                </h2>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                  }}
                >
                  深く眠れた夜を、あとから振り返るためのメモです。
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                display: "grid",
                gap: "10px",
                marginTop: "4px",
              }}
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
                  スマホの写真から選択できます（アップロード時に幅600pxに縮小）
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
                <p style={{ color: "#b91c1c", fontSize: "12px" }}>
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
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: "999px",
                    border: "1px solid #d1d5db",
                    backgroundColor: "#fff",
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
                  {isSubmitting ? "登録中..." : "登録"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </main>
  );
}

/* タブボタンなど、下は前と同じなので省略せずそのまま使ってOK */
type TabButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 0",
        border: "none",
        borderBottom: active
          ? "2px solid #38bdf8"
          : "2px solid transparent",
        backgroundColor: "transparent",
        fontWeight: active ? 700 : 500,
        fontSize: "14px",
        color: active ? "#e5e7eb" : "#6b7280",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

type LogsTabProps = {
  logs: OnsenLog[];
};

function LogsTab({ logs }: LogsTabProps) {
  if (logs.length === 0) {
    return <p>まだデータがありません。</p>;
  }

  return (
    <div
      style={{
        columnCount: 2,                // ★ 2列のPinterest風
        columnGap: "12px",
      }}
    >
      {logs.map((log) => (
        <div
          key={log.id}
          style={{
            display: "inline-block",
            width: "100%",
            marginBottom: "12px",
            borderRadius: "12px",
            border: "1px solid #1f2937",
            background:
              "linear-gradient(135deg, #020617, #0b1120)",
            overflow: "hidden",
            boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
            breakInside: "avoid",
          }}
        >

          {/* 上：画像エリア（あれば画像、なければプレースホルダ） */}
          {log.photoUrl ? (
            <img
              src={log.photoUrl}
              alt={log.onsenName}
              style={{
                width: "100%",
                display: "block",
                objectFit: "cover",
              }}
            />
          ) : (
            <img
              src="/default-onsen.png"       // ★ public/default-onsen.png を参照
              alt="温泉イメージ"
              style={{
                width: "100%",
                display: "block",
                objectFit: "cover",
              }}
            />
          )}


          {/* 下：テキスト部分 */}
          <div
            style={{
              padding: "8px 10px 10px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#9ca3af",
                marginBottom: "2px",
              }}
            >
              {log.date}
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "13px",
                marginBottom: "4px",
              }}
            >
              {log.onsenName}
            </div>

            <div
              style={{
                fontSize: "12px",
                marginBottom: "2px",
              }}
            >
              睡眠スコア:{" "}
              <strong style={{ color: "#38bdf8" }}>
                {log.sleepScore}
              </strong>
            </div>
            <div
              style={{
                fontSize: "12px",
                marginBottom: log.memo ? "4px" : 0,
              }}
            >
              評価: {renderStars(log.rating)}
            </div>

            {log.memo && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#d1d5db",
                  marginTop: "2px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {log.memo}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


type MapTabProps = {
  logs: OnsenLog[];
};

function MapTab({ logs }: MapTabProps) {
  return (
    <div style={{ marginTop: "8px" }}>
      <OnsenMap logs={logs} />
    </div>
  );
}

type ModalProps = {
  children: React.ReactNode;
  onClose: () => void;
};

function Modal({ children, onClose }: ModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15,23,42,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#f9fafb",
          padding: "18px 18px 16px",
          borderRadius: "16px",
          maxWidth: "520px",
          width: "90%",
          boxShadow:
            "0 20px 45px rgba(15,23,42,0.55)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function renderStars(rating?: number) {
  if (!rating) return "-";
  const full = "★".repeat(rating);
  const empty = "☆".repeat(5 - rating);
  return `${full}${empty} (${rating})`;
}

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
              fontSize: "20px",
              padding: "0 2px",
              color: active ? "#f59e0b" : "#d1d5db",
            }}
            aria-label={`評価 ${v}`}
          >
            {active ? "★" : "☆"}
          </button>
        );
      })}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const labelTextStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#4b5563",
};

const inputStyle: React.CSSProperties = {
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  padding: "6px 8px",
  fontSize: "13px",
  outline: "none",
};

// ★ 幅600pxに縮小するヘルパー
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
