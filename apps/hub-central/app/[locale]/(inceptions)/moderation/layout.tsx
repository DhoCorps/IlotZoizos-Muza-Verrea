import React from 'react';

export default function ModerationLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="w-full h-full animate-in fade-in zoom-in-95 duration-500">
            {children}
        </div>
    );
}