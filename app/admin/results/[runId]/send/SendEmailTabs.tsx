"use client";

import { useState } from "react";
import type { NotifyRow } from "@/lib/notify";
import SendMatchEmails from "./SendMatchEmails";
import SendFolderEmails from "../send-folder/SendFolderEmails";
import SendReminderEmails from "../send-reminder/SendReminderEmails";

type Tab = "pasangan" | "folder" | "reminder";

export default function SendEmailTabs({
  runId,
  rows,
}: {
  runId: string;
  rows: NotifyRow[];
}) {
  const [tab, setTab] = useState<Tab>("pasangan");
  const confirmedRows = rows.filter((r) => r.confirmedAt);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-teal-100">
        <TabButton active={tab === "pasangan"} onClick={() => setTab("pasangan")}>
          Kirim email pasangan
        </TabButton>
        <TabButton active={tab === "folder"} onClick={() => setTab("folder")}>
          Kirim link folder
        </TabButton>
        <TabButton active={tab === "reminder"} onClick={() => setTab("reminder")}>
          Kirim reminder H-5
        </TabButton>
      </div>

      {tab === "pasangan" && <SendMatchEmails runId={runId} rows={rows} />}

      {tab === "folder" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            Hanya menampilkan giver yang sudah konfirmasi pasangannya ({confirmedRows.length}{" "}
            dari {rows.length}).
          </p>
          <SendFolderEmails runId={runId} rows={confirmedRows} />
        </div>
      )}

      {tab === "reminder" && <SendReminderEmails runId={runId} rows={rows} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
        active
          ? "border-teal-400 text-teal-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
