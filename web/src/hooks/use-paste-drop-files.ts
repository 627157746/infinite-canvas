"use client";

import { useEffect, useRef } from "react";

// http（非 localhost）访问时浏览器不提供 navigator.clipboard，按钮读剪贴板必然失败，给出可操作的提示
export function clipboardReadError(fallback: string) {
    return typeof navigator !== "undefined" && navigator.clipboard ? fallback : "当前为 http 访问，浏览器禁止读取剪贴板，请直接按 Ctrl+V 粘贴";
}

// 页面级 Ctrl+V 粘贴文件与拖拽文件；已被其他组件处理（defaultPrevented）的事件跳过，纯文本粘贴不拦截
export function usePasteDropFiles(onFiles: (files: File[]) => void) {
    const handlerRef = useRef(onFiles);
    useEffect(() => {
        handlerRef.current = onFiles;
    });
    useEffect(() => {
        const pick = (data: DataTransfer | null) => Array.from(data?.files || []).filter((file) => file.size > 0);
        const onPaste = (event: ClipboardEvent) => {
            const files = pick(event.clipboardData);
            if (event.defaultPrevented || !files.length) return;
            event.preventDefault();
            handlerRef.current(files);
        };
        const onDragOver = (event: DragEvent) => {
            if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
        };
        const onDrop = (event: DragEvent) => {
            if (event.defaultPrevented || !event.dataTransfer?.types.includes("Files")) return;
            event.preventDefault();
            const files = pick(event.dataTransfer);
            if (files.length) handlerRef.current(files);
        };
        window.addEventListener("paste", onPaste);
        window.addEventListener("dragover", onDragOver);
        window.addEventListener("drop", onDrop);
        return () => {
            window.removeEventListener("paste", onPaste);
            window.removeEventListener("dragover", onDragOver);
            window.removeEventListener("drop", onDrop);
        };
    }, []);
}
