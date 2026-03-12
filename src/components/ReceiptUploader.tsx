"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileImage, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ReceiptFile {
    id: string;
    file: File;
    previewUrl: string;
}

interface ReceiptUploaderProps {
    files: ReceiptFile[];
    onFilesAdded: (newFiles: ReceiptFile[]) => void;
    onFileRemove: (id: string) => void;
    maxFiles?: number;
}

export function ReceiptUploader({
    files,
    onFilesAdded,
    onFileRemove,
    maxFiles = 30,
}: ReceiptUploaderProps) {
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            // 既存のファイル数との合計を計算して最大枚数をチェック
            const currentCount = files.length;
            const remainingSlots = maxFiles - currentCount;

            const filesToAdd = acceptedFiles.slice(0, remainingSlots);

            const newFiles: ReceiptFile[] = filesToAdd.map((file) => ({
                id: Math.random().toString(36).substring(7),
                file,
                previewUrl: URL.createObjectURL(file), // ブラウザでプレビューするためのURL
            }));

            if (newFiles.length > 0) {
                onFilesAdded(newFiles);
            }
        },
        [files.length, maxFiles, onFilesAdded]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/*": [".jpeg", ".jpg", ".png", ".webp"],
        },
        maxSize: 10 * 1024 * 1024, // 10MB
    });

    return (
        <div className="w-full">
            <div
                {...getRootProps()}
                className={`w-full relative overflow-hidden transition-all duration-300 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-12 cursor-pointer bg-white group
          ${isDragActive
                        ? "border-[#1dbfb4] bg-[#f0fbfb]"
                        : "border-gray-200 hover:border-[#1dbfb4] hover:bg-gray-50"
                    }
        `}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4 text-center pointer-events-none">
                    <div
                        className={`p-4 rounded-full transition-colors duration-300 ${isDragActive ? "bg-[#e0f7f6] text-[#1dbfb4]" : "bg-gray-100 text-gray-400 group-hover:text-[#1dbfb4] group-hover:bg-[#e0f7f6]"
                            }`}
                    >
                        <UploadCloud className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-lg font-medium text-gray-700">
                            {isDragActive
                                ? "ここにドロップしてください"
                                : "レシート画像をドラッグ＆ドロップ"}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            またはクリックしてファイルを選択（最大{maxFiles}枚）
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            対応フォーマット: JPG, PNG, WEBP (最大10MB)
                        </p>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6"
                    >
                        <div className="flex items-center justify-between mb-3 text-sm font-medium text-gray-700">
                            <span>選択済みのファイル（{files.length}枚）</span>
                            {files.length >= maxFiles && (
                                <span className="text-red-500 text-xs">
                                    最大アップロード数に達しました
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                            <AnimatePresence>
                                {files.map((fileObj) => (
                                    <motion.div
                                        key={fileObj.id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        layout
                                        className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm aspect-square flex items-center justify-center"
                                    >
                                        <img
                                            src={fileObj.previewUrl}
                                            alt={fileObj.file.name}
                                            className="object-cover w-full h-full"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onFileRemove(fileObj.id);
                                                }}
                                                className="p-1 bg-white/20 hover:bg-red-500 rounded-full text-white backdrop-blur-sm transition-colors"
                                                title="削除"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
