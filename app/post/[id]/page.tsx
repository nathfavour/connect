import { Metadata } from 'next';
import { SocialService } from '@/lib/services/social';
import { UsersService } from '@/lib/services/users';
import { PostViewClient } from './PostViewClient';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    try {
        const id = Array.isArray(params.id) ? params.id[0] : params.id;
        const moment = await SocialService.getMomentById(id);
        const creator = await UsersService.getProfileById(moment.userId || moment.creatorId);
        
        const title = `@${creator?.username || 'user'} on Kylrix Connect`;
        const description = moment.caption?.substring(0, 160) || "Check out this Moment on Kylrix Connect.";
        const domain = process.env.NEXT_PUBLIC_DOMAIN || 'kylrix.space';
        const url = `https://connect.${domain}/post/${id}`;
        
        return {
            title: `${title}: "${moment.caption?.substring(0, 50)}..."`,
            description,
            openGraph: {
                title,
                description,
                url,
                siteName: 'Kylrix Connect',
                type: 'article',
                images: [{ url: `https://connect.${domain}/og-image.png` }],
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                creator: `@${creator?.username}`,
            },
        };
    } catch (_e: unknown) {
        return { title: 'Moment - Kylrix Connect' };
    }
}

export default function PostView() {
    return <PostViewClient />;
}
