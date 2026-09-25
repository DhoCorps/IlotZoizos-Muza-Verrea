// apps/hub-central/app/profile/[slug]/page.tsx
import React from 'react';
import ProfileClient from './ProfileClient';

interface PageProps {
    params: Promise<{ slug?: string }> | { slug?: string };
}

export default async function ProfilePage({ params }: PageProps) {
    const resolvedParams = await params;
    const slug = resolvedParams?.slug;

    return <ProfileClient slug={slug} />;
}