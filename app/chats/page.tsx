'use client';

import { AppShell } from '@/components/layout/AppShell';
import { UserSearch } from '@/components/search/UserSearch';
import { ChatList } from '@/components/chat/ChatList';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChatService } from '@/lib/services/chat';
import { useAuth } from '@/lib/auth';
import { UsersService } from '@/lib/services/users';
import toast from 'react-hot-toast';

import { useSudo } from '@/context/SudoContext';
import { KeychainService } from '@/lib/appwrite/keychain';
import { ecosystemSecurity } from '@/lib/ecosystem/security';

function ChatHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { requestSudo } = useSudo();
  const userId = searchParams.get('userId');
  const [checkedSudoOnMount, setCheckedSudoOnMount] = useState(false);

  useEffect(() => {
    if (userId && user) {
      const initChat = async () => {
        try {
          // Fetch target profile to check for publicKey
          const targetProfile = await UsersService.getProfileById(userId);
          if (!targetProfile) {
            toast.error("User profile not found.");
            router.replace('/chats');
            return;
          }

          if (!targetProfile.publicKey) {
            toast.error(`${targetProfile.displayName || targetProfile.username} hasn't set up their account for secure chatting yet.`);
            router.replace('/chats');
            return;
          }

          const actualTargetUserId = targetProfile.userId || userId;
          if (!actualTargetUserId) {
            toast.error("User ID missing from profile.");
            router.replace('/chats');
            return;
          }

          const existing = await ChatService.getConversations(user.$id);
          const found = existing.rows.find((c: any) => 
            c.type === 'direct' && c.participants.includes(actualTargetUserId)
          );
          const canReuseFound = found?.$permissions?.some((permission: string) =>
            permission === 'read("users")' || permission === 'read("any")'
          );

          if (found && canReuseFound) {
            router.push(`/chat/${found.$id}`);
          } else {
            // Ensure Sudo is unlocked before creating (needed for E2E keys)
            // Additionally: if the vault is locked and there is no masterpass yet,
            // requestSudo should open in 'initialize' intent so the modal redirects
            // to the vault setup flow. We detect masterpass presence via KeychainService.hasMasterpass
            // and use ecosystemSecurity.status.isUnlocked to short-circuit when unlocked.
            if (ecosystemSecurity.status.isUnlocked) {
              // If already unlocked, proceed directly
              try {
                const newConv = await ChatService.createConversation([user.$id, actualTargetUserId], 'direct');
                router.push(`/chat/${newConv.$id}`);
              } catch (err: any) {
                console.error("Failed to create chat:", err);
                toast.error(`Failed to create chat: ${err?.message || 'Unknown error'}`);
                router.replace('/chats');
              }
            } else {
              const hasMaster = await KeychainService.hasMasterpass(user.$id);
              requestSudo({
                intent: hasMaster ? undefined : 'initialize',
                onSuccess: async () => {
                  try {
                    const newConv = await ChatService.createConversation([user.$id, actualTargetUserId], 'direct');
                    router.push(`/chat/${newConv.$id}`);
                  } catch (err: any) {
                    console.error("Failed to create chat:", err);
                    toast.error(`Failed to create chat: ${err?.message || 'Unknown error'}`);
                    router.replace('/chats');
                  }
                },
                onCancel: () => {
                  router.replace('/chats');
                }
              });
            }
          }
        } catch (e) {
          console.error("Failed to auto-init chat", e);
          toast.error("Failed to initialize chat.");
          router.replace('/chats');
        }
      };
      initChat();
    }
  }, [userId, user, router, requestSudo]);

  // Page-mount Sudo enforcement: when navigating to /chats (no specific userId),
  // ensure the vault state is enforced:
  // - if unlocked => no modal
  // - if locked and masterpass exists => show SudoModal for verification
  // - if locked and no masterpass => show SudoModal with intent 'initialize' so it redirects to setup
  useEffect(() => {
    const runCheck = async () => {
      if (!user?.$id || checkedSudoOnMount) return;

      // If already unlocked, nothing to do
      if (ecosystemSecurity.status.isUnlocked) {
        setCheckedSudoOnMount(true);
        return;
      }

      try {
        const hasMaster = await KeychainService.hasMasterpass(user.$id);
        requestSudo({
          intent: hasMaster ? undefined : 'initialize',
          onSuccess: () => {
            setCheckedSudoOnMount(true);
          },
          onCancel: () => {
            // If the user cancels verification/setup, send them to the home page
            setCheckedSudoOnMount(true);
            router.replace('/');
          }
        });
      } catch (e) {
        console.error('Failed to check masterpass on mount', e);
        setCheckedSudoOnMount(true);
      }
    };

    runCheck();
  }, [user?.$id, checkedSudoOnMount, requestSudo, router]);

  return null;
}

export default function Home() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <AppShell>
      <Suspense fallback={null}>
        <ChatHandler />
      </Suspense>
      <Box sx={{ display: 'flex', height: '100%' }}>
        {isMobile && (
            <Box sx={{ 
                width: '100%', 
                borderRight: 0, 
                display: 'flex', 
                flexDirection: 'column' 
            }}>
                <ChatList />
            </Box>
        )}
        {!isMobile && (
            <Box sx={{ flex: 1, p: 3 }}>
              <Typography variant="h5" fontWeight="bold" mb={3}>Find People</Typography>
              <UserSearch />
            </Box>
        )}
      </Box>
    </AppShell>
  );
}
