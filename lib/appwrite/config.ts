import { PROJECT_ID, ENDPOINT } from '../../generated/appwrite/constants';

export const APPWRITE_CONFIG = {
    ENDPOINT,
    PROJECT_ID,
    DATABASES: {
        CHAT: 'chat',
        KYLRIXNOTE: '67ff05a9000296822396',
        PASSWORD_MANAGER: 'passwordManagerDb',
        KYLRIXFLOW: 'whisperrflow'
    },
    TABLES: {
        CHAT: {
            CONVERSATIONS: 'conversations',
            MESSAGES: 'messages',
            CALL_LOGS: 'call_logs',
            APP_ACTIVITY: 'app_activity',
            CALL_LINKS: 'calls',
            FOLLOWS: 'follows',
            MOMENTS: 'moments',
            INTERACTIONS: 'interactions',
            PROFILES: 'users',
            USERS: 'users',
            CONTACTS: 'contacts'
        },
        KYLRIXNOTE: {
            USERS: '67ff05c900247b5673d3',
            ACTIVITY_LOG: 'activityLog'
        },
        PASSWORD_MANAGER: {
            KEYCHAIN: 'keychain',
            IDENTITIES: 'identities'
        }
    },
    BUCKETS: {
        MESSAGES: 'messages',
        VOICE: 'voice',
        VIDEO: 'video',
        PROFILE_PICTURES: 'profile_pictures',
        COVERS: 'covers'
    },
    FUNCTIONS: {
        SEARCH_USERS: '69a582720012957d2027',
        SYNC_USER_PROFILE: '69a583ac002b674685b0',
        NOTIFY_ON_SHARE: '69a58c1c001c39695bf6',
        NOTIFY_ON_SOCIAL_ACTIVITY: '69a6bf6200180e70aca1',
        FLOW_EVENT_SYNC: '69a6c28f003bb7d7e054',
        LOG_SECURITY_EVENT: '69a6c45a002085baa8dd',
        SYNC_SUBSCRIPTION_STATUS: '69a6c56d00203438232c',
        ACCOUNT_CLEANUP: '69a6c6fc001dc877979d',
        CONNECT_CALL_CLEANUP: '69a6c841000b2c5aaae3'
    },
    AUTH: {
        SUBDOMAIN: 'accounts',
        DOMAIN: 'kylrix.space'
    }
};
