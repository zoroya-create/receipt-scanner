"use client";

import React from "react";
import { CheckCircle2, XCircle, Copy, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export interface ParsedReceipt {
    id: string; // fileのIDと同一
    fileName: string;
    date: string;
    storeName: string;
    amount: number | null;
    summary: string; // 購入品目・経費科目
    hasInvoiceNumber: boolean;
    status: "pending" | "processing" | "success" | "error";
    error?: string;
}

interface ReceiptTableProps {
    receipts: ParsedReceipt[];
    blurred?: boolean;
}

export function ReceiptTable({ receipts, blurred = false }: ReceiptTableProps) {
    const handleCopyTsv = () => {
        // 成功したデータのみを抽出してTSV形式の文字列を作成
        const successReceipts = receipts.filter((r) => r.status === "success");

        if (successReceipts.length === 0) {
            toast.warning("コピーするデータがありません");
            return;
        }

        // ヘッダー行なしでデータのみにするか、ヘッダーありにするか
        // 一般的な経費精算シートの貼り付けやすさを考慮し、ヘッダーなしのデータ行のみをコピーするか、
        // ここでは分かりやすさのためヘッダーを含めます。
        const lines = [
            ["日付", "購入先", "金額", "摘要/科目", "インボイス"].join("\t"),
            ...successReceipts.map((r) =>
                [
                    r.date,
                    r.storeName,
                    r.amount ? r.amount.toString() : "",
                    r.summary,
                    r.hasInvoiceNumber ? "〇" : "×",
                ].join("\t")
            ),
        ];

        const tsv = lines.join("\n");

        navigator.clipboard
            .writeText(tsv)
            .then(() => toast.success("スプレッドシート用にコピーしました！"))
            .catch(() => toast.error("コピーに失敗しました"));
    };

    if (receipts.length === 0) {
        return null;
    }

    return (
        <div className="w-full bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 bg-gray-50/50">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">解析結果</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        完了したデータはスプレッドシートやExcelにそのまま貼り付け可能です。
                    </p>
                </div>
                <button
                    onClick={handleCopyTsv}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-200 hover:border-[#1dbfb4] hover:text-[#1dbfb4] hover:bg-[#f0fbfb] transition-all shadow-sm"
                >
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">表をコピー</span>
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
                            <th className="p-4 whitespace-nowrap hidden md:table-cell">ファイル</th>
                            <th className="p-4 whitespace-nowrap">日付</th>
                            <th className="p-4">購入先</th>
                            <th className="p-4 text-right whitespace-nowrap">金額</th>
                            <th className="p-4">摘要・経費科目</th>
                            <th className="p-4 text-center whitespace-nowrap">インボイス</th>
                            <th className="p-4 text-center whitespace-nowrap">ステータス</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {receipts.map((r) => (
                            <tr
                                key={r.id}
                                className={`transition-colors hover:bg-gray-50/50 ${r.status === "error" ? "bg-red-50/30" : ""
                                    }`}
                            >
                                <td className="p-4 text-gray-400 truncate max-w-[120px] hidden md:table-cell text-xs" title={r.fileName}>
                                    {r.fileName}
                                </td>

                                {r.status === "success" ? (
                                    <>
                                        <td className="p-4 text-gray-800 whitespace-nowrap">{r.date}</td>
                                        <td className={`p-4 font-medium text-gray-900 ${blurred ? "blur-sm" : ""}`}>{r.storeName}</td>
                                        <td className={`p-4 text-right font-bold tracking-tight text-gray-900 whitespace-nowrap ${blurred ? "blur-sm" : ""}`}>
                                            {r.amount !== null ? `¥${r.amount.toLocaleString()}` : "-"}
                                        </td>
                                        <td className="p-4 text-gray-700 line-clamp-2 md:line-clamp-none">{r.summary}</td>
                                        <td className="p-4 text-center">
                                            {r.hasInvoiceNumber ? (
                                                <CheckCircle2 className="w-5 h-5 text-[#1dbfb4] mx-auto" />
                                            ) : (
                                                <span className="text-gray-300 text-lg font-bold">×</span>
                                            )}
                                        </td>
                                    </>
                                ) : r.status === "error" ? (
                                    <td colSpan={5} className="p-4 text-red-500 text-sm">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            {r.error || "解析エラー"}
                                        </div>
                                    </td>
                                ) : (
                                    <td colSpan={5} className="p-4 text-gray-400 text-center">
                                        <span className="opacity-50">解析待ち...</span>
                                    </td>
                                )}

                                {/* ステータス列 */}
                                <td className="p-4 text-center whitespace-nowrap">
                                    {r.status === "pending" && (
                                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-medium">
                                            待機中
                                        </span>
                                    )}
                                    {r.status === "processing" && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            処理中
                                        </span>
                                    )}
                                    {r.status === "success" && (
                                        <span className="inline-block px-2 py-1 bg-[#e0f7f6] text-[#179e95] rounded text-xs font-medium">
                                            完了
                                        </span>
                                    )}
                                    {r.status === "error" && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-medium">
                                            エラー
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
