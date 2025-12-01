'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface CodeViewerProps {
    code: string;
    language: string;
    fileName: string;
}

const getLanguageFromExtension = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
        js: 'javascript',
        jsx: 'jsx',
        ts: 'typescript',
        tsx: 'tsx',
        py: 'python',
        rb: 'ruby',
        java: 'java',
        cpp: 'cpp',
        c: 'c',
        cs: 'csharp',
        php: 'php',
        go: 'go',
        rs: 'rust',
        swift: 'swift',
        kt: 'kotlin',
        scala: 'scala',
        html: 'html',
        css: 'css',
        scss: 'scss',
        sass: 'sass',
        less: 'less',
        json: 'json',
        xml: 'xml',
        yaml: 'yaml',
        yml: 'yaml',
        md: 'markdown',
        sql: 'sql',
        sh: 'bash',
        bash: 'bash',
        zsh: 'bash',
        ps1: 'powershell',
        r: 'r',
        dart: 'dart',
        lua: 'lua',
        vim: 'vim',
        dockerfile: 'dockerfile',
    };
    return languageMap[ext] || 'text';
};

export default function CodeViewer({ code, language, fileName }: CodeViewerProps) {
    const [copied, setCopied] = useState(false);
    const detectedLanguage = language || getLanguageFromExtension(fileName);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800">
                <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/30 rounded-md">
                        <span className="text-xs font-semibold text-violet-400 uppercase">{detectedLanguage}</span>
                    </div>
                    <span className="text-sm text-zinc-400">{fileName}</span>
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

            {/* Code Content */}
            <div className="flex-1 overflow-auto">
                <SyntaxHighlighter
                    language={detectedLanguage}
                    style={vscDarkPlus}
                    showLineNumbers
                    customStyle={{
                        margin: 0,
                        padding: '1.5rem',
                        background: 'transparent',
                        fontSize: '0.875rem',
                        lineHeight: '1.6',
                    }}
                    lineNumberStyle={{
                        minWidth: '3em',
                        paddingRight: '1em',
                        color: '#52525b',
                        userSelect: 'none',
                    }}
                >
                    {code}
                </SyntaxHighlighter>
            </div>
        </div>
    );
}
