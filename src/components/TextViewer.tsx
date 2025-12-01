'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, FileText } from 'lucide-react';

interface TextViewerProps {
    content: string;
    fileName: string;
    isMarkdown?: boolean;
}

export default function TextViewer({ content, fileName, isMarkdown = false }: TextViewerProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800">
                <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-violet-400" />
                    <span className="text-sm font-medium text-zinc-300">{fileName}</span>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm text-zinc-300"
                >
                    {copied ? (
                        <>
                            <Check className="h-4 w-4 text-green-400" />
                            <span className="text-green-400">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-4 w-4" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {isMarkdown ? (
                    <div className="prose prose-invert prose-zinc max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                // Custom styling for markdown elements
                                h1: ({ children }) => (
                                    <h1 className="text-3xl font-bold text-zinc-100 mb-4 mt-6">{children}</h1>
                                ),
                                h2: ({ children }) => (
                                    <h2 className="text-2xl font-semibold text-zinc-100 mb-3 mt-5">{children}</h2>
                                ),
                                h3: ({ children }) => (
                                    <h3 className="text-xl font-semibold text-zinc-200 mb-2 mt-4">{children}</h3>
                                ),
                                p: ({ children }) => (
                                    <p className="text-zinc-300 mb-4 leading-relaxed">{children}</p>
                                ),
                                a: ({ href, children }) => (
                                    <a
                                        href={href}
                                        className="text-violet-400 hover:text-violet-300 underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {children}
                                    </a>
                                ),
                                code: ({ children, className }) => {
                                    const isInline = !className;
                                    return isInline ? (
                                        <code className="px-1.5 py-0.5 bg-zinc-800 text-violet-300 rounded text-sm font-mono">
                                            {children}
                                        </code>
                                    ) : (
                                        <code className="block p-4 bg-zinc-900 text-zinc-300 rounded-lg overflow-x-auto text-sm font-mono">
                                            {children}
                                        </code>
                                    );
                                },
                                ul: ({ children }) => (
                                    <ul className="list-disc list-inside text-zinc-300 mb-4 space-y-1">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                    <ol className="list-decimal list-inside text-zinc-300 mb-4 space-y-1">{children}</ol>
                                ),
                                blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-violet-500 pl-4 italic text-zinc-400 my-4">
                                        {children}
                                    </blockquote>
                                ),
                                table: ({ children }) => (
                                    <div className="overflow-x-auto mb-4">
                                        <table className="min-w-full border border-zinc-700 rounded-lg overflow-hidden">
                                            {children}
                                        </table>
                                    </div>
                                ),
                                th: ({ children }) => (
                                    <th className="bg-zinc-800 text-zinc-200 px-4 py-2 text-left font-semibold border-b border-zinc-700">
                                        {children}
                                    </th>
                                ),
                                td: ({ children }) => (
                                    <td className="px-4 py-2 text-zinc-300 border-b border-zinc-800">{children}</td>
                                ),
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <pre className="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">
                        {content}
                    </pre>
                )}
            </div>
        </div>
    );
}
