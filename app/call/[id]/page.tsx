'use client';

import { CallInterface } from '@/components/call/CallInterface';
import { PublicCall } from './PublicCall';
import { useParams, useSearchParams } from 'next/navigation';

export default function CallPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params.id as string;
    
    // Detect if this is a public call code (8 chars, alphanumeric) or a standard conversation ID
    const isPublicLink = id && id.length === 8 && /^[A-Z0-9]+$/.test(id);
    
    if (isPublicLink) {
        return <PublicCall code={id} />;
    }

    const isCaller = searchParams.get('caller') === 'true';
    const type = searchParams.get('type') === 'video' ? 'video' : 'audio';

    return (
        <CallInterface conversationId={id} isCaller={isCaller} callType={type} />
    );
}
