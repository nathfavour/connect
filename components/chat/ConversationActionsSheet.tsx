'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  ListItemAvatar,
  Paper,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { MessageCircle, Phone, Search, Shield, Trash2, UserMinus, UserPlus, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/lib/auth';
import { ChatService } from '@/lib/services/chat';
import { UsersService } from '@/lib/services/users';
import { fetchProfilePreview } from '@/lib/profile-preview';

type ConversationActionsSheetProps = {
  conversation: any | null;
  open: boolean;
  onClose: () => void;
  onConversationUpdated?: (conversation: any) => void;
  onConversationDeleted?: (conversationId: string) => void;
};

const ConversationAvatar = ({ user }: { user: any }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const resolve = async () => {
      const avatar = user?.avatar;
      if (!avatar) {
        if (active) setAvatarUrl(null);
        return;
      }

      if (String(avatar).startsWith('http')) {
        if (active) setAvatarUrl(avatar);
        return;
      }

      try {
        const preview = await fetchProfilePreview(avatar, 96, 96);
        if (active) setAvatarUrl(preview as unknown as string);
      } catch {
        if (active) setAvatarUrl(null);
      }
    };

    void resolve();
    return () => {
      active = false;
    };
  }, [user?.avatar]);

  return (
    <Avatar
      src={avatarUrl || undefined}
      sx={{
        width: 64,
        height: 64,
        bgcolor: alpha('#F59E0B', 0.12),
        color: '#F59E0B',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {!avatarUrl && (user?.displayName || user?.username || '?').charAt(0).toUpperCase()}
    </Avatar>
  );
};

const MemberAvatar = ({ user }: { user: any }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const resolve = async () => {
      const avatar = user?.avatar;
      if (!avatar) {
        if (active) setAvatarUrl(null);
        return;
      }

      if (String(avatar).startsWith('http')) {
        if (active) setAvatarUrl(avatar);
        return;
      }

      try {
        const preview = await fetchProfilePreview(avatar, 64, 64);
        if (active) setAvatarUrl(preview as unknown as string);
      } catch {
        if (active) setAvatarUrl(null);
      }
    };

    void resolve();
    return () => {
      active = false;
    };
  }, [user?.avatar]);

  return (
    <Avatar
      src={avatarUrl || undefined}
      sx={{
        width: 44,
        height: 44,
        bgcolor: alpha('#6366F1', 0.12),
        color: '#6366F1',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {!avatarUrl && (user?.displayName || user?.username || '?').charAt(0).toUpperCase()}
    </Avatar>
  );
};

export default function ConversationActionsSheet({
  conversation,
  open,
  onClose,
  onConversationUpdated,
  onConversationDeleted,
}: ConversationActionsSheetProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const { user } = useAuth();

  const [currentConversation, setCurrentConversation] = useState<any | null>(conversation);
  const [directProfile, setDirectProfile] = useState<any | null>(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberTab, setMemberTab] = useState<'members' | 'add' | 'remove'>('members');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isGroup = currentConversation?.type === 'group';
  const isDirect = Boolean(currentConversation && !isGroup);
  const participantIds = useMemo(() => Array.from(new Set((currentConversation?.participants || []).filter(Boolean))), [currentConversation?.participants]);
  const isAdmin = Boolean(user?.$id && (
    currentConversation?.admins?.includes(user.$id) ||
    currentConversation?.creatorId === user.$id
  ));

  const refreshConversation = useCallback(async () => {
    if (!currentConversation?.$id || !user?.$id) return null;
    const updated = await ChatService.getConversationById(currentConversation.$id, user.$id);
    setCurrentConversation(updated);
    onConversationUpdated?.(updated);
    return updated;
  }, [currentConversation?.$id, onConversationUpdated, user?.$id]);

  useEffect(() => {
    if (!open || !conversation) return;
    setCurrentConversation(conversation);
    setMemberTab('members');
    setMemberQuery('');
    setMemberResults([]);
    setDeleteConfirmOpen(false);
  }, [open, conversation?.$id]);

  useEffect(() => {
    if (!open || !currentConversation) return;

    if (isDirect) {
      const targetUserId = currentConversation.otherUserId || participantIds.find((id: string) => id !== user?.$id) || currentConversation.creatorId;
      if (!targetUserId) return;

      let active = true;
      setDirectLoading(true);
      UsersService.getProfileById(targetUserId)
        .then((profile) => {
          if (active) setDirectProfile(profile);
        })
        .catch((error) => {
          console.error('[ConversationActionsSheet] Failed to load profile:', error);
          if (active) setDirectProfile(null);
        })
        .finally(() => {
          if (active) setDirectLoading(false);
        });

      return () => {
        active = false;
      };
    }

    if (isGroup) {
      let active = true;
      setMembersLoading(true);
      Promise.all(participantIds.map((id: string) => UsersService.getProfileById(id)))
        .then((profiles) => {
          if (!active) return;
          const mapped = profiles
            .filter(Boolean)
            .sort((left: any, right: any) => {
              if (left?.userId === user?.$id) return -1;
              if (right?.userId === user?.$id) return 1;
              const leftAdmin = currentConversation?.admins?.includes(left?.userId);
              const rightAdmin = currentConversation?.admins?.includes(right?.userId);
              if (leftAdmin === rightAdmin) return 0;
              return leftAdmin ? -1 : 1;
            });
          setGroupMembers(mapped);
        })
        .catch((error) => {
          console.error('[ConversationActionsSheet] Failed to load members:', error);
          if (active) setGroupMembers([]);
        })
        .finally(() => {
          if (active) setMembersLoading(false);
        });

      return () => {
        active = false;
      };
    }
  }, [open, currentConversation, isDirect, isGroup, participantIds, user?.$id]);

  useEffect(() => {
    if (!open || !isGroup) return;
    if (memberTab !== 'add' || memberQuery.trim().length < 2) {
      setMemberResults([]);
      setMemberSearching(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setMemberSearching(true);
      UsersService.searchUsers(memberQuery)
        .then((res) => {
          if (!active) return;
          const filtered = (res.rows || []).filter((item: any) => {
            const id = item.userId || item.$id;
            if (!id) return false;
            if (id === user?.$id) return false;
            if (participantIds.includes(id)) return false;
            return true;
          });
          setMemberResults(filtered);
        })
        .catch((error) => {
          console.error('[ConversationActionsSheet] Member search failed:', error);
          if (active) setMemberResults([]);
        })
        .finally(() => {
          if (active) setMemberSearching(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, isGroup, memberTab, memberQuery, participantIds, user?.$id]);

  const handleOpenDirectChat = () => {
    if (!currentConversation) return;
    router.push(`/chat/${currentConversation.$id}`);
    onClose();
  };

  const handleCall = () => {
    if (!currentConversation) return;
    router.push(`/call/${currentConversation.$id}?caller=true&type=video`);
    onClose();
  };

  const handleOpenInfo = () => {
    const username = directProfile?.username;
    if (!username) return;
    router.push(`/u/${username}`);
    onClose();
  };

  const handleAddMember = async (target: any) => {
    if (!currentConversation?.$id) return;
    const targetId = target.userId || target.$id;
    if (!targetId) return;

    setMutating(true);
    try {
      await ChatService.addParticipant(currentConversation.$id, targetId);
      await refreshConversation();
      toast.success('Member added');
      setMemberQuery('');
      setMemberResults([]);
    } catch (error: any) {
      console.error('[ConversationActionsSheet] Failed to add member:', error);
      toast.error(error?.message || 'Failed to add member');
    } finally {
      setMutating(false);
    }
  };

  const handleRemoveMember = async (target: any) => {
    if (!currentConversation?.$id) return;
    const targetId = target.userId || target.$id;
    if (!targetId) return;

    setMutating(true);
    try {
      await ChatService.removeParticipant(currentConversation.$id, targetId);
      await refreshConversation();
      toast.success('Member removed');
    } catch (error: any) {
      console.error('[ConversationActionsSheet] Failed to remove member:', error);
      toast.error(error?.message || 'Failed to remove member');
    } finally {
      setMutating(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!currentConversation?.$id) return;

    setMutating(true);
    try {
      await ChatService.deleteConversationFully(currentConversation.$id);
      onConversationDeleted?.(currentConversation.$id);
      toast.success('Group deleted');
      setDeleteConfirmOpen(false);
      onClose();
    } catch (error: any) {
      console.error('[ConversationActionsSheet] Failed to delete group:', error);
      toast.error(error?.message || 'Failed to delete group');
    } finally {
      setMutating(false);
    }
  };

  if (!open || !currentConversation) return null;

  if (isDirect) {
    return (
      <>
        <Dialog
          open={open}
          onClose={onClose}
          fullScreen={isMobile}
          fullWidth
          maxWidth="xs"
          PaperProps={{
            sx: {
              bgcolor: '#161412',
              backgroundImage: 'none',
              borderRadius: isMobile ? 0 : '24px',
              border: '1px solid rgba(255,255,255,0.08)',
            },
          }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Typography sx={{ fontWeight: 900, fontFamily: 'var(--font-clash)' }}>Profile Preview</Typography>
            <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
              <X size={18} />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2} alignItems="center" textAlign="center">
              {directLoading ? (
                <Box sx={{ minHeight: 96, display: 'grid', placeItems: 'center' }}>
                  <Typography variant="body2" sx={{ opacity: 0.6 }}>Loading profile...</Typography>
                </Box>
              ) : (
                <>
                  <ConversationAvatar user={directProfile || { username: currentConversation.name, displayName: currentConversation.name }} />
                  <Box>
                    <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>
                      {directProfile?.displayName || directProfile?.username || currentConversation.name || 'Unknown'}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.65 }}>
                      @{directProfile?.username || currentConversation.otherUserId?.slice(0, 8) || 'unknown'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                    <Button fullWidth variant="contained" startIcon={<MessageCircle size={18} />} onClick={handleOpenDirectChat}>
                      Message
                    </Button>
                    <Button fullWidth variant="outlined" startIcon={<Phone size={18} />} onClick={handleCall} disabled={currentConversation.isSelf}>
                      Call
                    </Button>
                  </Stack>
                  <Button
                    fullWidth
                    variant="text"
                    startIcon={<Shield size={18} />}
                    onClick={handleOpenInfo}
                    disabled={!directProfile?.username}
                    sx={{ color: '#F59E0B' }}
                  >
                    Info
                  </Button>
                </>
              )}
            </Stack>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true,
        }}
        PaperProps={{
          sx: {
            top: '88px',
            bottom: 0,
            height: 'calc(100dvh - 88px)',
            maxHeight: 'calc(100dvh - 88px)',
            borderRadius: '24px 24px 0 0',
            bgcolor: '#161412',
            backgroundImage: 'none',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
            zIndex: 1305,
          },
        }}
      >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pt: { xs: 'env(safe-area-inset-top)', md: 0 } }}>
          <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: alpha('#6366F1', 0.12),
                  color: '#6366F1',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Users size={24} />
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 900, fontFamily: 'var(--font-clash)' }}>
                  {currentConversation.name || 'Group'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.6 }}>
                  {participantIds.length} members
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
              <X size={18} />
            </IconButton>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

          <Box sx={{ px: 2.5, pt: 1.5 }}>
            <Tabs
              value={isAdmin ? memberTab : 'members'}
              onChange={(_, value) => setMemberTab(value as 'members' | 'add' | 'remove')}
              textColor="inherit"
              indicatorColor="secondary"
              variant="fullWidth"
              sx={{
                minHeight: 42,
                '& .MuiTab-root': {
                  minHeight: 42,
                  textTransform: 'none',
                  fontWeight: 800,
                },
              }}
            >
              <Tab value="members" label="Members" />
              {isAdmin && <Tab value="add" label="Add Members" />}
              {isAdmin && <Tab value="remove" label="Remove Members" />}
            </Tabs>
          </Box>

          <DialogContent sx={{ flex: 1, px: 2.5, py: 2, overflowY: 'auto' }}>
            {isAdmin ? null : (
              <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  You can view this group, but only admins can manage members.
                </Typography>
              </Paper>
            )}

            {memberTab === 'members' && (
              <Stack spacing={1}>
                {membersLoading ? (
                  <Typography variant="body2" sx={{ opacity: 0.6 }}>Loading members...</Typography>
                ) : (
                  groupMembers.map((member: any) => {
                    const id = member.userId || member.$id;
                    const isCurrentUser = id === user?.$id;
                    const isCreator = id === currentConversation.creatorId;
                    const isGroupAdmin = currentConversation.admins?.includes(id);
                    return (
                      <Paper
                        key={id}
                        sx={{
                          p: 1.25,
                          bgcolor: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '18px',
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <ListItemAvatar sx={{ minWidth: 0 }}>
                            <MemberAvatar user={member} />
                          </ListItemAvatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 800 }} noWrap>
                              {member.displayName || member.username || 'Unknown'}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.6 }} noWrap>
                              @{member.username || id.slice(0, 8)}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            {isCurrentUser && <Chip size="small" label="You" sx={{ bgcolor: 'rgba(99,102,241,0.12)' }} />}
                            {isCreator && <Chip size="small" label="Creator" sx={{ bgcolor: 'rgba(245,158,11,0.12)' }} />}
                            {isGroupAdmin && <Chip size="small" label="Admin" sx={{ bgcolor: 'rgba(16,185,129,0.12)' }} />}
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })
                )}
              </Stack>
            )}

            {memberTab === 'add' && isAdmin && (
              <Stack spacing={1.5}>
                <TextField
                  fullWidth
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder="Search people to add..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={16} style={{ opacity: 0.5 }} />
                      </InputAdornment>
                    ),
                  }}
                />

                {memberSearching && (
                  <Typography variant="body2" sx={{ opacity: 0.6 }}>Searching...</Typography>
                )}

                {memberResults.map((result: any) => {
                  const id = result.userId || result.$id;
                  return (
                    <Paper key={id} sx={{ p: 1.25, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <MemberAvatar user={result} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800 }} noWrap>
                            {result.displayName || result.username}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.6 }} noWrap>
                            @{result.username}
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<UserPlus size={16} />}
                          onClick={() => void handleAddMember(result)}
                          disabled={mutating}
                        >
                          Add
                        </Button>
                      </Stack>
                    </Paper>
                  );
                })}

                {memberQuery.trim().length >= 2 && !memberSearching && memberResults.length === 0 && (
                  <Typography variant="body2" sx={{ opacity: 0.6, textAlign: 'center', py: 2 }}>
                    No users found
                  </Typography>
                )}
              </Stack>
            )}

            {memberTab === 'remove' && isAdmin && (
              <Stack spacing={1.5}>
                {groupMembers
                  .filter((member: any) => (member.userId || member.$id) !== user?.$id)
                  .map((member: any) => {
                    const id = member.userId || member.$id;
                    const isCreator = id === currentConversation.creatorId;
                    return (
                      <Paper key={id} sx={{ p: 1.25, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <MemberAvatar user={member} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 800 }} noWrap>
                              {member.displayName || member.username}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.6 }} noWrap>
                              @{member.username}
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<UserMinus size={16} />}
                            onClick={() => void handleRemoveMember(member)}
                            disabled={mutating || isCreator}
                          >
                            Remove
                          </Button>
                        </Stack>
                      </Paper>
                    );
                  })}
              </Stack>
            )}
          </DialogContent>

          {isAdmin && (
            <Box sx={{ p: 2.5, pt: 0, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Button
                fullWidth
                color="error"
                variant="contained"
                startIcon={<Trash2 size={16} />}
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={mutating}
              >
                Delete Group
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            bgcolor: '#161412',
            backgroundImage: 'none',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: isMobile ? 0 : '20px',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Delete group?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            This will permanently delete the group, its messages, membership rows, and conversation record.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={() => void handleDeleteGroup()} disabled={mutating}>
            Delete Forever
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
