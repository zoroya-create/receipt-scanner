"use client";

import React, { useState, useCallback } from "react";
import { ReceiptUploader, ReceiptFile } from "@/components/ReceiptUploader";
import { ReceiptTable, ParsedReceipt } from "@/components/ReceiptTable";
import { motion } from "framer-motion";
import { Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const [files, setFiles] = useState<ReceiptFile[]>([]);
  const [receipts, setReceipts] = useState<ParsedReceipt[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesAdded = useCallback((newFiles: ReceiptFile[]) => {
    setFiles((prev) => [...prev, ...newFiles]);

    // UI用にParsedReceiptの初期状態を作成
    const newReceipts: ParsedReceipt[] = newFiles.map((file) => ({
      id: file.id,
      fileId: file.id,
      fileName: file.file.name,
      date: "",
      storeName: "",
      amount: null,
      summary: "",
      hasInvoiceNumber: false,
      status: "pending",
    }));

    setReceipts((prev) => [...prev, ...newReceipts]);
  }, []);

  const handleFileRemove = useCallback((id: string) => {
    if (isProcessing) return; // 処理中は削除不可
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  }, [isProcessing]);

  const handleReset = useCallback(() => {
    if (isProcessing) return;
    setFiles([]);
    setReceipts([]);
  }, [isProcessing]);

  const startAnalysis = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    toast.info(`解析を開始します（${files.length}枚）`);

    for (let i = 0; i < files.length; i++) {
      const fileObj = files[i];

      // 処理中ステータスに更新
      setReceipts((prev) =>
        prev.map(r => r.id === fileObj.id ? { ...r, status: "processing" } : r)
      );

      try {
        // 画像をBase64に変換
        const base64Promise = new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(fileObj.file);
          reader.onload = () => {
            const result = reader.result as string;
            // "data:image/jpeg;base64,..." のカンマ以降を抽出
            resolve(result.split(',')[1]);
          };
          reader.onerror = error => reject(error);
        });

        const imageBase64 = await base64Promise;

        // APIルートへのPOSTリクエスト (1枚ずつ順次処理)
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64,
            mimeType: fileObj.file.type,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || `サーバーエラー (${res.status})`);
        }

        // data は配列になっている前提
        const parsedArray: any[] = Array.isArray(data) ? data : [data];

        // 成功ステータスと抽出データで更新（元の行を削除し、抽出された件数分の新しい行を追加）
        setReceipts((prev) => {
          // 元の pending/processing 状態の行（fileObj.idに一致するもの）を取り除く
          const filtered = prev.filter(r => r.id !== fileObj.id);

          // 新しく抽出されたデータを行として作成
          const newRows = parsedArray.map((item, idx) => ({
            id: `${fileObj.id}-${idx}`, // 複数ある場合はIDを一意にする
            fileName: fileObj.file.name,
            status: "success" as const,
            date: item.date || "",
            storeName: item.storeName || "",
            amount: typeof item.amount === 'number' ? item.amount : null,
            summary: item.summary || "",
            hasInvoiceNumber: Boolean(item.hasInvoiceNumber),
          }));

          return [...filtered, ...newRows];
        });
      } catch (error: any) {
        console.error("Analysis Error:", error);
        toast.error(`解析エラー: ${error.message || "失敗しました"}`);
        setReceipts((prev) =>
          prev.map(r => r.id === fileObj.id ? {
            ...r,
            status: "error",
            error: error.message || "解析に失敗しました",
          } : r)
        );
      }
    }

    setIsProcessing(false);
    toast.success("すべての解析が完了しました！");
  };

  const pendingCount = receipts.filter(r => r.status === "pending").length;
  // ファイル単位での処理済み数を計算
  const originalFileIds = files.map(f => f.id);
  const processedFileIds = new Set(
    receipts
      .filter(r => r.status === "success" || r.status === "error")
    // 元のfileIdを取得（idは "fileId-index" の形式になっているなどがあるため、fileName等で判定するか、一番手っ取り早いのは pending 以外のレシートに含まれる元の file の数を数える）
    // ...ですが、より正確に処理済み枚数を把握するため、ここでは「元のファイルIDのうち、receipts内にpending/processingとして存在しないものの数」を処理済みとみなします。
  );

  const processingOrPendingFileIds = new Set(
    receipts.filter(r => r.status === "pending" || r.status === "processing").map(r => {
      // 分割前のIDを取得 (例: "abc-0" -> "abc"。元のidと同じならそのまま)
      return r.id.split('-')[0];
    })
  );

  const processedCount = files.length - processingOrPendingFileIds.size;

  return (
    <div className="flex flex-col gap-8 pb-20">

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              レシートをアップロード
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              解析したいレシートの画像を追加してください。（1枚ごとに複数のレシートが写っていても自動で分割されます）
            </p>
          </div>

          {files.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                リセット
              </button>
              <button
                onClick={startAnalysis}
                disabled={isProcessing || pendingCount === 0}
                className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-[#1dbfb4] border border-transparent rounded-lg hover:bg-[#179e95] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                {isProcessing ? "解析中..." : "解析スタート"}
              </button>
            </div>
          )}
        </div>

        <ReceiptUploader
          files={files}
          onFilesAdded={handleFilesAdded}
          onFileRemove={handleFileRemove}
        />
      </motion.section>

      {/* Progress & Result Section */}
      {receipts.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {isProcessing && (
            <div className="bg-white p-4 rounded-xl shadow-soft border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute inset-0 border-2 border-gray-100 rounded-full"></div>
                  <div
                    className="absolute inset-0 border-2 border-[#1dbfb4] rounded-full border-t-transparent animate-spin"
                  ></div>
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">解析を実行中...</p>
                  <p className="text-xs text-gray-500">
                    {processedCount} / {files.length} 画像ファイル完了
                  </p>
                </div>
              </div>
              <div className="w-1/2 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#1dbfb4] h-full transition-all duration-300"
                  style={{ width: `${(processedCount / files.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <ReceiptTable receipts={receipts} />
        </motion.section>
      )}

    </div>
  );
}
