'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { UsersService } from '@/lib/services/users';
import { 
    Box, 
    Typography, 
    Container, 
    TextField, 
    InputAdornment, 
    Grid, 
    Card, 
    CardContent, 
    Avatar, 
    Button,
    CircularProgress,
    Link
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useRouter } from 'next/navigation';

export default function DiscoverPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    useEffect(() => {
        loadInitialUsers();
    }, []);

    const loadInitialUsers = async () => {
        setLoading(true);
        try {
            // For discovery, we list recent users or search all
            const res = await UsersService.searchUsers('');
            setUsers(res.rows);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await UsersService.searchUsers(searchQuery);
            setUsers(res.rows);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppShell>
            <Container maxWidth="lg" sx={{ py: 6 }}>
                <Box sx={{ mb: 6, textAlign: 'center' }}>
                    <Typography variant="h3" fontWeight="bold" gutterBottom>
                        Discover the Ecosystem
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                        Find and connect with awesome people across Whisperr
                    </Typography>

                    <Box 
                        component="form" 
                        onSubmit={handleSearch}
                        sx={{ maxWidth: 600, mx: 'auto' }}
                    >
                        <TextField
                            fullWidth
                            placeholder="Search by @username..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                    sx: { borderRadius: 10, bgcolor: 'background.paper' }
                                }
                            }}
                        />
                    </Box>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {users.map((user) => (
                            <Grid item xs={12} sm={6} md={4} key={user.$id}>
                                <Card 
                                    sx={{ 
                                        borderRadius: 4, 
                                        transition: 'transform 0.2s',
                                        '&:hover': { transform: 'translateY(-4px)', cursor: 'pointer' }
                                    }}
                                    variant="outlined"
                                    onClick={() => router.push(`/u/${user.username}`)}
                                >
                                    <CardContent sx={{ textAlign: 'center', p: 4 }}>
                                        <Avatar 
                                            src={user.avatarUrl}
                                            sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}
                                        >
                                            {user.username?.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Typography variant="h6" fontWeight="bold">
                                            {user.displayName || user.username}
                                        </Typography>
                                        <Typography color="primary" sx={{ fontWeight: 600, mb: 2 }}>
                                            @{user.username}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ 
                                            mb: 3, 
                                            display: '-webkit-box', 
                                            WebkitLineClamp: 2, 
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            height: '3em'
                                        }}>
                                            {user.bio || 'Sharing notes and connecting on Whisperr.'}
                                        </Typography>
                                        <Button 
                                            fullWidth 
                                            variant="outlined" 
                                            startIcon={<PersonAddIcon />}
                                            sx={{ borderRadius: 5 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/u/${user.username}`);
                                            }}
                                        >
                                            Connect
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {!loading && users.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="h6" color="text.secondary">No users found matching your search.</Typography>
                    </Box>
                )}
            </Container>
        </AppShell>
    );
}
