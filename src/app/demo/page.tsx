"use client";

import React, { useState, useCallback, useEffect } from "react";
import { ReceiptUploader, ReceiptFile } from "@/components/ReceiptUploader";
import { ReceiptTable, ParsedReceipt } from "@/components/ReceiptTable";
import { motion } from "framer-motion";
import { Play, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function DemoPage() {
    const [files, setFiles] = useState<ReceiptFile[]>([]);
    const [receipts, setReceipts] = useState<ParsedReceipt[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFilesAdded = useCallback((newFiles: ReceiptFile[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
        const newReceipts: ParsedReceipt[] = newFiles.map((file) => ({
            id: file.id,
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
        setFiles((prev) => prev.filter((f) => f.id !== id));
        setReceipts((prev) => prev.filter((r) => !r.id.startsWith(id)));
    }, []);

    const handleReset = () => {
        setFiles([]);
        setReceipts([]);
        setIsProcessing(false);
    };

    const loadDemoData = async () => {
        const demoImages = [
            "/demo-receipts/media__1773297688027.jpg",
            "/demo-receipts/media__1773297688050.jpg",
            "/demo-receipts/media__1773297688062.jpg",
            "/demo-receipts/media__1773297688075.jpg",
            "/demo-receipts/media__1773297688090.jpg"
        ];

        try {
            const demoFiles: ReceiptFile[] = await Promise.all(
                demoImages.map(async (url, index) => {
                    const res = await fetch(url);
                    const blob = await res.blob();
                    const file = new File([blob], `demo-receipt-${index + 1}.jpg`, { type: "image/jpeg" });
                    return {
                        id: `demo-${index}`,
                        file,
                        previewUrl: url
                    };
                })
            );
            handleFilesAdded(demoFiles);
            toast.success("デモデータを読み込みました");
        } catch (err) {
            toast.error("デモデータの読み込みに失敗しました");
        }
    };

    const startAnalysis = async () => {
        const pending = receipts.filter((r) => r.status === "pending");
        if (pending.length === 0) return;

        setIsProcessing(true);

        for (const receipt of receipts) {
            if (receipt.status !== "pending") continue;

            const fileObj = files.find((f) => f.id === receipt.id.split('-')[0]);
            if (!fileObj) continue;

            setReceipts((prev) =>
                prev.map((r) => (r.id === receipt.id ? { ...r, status: "processing" } : r))
            );

            try {
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve) => {
                    reader.onload = () => {
                        const result = reader.result as string;
                        resolve(result.split(",")[1]);
                    };
                    reader.readAsDataURL(fileObj.file);
                });

                const imageBase64 = await base64Promise;

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

                const parsedArray: any[] = Array.isArray(data) ? data : [data];

                setReceipts((prev) => {
                    const filtered = prev.filter(r => r.id !== fileObj.id);
                    const newRows = parsedArray.map((item, idx) => ({
                        id: `${fileObj.id}-${idx}`,
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
                setReceipts((prev) =>
                    prev.map(r => r.id === receipt.id ? {
                        ...r,
                        status: "error",
                        error: error.message || "解析に失敗しました",
                    } : r)
                );
            }

            // レートリミット対策で少し待機
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        setIsProcessing(false);
        toast.success("すべての解析が完了しました！");
    };

    const pendingCount = receipts.filter(r => r.status === "pending").length;
    const processingOrPendingFileIds = new Set(
        receipts.filter(r => r.status === "pending" || r.status === "processing").map(r => r.id.split('-')[0])
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
                            SNS動画用デモモード
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            撮影用のサンプルデータを読み込んで解析を行います（購入先・金額には自動でぼかしが入ります）。
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {files.length === 0 && (
                            <button
                                onClick={loadDemoData}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#1dbfb4] bg-[#f0fbfb] border border-[#1dbfb4] rounded-lg hover:bg-[#e0f7f6] transition-colors shadow-sm"
                            >
                                <Sparkles className="w-4 h-4" />
                                デモデータを読込
                            </button>
                        )}
                        {files.length > 0 && (
                            <>
                                <button
                                    onClick={handleReset}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 shadow-sm whitespace-nowrap"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    リセット
                                </button>
                                <button
                                    id="start-analysis-btn"
                                    onClick={startAnalysis}
                                    disabled={isProcessing || pendingCount === 0}
                                    className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-[#1dbfb4] border border-transparent rounded-lg hover:bg-[#179e95] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors whitespace-nowrap"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    {isProcessing ? "解析中..." : "解析スタート"}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <ReceiptUploader
                    files={files}
                    onFilesAdded={handleFilesAdded}
                    onFileRemove={handleFileRemove}
                />
            </motion.section>

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
                                    <div className="absolute inset-0 border-2 border-[#1dbfb4] rounded-full border-t-transparent animate-spin"></div>
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
                    <ReceiptTable receipts={receipts} blurred={true} />
                </motion.section>
            )}
        </div>
    );
}
