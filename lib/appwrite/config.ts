export const APPWRITE_CONFIG = {
    ENDPOINT: 'https://fra.cloud.appwrite.io/v1',
    PROJECT_ID: '67fe9627001d97e37ef3',
    DATABASES: {
        CHAT: 'chat',
        WHISPERRNOTE: '67ff05a9000296822396',
        PASSWORD_MANAGER: 'passwordManagerDb',
        WHISPERRFLOW: 'whisperrflow'
    },
    TABLES: {
        CHAT: {
            CONVERSATIONS: 'conversations',
            MESSAGES: 'messages',
            CALL_LOGS: 'call_logs',
            APP_ACTIVITY: 'app_activity',
            CALL_LINKS: 'call_links',
            FOLLOWS: 'follows',
            MOMENTS: 'moments',
            INTERACTIONS: 'interactions',
            USERS: 'users',
            CONTACTS: 'contacts'
        },
        WHISPERRNOTE: {
            USERS: '67ff05c900247b5673d3'
        }
    },
    BUCKETS: {
        MESSAGES: 'messages',
        VOICE: 'voice',
        VIDEO: 'video',
        PROFILE_PICTURES: 'profile_pictures',
        COVERS: 'covers'
    }
};
