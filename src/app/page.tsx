// src/app/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { subscribeOnsenLogs } from "@/lib/onsenLogRepository";
import type { OnsenLog } from "@/types/onsenLog";

type Tab = "logs" | "map";

// Leaflet マップはクライアント側のみ読み込む
const OnsenMap = dynamic(() => import("@/components/OnsenMap"), {
  ssr: false,
});

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("logs");
  const [logs, setLogs] = useState<OnsenLog[]>([]);
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
              fontSize: "32px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            温泉と睡眠研究会
          </h1>
          <p
            style={{
              marginTop: "4px",
              fontSize: "16px",
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
              fontSize: "14px",
              color: "#9ca3af",
              marginBottom: "2px",
            }}
          >
            温泉に入った日の睡眠平均スコアは
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

      {/* 右下の＋ボタン → /add へ遷移 */}
      <Link
        href="/add"
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          background: "linear-gradient(135deg, #38bdf8, #6366f1)",
          color: "#fff",
        }}
      >
        +
      </Link>
    </main>
  );
}

/* タブボタン */
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

/* ログ一覧（Pinterest風タイル） */
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
        columnCount: 2,
        columnGap: "12px",
      }}
    >
      {logs.map((log) => (
        <div
  key={log.id}
  style={{
    position: "relative", // 追加
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
  {/* 右上の編集アイコン */}
      <Link
        href={`/edit/${log.id}`}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          fontSize: "11px",
          padding: "3px 8px",
          borderRadius: "999px",
          backgroundColor: "rgba(15,23,42,0.8)",
          color: "#e5e7eb",
          textDecoration: "none",
          border: "1px solid #4b5563",
        }}
      >
        編集
      </Link>
          {/* 上：画像エリア（あれば画像、なければ default-onsen.png） */}
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
              src="/default-onsen.png"
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

/* マップタブ */
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

/* 星表示（読み取り用） */
function renderStars(rating?: number) {
  if (!rating) return "-";
  const full = "★".repeat(rating);
  const empty = "☆".repeat(5 - rating);
  return `${full}${empty} (${rating})`;
}
