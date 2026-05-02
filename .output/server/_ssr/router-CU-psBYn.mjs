import { o as __toESM } from "../_runtime.mjs";
import { t as getRequest } from "./request-response-2TQubZMA.mjs";
import { o as Query } from "../_libs/appwrite.mjs";
import { c as realtime, i as databases, l as resolveCurrentUser, t as APPWRITE_CONFIG } from "./client-bVtyOxJQ.mjs";
import { t as GoogleGenerativeAI } from "../_libs/google__generative-ai.mjs";
import { n as ecosystemSecurity, t as MeshProtocol } from "./security-DTzL0999.mjs";
import { o as require_react } from "../_libs/@emotion/react+[...].mjs";
import { a as createRouter, c as createRootRoute, n as Scripts, o as lazyRouteComponent, r as HeadContent, s as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { J as alpha, U as createTheme, xt as require_jsx_runtime } from "../_libs/@mui/icons-material+[...].mjs";
import { B as Box, K as Typography, M as CssBaseline, X as Paper, Z as ThemeProvider, s as Stack, t as useMediaQuery, z as Button } from "../_libs/@mui/material+[...].mjs";
import { i as useAuth, o as usePathname, t as ChatService } from "./chat-GLmU6cBO.mjs";
import { t as Fe } from "../_libs/react-hot-toast.mjs";
import { f as ProfileProvider, m as SudoProvider, n as ChatNotificationProvider, o as IslandProvider, r as DataNexusProvider, t as AppChromeProvider, u as PotatoProvider } from "./DynamicIsland-DPFhB0ig.mjs";
import { n as PresenceProvider, t as ActivityService } from "./PresenceProvider-C-XMou-3.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-CU-psBYn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var globals_default = "/assets/globals-BXDo2CS9.css";
function useEcosystemNode(nodeId) {
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [neighbors, setNeighbors] = (0, import_react.useState)({});
	const pulseInterval = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const unsubscribe = MeshProtocol.subscribe((msg) => {
			setMessages((prev) => [msg, ...prev].slice(0, 50));
			if (msg.type === "PULSE") setNeighbors((prev) => ({
				...prev,
				[msg.sourceNode]: Date.now()
			}));
			if (msg.type === "COMMAND" && (msg.targetNode === "all" || msg.targetNode === nodeId)) {
				if (msg.payload.action === "LOCK_SYSTEM") console.log(`[Mesh] Received Global Lock from ${msg.sourceNode}`);
			}
		});
		pulseInterval.current = setInterval(() => {
			MeshProtocol.broadcast({
				type: "PULSE",
				targetNode: "all",
				payload: {
					health: 1,
					load: Math.random()
				}
			}, nodeId);
		}, 5e3);
		return () => {
			unsubscribe();
			if (pulseInterval.current) clearInterval(pulseInterval.current);
		};
	}, [nodeId]);
	const sendRPC = (target, method, params) => {
		MeshProtocol.broadcast({
			type: "RPC_REQUEST",
			targetNode: target,
			payload: {
				method,
				params
			}
		}, nodeId);
	};
	const syncState = (payload) => {
		MeshProtocol.broadcast({
			type: "STATE_SYNC",
			targetNode: "all",
			payload
		}, nodeId);
	};
	return {
		messages,
		neighbors,
		sendRPC,
		syncState
	};
}
/**
* EcosystemClient
* Responsible for joining the mesh and initializing the security layer
* for the current node.
*/
function EcosystemClient({ nodeId }) {
	useEcosystemNode(nodeId);
	(0, import_react.useEffect)(() => {
		ecosystemSecurity.init(nodeId);
	}, [nodeId]);
	return null;
}
var SURFACE_BACKGROUND = "#000000";
var SURFACE = "#161514";
var SURFACE_ELEVATED = "#1F1D1B";
var ColorModeContext = (0, import_react.createContext)({
	toggleColorMode: () => {},
	mode: "light"
});
var ThemeProvider$1 = ({ children }) => {
	const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)", { noSsr: true });
	const [mode, setMode] = (0, import_react.useState)("light");
	useEcosystemNode("connect");
	(0, import_react.useEffect)(() => {
		const saved = localStorage.getItem("kylrixconnect-theme");
		requestAnimationFrame(() => {
			if (saved) setMode(saved);
			else setMode(prefersDarkMode ? "dark" : "light");
		});
	}, [prefersDarkMode]);
	(0, import_react.useEffect)(() => {
		localStorage.setItem("kylrixconnect-theme", mode);
		document.documentElement.classList.remove("light", "dark");
		document.documentElement.classList.add(mode);
	}, [mode]);
	const colorMode = (0, import_react.useMemo)(() => ({
		toggleColorMode: () => {
			setMode((prevMode) => prevMode === "light" ? "dark" : "light");
		},
		mode
	}), [mode]);
	const theme = (0, import_react.useMemo)(() => createTheme({
		palette: {
			mode: "dark",
			primary: {
				main: "#6366F1",
				contrastText: "#000000"
			},
			secondary: { main: "#F59E0B" },
			background: {
				default: SURFACE_BACKGROUND,
				paper: SURFACE
			},
			text: {
				primary: "#F2F2F2",
				secondary: "#A1A1AA",
				disabled: "#404040"
			},
			divider: "rgba(255, 255, 255, 0.05)"
		},
		shape: { borderRadius: 16 },
		typography: {
			fontFamily: "var(--font-satoshi), \"Satoshi\", sans-serif",
			h1: {
				fontFamily: "var(--font-clash), \"Clash Display\", sans-serif",
				fontSize: "3.5rem",
				fontWeight: 900,
				letterSpacing: "-0.04em",
				color: "#F2F2F2"
			},
			h2: {
				fontFamily: "var(--font-clash), \"Clash Display\", sans-serif",
				fontSize: "2.5rem",
				fontWeight: 900,
				letterSpacing: "-0.03em"
			},
			h3: {
				fontFamily: "var(--font-clash), \"Clash Display\", sans-serif",
				fontSize: "2rem",
				fontWeight: 800,
				letterSpacing: "-0.02em"
			},
			h4: {
				fontFamily: "var(--font-clash), \"Clash Display\", sans-serif",
				fontSize: "1.5rem",
				fontWeight: 800
			},
			h5: {
				fontFamily: "var(--font-clash), \"Clash Display\", sans-serif",
				fontSize: "1.25rem",
				fontWeight: 800
			},
			h6: {
				fontFamily: "var(--font-clash), \"Clash Display\", sans-serif",
				fontSize: "1.1rem",
				fontWeight: 800
			},
			body1: {
				fontSize: "1rem",
				fontWeight: 400,
				lineHeight: 1.6
			},
			body2: {
				fontSize: "0.875rem",
				fontWeight: 400
			},
			caption: {
				fontSize: "0.75rem",
				color: "#A1A1AA"
			},
			button: {
				fontFamily: "var(--font-clash), \"Clash Display\", sans-serif",
				textTransform: "none",
				fontWeight: 700
			}
		},
		shadows: Array(25).fill("none"),
		components: {
			MuiCssBaseline: { styleOverrides: { body: {
				backgroundColor: SURFACE_BACKGROUND,
				color: "#F2F2F2",
				scrollbarColor: "#222222 transparent",
				"&::-webkit-scrollbar, & *::-webkit-scrollbar": {
					width: 6,
					height: 6
				},
				"&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
					borderRadius: 12,
					backgroundColor: "#222222",
					"&:hover": { backgroundColor: "#404040" }
				}
			} } },
			MuiAppBar: { styleOverrides: { root: {
				backgroundColor: SURFACE,
				borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
				boxShadow: "none"
			} } },
			MuiDrawer: { styleOverrides: { paper: {
				backgroundColor: SURFACE_BACKGROUND,
				borderRight: "1px solid rgba(255, 255, 255, 0.05)"
			} } },
			MuiButton: { styleOverrides: {
				root: {
					borderRadius: 12,
					padding: "10px 20px",
					transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
					border: "1px solid rgba(255, 255, 255, 0.05)",
					position: "relative",
					"&::before": {
						content: "\"\"",
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						height: "1px",
						background: "rgba(255, 255, 255, 0.05)",
						borderRadius: "12px"
					},
					"&:hover": {
						borderColor: "rgba(255, 255, 255, 0.1)",
						backgroundColor: "rgba(255, 255, 255, 0.03)"
					},
					"&:active": { transform: "scale(0.98)" }
				},
				containedPrimary: {
					backgroundColor: "#6366F1",
					color: "#000000",
					border: "none",
					fontWeight: 800,
					boxShadow: "0 1px 0 rgba(0, 0, 0, 0.4)",
					"&::before": { background: "rgba(255, 255, 255, 0.15)" },
					"&:hover": {
						backgroundColor: alpha("#6366F1", .8),
						boxShadow: "0 8px 24px rgba(99, 102, 241, 0.2), 0 1px 0 rgba(0, 0, 0, 0.4)"
					}
				}
			} },
			MuiCard: { styleOverrides: { root: {
				borderRadius: 24,
				backgroundColor: SURFACE,
				border: "1px solid rgba(255, 255, 255, 0.05)",
				backgroundImage: "none",
				position: "relative",
				boxShadow: "0 1px 0 rgba(0, 0, 0, 0.4)",
				"&::before": {
					content: "\"\"",
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: "1px",
					background: "rgba(255, 255, 255, 0.03)",
					borderRadius: "24px"
				},
				transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
				"&:hover": {
					borderColor: "rgba(99, 102, 241, 0.2)",
					transform: "translateY(-2px)",
					boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(0, 0, 0, 0.4)"
				}
			} } },
			MuiPaper: { styleOverrides: { root: {
				backgroundColor: SURFACE,
				backgroundImage: "none",
				border: "1px solid rgba(255, 255, 255, 0.05)",
				boxShadow: "0 1px 0 rgba(0, 0, 0, 0.4)"
			} } },
			MuiDialog: { styleOverrides: { paper: {
				borderRadius: 24,
				backgroundColor: SURFACE_ELEVATED,
				border: "1px solid rgba(255, 255, 255, 0.06)",
				backgroundImage: "none",
				boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(0, 0, 0, 0.4)",
				position: "relative",
				"&::before": {
					content: "\"\"",
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: "1px",
					background: "rgba(255, 255, 255, 0.03)",
					borderRadius: "24px"
				}
			} } }
		}
	}), []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorModeContext.Provider, {
		value: colorMode,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ThemeProvider, {
			theme,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CssBaseline, {}), children]
		})
	});
};
var NotificationContext = (0, import_react.createContext)(void 0);
var NOTIFICATION_CACHE_KEY = "kylrix_notification_cache_v1";
var NOTIFICATION_CACHE_TTL = 1e3 * 60 * 5;
function NotificationProvider({ children }) {
	const [notifications, setNotifications] = (0, import_react.useState)([]);
	const [unreadCount, setUnreadCount] = (0, import_react.useState)(0);
	const [isLoading, setIsLoading] = (0, import_react.useState)(true);
	const { user } = useAuth();
	const parseMetadata = (details) => {
		if (!details) return {
			read: false,
			originalDetails: null
		};
		try {
			if (details.startsWith("{")) return JSON.parse(details);
		} catch (_e) {}
		return {
			read: false,
			originalDetails: details
		};
	};
	const calculateUnread = (0, import_react.useCallback)((logs) => {
		return logs.filter((log) => !parseMetadata(log.details).read).length;
	}, []);
	const readCachedNotifications = (0, import_react.useCallback)(() => {
		if (typeof window === "undefined") return null;
		try {
			const raw = localStorage.getItem(NOTIFICATION_CACHE_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed?.logs)) return null;
			return {
				logs: parsed.logs,
				cachedAt: Number(parsed.cachedAt) || Date.now()
			};
		} catch {
			return null;
		}
	}, []);
	const saveCachedNotifications = (0, import_react.useCallback)((logs) => {
		if (typeof window === "undefined") return;
		try {
			const payload = {
				logs: logs.slice(0, 50),
				cachedAt: Date.now()
			};
			localStorage.setItem(NOTIFICATION_CACHE_KEY, JSON.stringify(payload));
		} catch {}
	}, []);
	const fetchNotifications = (0, import_react.useCallback)(async () => {
		if (!user?.$id) return;
		const cached = readCachedNotifications();
		if (cached) {
			setNotifications(cached.logs);
			setUnreadCount(calculateUnread(cached.logs));
			setIsLoading(false);
			if (Date.now() - cached.cachedAt < NOTIFICATION_CACHE_TTL) return;
		} else setIsLoading(true);
		try {
			const logs = (await databases.listDocuments(APPWRITE_CONFIG.DATABASES.KYLRIXNOTE, APPWRITE_CONFIG.TABLES.KYLRIXNOTE.ACTIVITY_LOG, [
				Query.equal("userId", user.$id),
				Query.orderDesc("$createdAt"),
				Query.limit(50)
			])).documents;
			setNotifications(logs);
			setUnreadCount(calculateUnread(logs));
			saveCachedNotifications(logs);
		} catch (error) {
			console.error("Failed to fetch notifications:", error);
		} finally {
			setIsLoading(false);
		}
	}, [
		user?.$id,
		calculateUnread,
		readCachedNotifications,
		saveCachedNotifications
	]);
	(0, import_react.useEffect)(() => {
		fetchNotifications();
	}, [fetchNotifications]);
	(0, import_react.useEffect)(() => {
		if (!user?.$id) return;
		const channel = `databases.${APPWRITE_CONFIG.DATABASES.KYLRIXNOTE}.collections.${APPWRITE_CONFIG.TABLES.KYLRIXNOTE.ACTIVITY_LOG}.documents`;
		const unsub = realtime.subscribe(channel, (response) => {
			const payload = response.payload;
			if (payload.userId !== user.$id) return;
			const isCreate = response.events.some((e) => e.includes(".create"));
			const isUpdate = response.events.some((e) => e.includes(".update"));
			if (isCreate) {
				setNotifications((prev) => {
					const next = [payload, ...prev];
					saveCachedNotifications(next);
					return next;
				});
				if (!parseMetadata(payload.details).read) setUnreadCount((prev) => prev + 1);
				if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(`Kylrix ${payload.targetType}`, { body: payload.action });
			} else if (isUpdate) setNotifications((prev) => {
				const updated = prev.map((n) => n.$id === payload.$id ? payload : n);
				setUnreadCount(calculateUnread(updated));
				saveCachedNotifications(updated);
				return updated;
			});
		});
		return () => {
			if (typeof unsub === "function") unsub();
			else unsub.unsubscribe?.();
		};
	}, [user?.$id, calculateUnread]);
	const markAsRead = async (id) => {
		const notification = notifications.find((n) => n.$id === id);
		if (!notification) return;
		const meta = parseMetadata(notification.details);
		if (meta.read) return;
		const newMetadata = {
			...meta,
			read: true,
			readAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		try {
			setNotifications((prev) => {
				const next = prev.map((n) => n.$id === id ? {
					...n,
					details: JSON.stringify(newMetadata)
				} : n);
				saveCachedNotifications(next);
				return next;
			});
			await databases.updateDocument(APPWRITE_CONFIG.DATABASES.KYLRIXNOTE, APPWRITE_CONFIG.TABLES.KYLRIXNOTE.ACTIVITY_LOG, id, { details: JSON.stringify(newMetadata) });
		} catch (error) {
			console.error("Cloud sync failed:", error);
		}
	};
	const markAllAsRead = async () => {
		notifications.filter((n) => !parseMetadata(n.details).read).forEach((n) => markAsRead(n.$id));
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotificationContext.Provider, {
		value: {
			notifications,
			unreadCount,
			isLoading,
			markAsRead,
			markAllAsRead
		},
		children
	});
}
var AuthOverlay = () => {
	const { user, loading, login } = useAuth();
	const pathname = usePathname();
	if (loading) return null;
	const isPublicRoute = pathname === "/" || pathname?.startsWith("/u/") || pathname?.startsWith("/post/");
	if (!user && !isPublicRoute) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		style: {
			position: "fixed",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: "rgba(0,0,0,0.85)",
			backdropFilter: "blur(10px)",
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			zIndex: 9999
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "glass-panel",
			style: {
				backgroundColor: "var(--color-surface)",
				padding: "48px",
				borderRadius: "var(--radius-macro)",
				textAlign: "center",
				maxWidth: "440px",
				width: "90%",
				boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)"
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					style: {
						marginBottom: "16px",
						color: "var(--color-titanium)",
						fontFamily: "var(--font-mono)",
						fontSize: "2rem",
						fontWeight: "900",
						letterSpacing: "-0.03em"
					},
					children: "Kylrix Connect"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					style: {
						marginBottom: "32px",
						color: "var(--color-gunmetal)",
						fontSize: "1rem",
						lineHeight: "1.5"
					},
					children: "Access the bridge to your private network. Sign in with your Kylrix ID to continue."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: login,
					style: {
						backgroundColor: "var(--color-electric)",
						color: "var(--color-void)",
						border: "none",
						padding: "16px 32px",
						borderRadius: "var(--radius-micro)",
						fontSize: "1rem",
						fontWeight: "800",
						cursor: "pointer",
						width: "100%",
						boxShadow: "0 0 20px rgba(0, 240, 255, 0.3)",
						transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
						textTransform: "uppercase",
						letterSpacing: "0.05em"
					},
					onMouseEnter: (e) => {
						e.currentTarget.style.transform = "translateY(-2px)";
						e.currentTarget.style.boxShadow = "0 0 30px rgba(0, 240, 255, 0.5)";
					},
					onMouseLeave: (e) => {
						e.currentTarget.style.transform = "translateY(0)";
						e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 240, 255, 0.3)";
					},
					children: "Authenticate ID"
				})
			]
		})
	});
	return null;
};
var SubscriptionContext = (0, import_react.createContext)(null);
var SubscriptionProvider = ({ children }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubscriptionContext.Provider, {
		value: { status: "active" },
		children
	});
};
var Route$14 = createRootRoute({
	errorComponent: RootErrorComponent,
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover"
			},
			{ title: "Kylrix Connect" },
			{
				name: "description",
				content: "Kylrix Connect on TanStack Start."
			}
		],
		links: [{
			rel: "stylesheet",
			href: globals_default
		}]
	}),
	shellComponent: RootDocument
});
function RootErrorComponent({ error, info, reset }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
		sx: {
			minHeight: "100vh",
			bgcolor: "#000",
			color: "#fff",
			p: 3
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Paper, {
			sx: {
				p: 3,
				bgcolor: "#161412",
				border: "1px solid rgba(255,255,255,0.08)"
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Stack, {
				spacing: 2,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						variant: "h5",
						sx: { fontWeight: 800 },
						children: "App error"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						variant: "body2",
						sx: { color: "rgba(255,255,255,0.7)" },
						children: error.message
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
						component: "pre",
						sx: {
							m: 0,
							whiteSpace: "pre-wrap",
							fontSize: 12,
							fontFamily: "monospace",
							color: "rgba(255,255,255,0.75)"
						},
						children: [
							error.stack,
							"\n",
							info?.componentStack
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Stack, {
						direction: "row",
						spacing: 1,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "contained",
							onClick: reset,
							children: "Retry"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outlined",
							onClick: () => window.location.reload(),
							children: "Reload"
						})]
					})
				]
			})
		})
	});
}
function RootDocument({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EcosystemClient, { nodeId: "connect" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataNexusProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubscriptionProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeProvider$1, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppChromeProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SudoProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IslandProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotificationProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresenceProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatNotificationProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PotatoProvider, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthOverlay, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fe, {
					position: "bottom-right",
					toastOptions: { style: {
						background: "#1A1A1A",
						color: "#fff",
						borderRadius: "12px",
						border: "1px solid rgba(255,255,255,0.1)"
					} }
				}),
				children
			] }) }) }) }) }) }) }) }) }) }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	});
}
var $$splitComponentImporter$8 = () => import("./settings-BqIzevRt.mjs");
var $$splitErrorComponentImporter$8 = () => import("./settings-SZ-Yfb7E.mjs");
var Route$13 = createFileRoute("/settings")({
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter$8, "errorComponent"),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./chats-BOPClfHv.mjs");
var $$splitErrorComponentImporter$7 = () => import("./chats-BUFACje1.mjs");
var Route$12 = createFileRoute("/chats")({
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter$7, "errorComponent"),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("./calls-DVoOT09H.mjs");
var $$splitErrorComponentImporter$6 = () => import("./calls-BJUsWNdr.mjs");
var Route$11 = createFileRoute("/calls")({
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter$6, "errorComponent"),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./routes-CEX4jENh.mjs");
var $$splitErrorComponentImporter$5 = () => import("./routes-Cpzrm4M_.mjs");
var Route$10 = createFileRoute("/")({
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter$5, "errorComponent"),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./u._username-BRDOvtdu.mjs");
var $$splitErrorComponentImporter$4 = () => import("./u._username-B0_3D2Kj.mjs");
var Route$9 = createFileRoute("/u/$username")({
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter$4, "errorComponent"),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./post._id-BbgZS1Iy.mjs");
var $$splitErrorComponentImporter$3 = () => import("./post._id-pA0ljDIR.mjs");
var Route$8 = createFileRoute("/post/$id")({
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter$3, "errorComponent"),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./chat._id-WiDHO9vj.mjs");
var $$splitErrorComponentImporter$2 = () => import("./chat._id-PR7mPgbu.mjs");
var Route$7 = createFileRoute("/chat/$id")({
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter$2, "errorComponent"),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./call._id-7XZhCyEg.mjs");
var $$splitErrorComponentImporter$1 = () => import("./call._id-DL3gI4PM.mjs");
var Route$6 = createFileRoute("/call/$id")({
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter$1, "errorComponent"),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./groups.invite._conversationId-Ysp5sHU4.mjs");
var $$splitErrorComponentImporter = () => import("./groups.invite._conversationId-R2q7klXl.mjs");
var Route$5 = createFileRoute("/groups/invite/$conversationId")({
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter, "errorComponent"),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var Route$4 = createFileRoute("/api/ecosystem/chat")({ server: { handlers: {
	POST: async () => {
		try {
			const request = getRequest();
			const user = await resolveCurrentUser(request);
			if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
			const { conversationId, content, type, attachments, appId: _appId } = await request.json();
			if (!conversationId || !content) return Response.json({ error: "Missing conversationId or content" }, { status: 400 });
			const message = await ChatService.sendMessage(conversationId, user.$id, content, type || "text", attachments || [], void 0, void 0, { cookie: request.headers.get("cookie") || void 0 });
			return Response.json({
				success: true,
				messageId: message.$id
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "Internal Server Error";
			return Response.json({ error: message }, { status: 500 });
		}
	},
	GET: async () => {
		try {
			const user = await resolveCurrentUser(getRequest());
			if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
			const result = await ChatService.getConversations(user.$id);
			return Response.json({ conversations: result.rows });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Internal Server Error";
			return Response.json({ error: message }, { status: 500 });
		}
	}
} } });
var Route$3 = createFileRoute("/api/ecosystem/activity")({ server: { handlers: { POST: async () => {
	try {
		const request = getRequest();
		const user = await resolveCurrentUser(request);
		if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
		const body = await request.json();
		const activity = {
			userId: user.$id,
			appId: body.appId,
			action: body.action,
			metadata: body.metadata,
			timestamp: (/* @__PURE__ */ new Date()).toISOString()
		};
		await ActivityService.logActivity(activity);
		const synergies = await ActivityService.analyzeSynergy(user.$id);
		return Response.json({
			success: true,
			synergies
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Internal Server Error";
		return Response.json({ error: message }, { status: 500 });
	}
} } } });
var Route$2 = createFileRoute("/api/calls/tracks")({ server: { handlers: { POST: async () => {
	const { sessionId, tracks } = await getRequest().json();
	const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API;
	const CLOUDFLARE_APP_ID = process.env.NEXT_PUBLIC_CLOUDFLARE_APP_ID;
	if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_APP_ID) return Response.json({ error: "Cloudflare configuration missing" }, { status: 500 });
	try {
		const response = await fetch(`https://rtc.cloudflare.com/v1/apps/${CLOUDFLARE_APP_ID}/sessions/${sessionId}/tracks/new`, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${CLOUDFLARE_API_KEY}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ tracks })
		});
		if (!response.ok) {
			const error = await response.text();
			return Response.json({
				error: "Cloudflare Track Init Failed",
				details: error
			}, { status: response.status });
		}
		const data = await response.json();
		return Response.json(data);
	} catch (e) {
		console.error("Tracks API Error:", e);
		return Response.json({ error: "Internal Server Error" }, { status: 500 });
	}
} } } });
var Route$1 = createFileRoute("/api/calls/session")({ server: { handlers: { POST: async () => {
	const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API;
	const CLOUDFLARE_APP_ID = process.env.NEXT_PUBLIC_CLOUDFLARE_APP_ID;
	if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_APP_ID) return Response.json({ error: "Cloudflare configuration missing" }, { status: 500 });
	try {
		const response = await fetch(`https://rtc.cloudflare.com/v1/apps/${CLOUDFLARE_APP_ID}/sessions/new`, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${CLOUDFLARE_API_KEY}`,
				"Content-Type": "application/json"
			}
		});
		if (!response.ok) {
			const error = await response.text();
			return Response.json({
				error: "Cloudflare Session Init Failed",
				details: error
			}, { status: response.status });
		}
		const data = await response.json();
		return Response.json(data);
	} catch (e) {
		console.error("Session API Error:", e);
		return Response.json({ error: "Internal Server Error" }, { status: 500 });
	}
} } } });
var Route = createFileRoute("/api/ai/generate")({ server: { handlers: { POST: async () => {
	try {
		const request = getRequest();
		const user = await resolveCurrentUser(request);
		if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
		const { prompt, history, systemInstruction } = await request.json();
		const userKey = request.headers.get("x-user-gemini-key");
		const apiKey = userKey || process.env.GOOGLE_API_KEY;
		if (!apiKey) return Response.json({ error: "AI service not configured" }, { status: 500 });
		if (!userKey) {
			const plan = user.prefs?.subscriptionTier || "FREE";
			if (![
				"PRO",
				"ORG",
				"LIFETIME"
			].includes(plan)) return Response.json({ error: "AI features require a Pro account. Upgrade to continue or provide your own API key in settings." }, { status: 403 });
		}
		const genAI = new GoogleGenerativeAI(apiKey);
		const modelName = process.env.GEMINI_MODEL_NAME || "gemini-2.0-flash";
		const model = genAI.getGenerativeModel({
			model: modelName,
			systemInstruction: systemInstruction || "You are Kylrixbot, an intelligent assistant for Kylrixconnect, a premium secure communication and networking app. You represent 'Quiet Power' and 'The Glass Monolith' aesthetic. Be concise, professional, and helpful. Help users communicate more effectively while maintaining privacy."
		});
		if (history && history.length > 0) {
			const result = await model.startChat({ history: history.map((h) => ({
				role: h.role === "assistant" ? "model" : "user",
				parts: [{ text: h.content || h.text }]
			})) }).sendMessage(prompt);
			return Response.json({ text: result.response.text() });
		}
		const result = await model.generateContent(prompt);
		return Response.json({ text: result.response.text() });
	} catch (error) {
		console.error("AI Generation Error:", error);
		const message = error instanceof Error ? error.message : "Internal Server Error";
		return Response.json({ error: message }, { status: 500 });
	}
} } } });
var SettingsRoute = Route$13.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => Route$14
});
var ChatsRoute = Route$12.update({
	id: "/chats",
	path: "/chats",
	getParentRoute: () => Route$14
});
var CallsRoute = Route$11.update({
	id: "/calls",
	path: "/calls",
	getParentRoute: () => Route$14
});
var IndexRoute = Route$10.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$14
});
var UUsernameRoute = Route$9.update({
	id: "/u/$username",
	path: "/u/$username",
	getParentRoute: () => Route$14
});
var PostIdRoute = Route$8.update({
	id: "/post/$id",
	path: "/post/$id",
	getParentRoute: () => Route$14
});
var ChatIdRoute = Route$7.update({
	id: "/chat/$id",
	path: "/chat/$id",
	getParentRoute: () => Route$14
});
var CallIdRoute = Route$6.update({
	id: "/call/$id",
	path: "/call/$id",
	getParentRoute: () => Route$14
});
var GroupsInviteConversationIdRoute = Route$5.update({
	id: "/groups/invite/$conversationId",
	path: "/groups/invite/$conversationId",
	getParentRoute: () => Route$14
});
var ApiEcosystemChatRouteRoute = Route$4.update({
	id: "/api/ecosystem/chat",
	path: "/api/ecosystem/chat",
	getParentRoute: () => Route$14
});
var ApiEcosystemActivityRouteRoute = Route$3.update({
	id: "/api/ecosystem/activity",
	path: "/api/ecosystem/activity",
	getParentRoute: () => Route$14
});
var ApiCallsTracksRouteRoute = Route$2.update({
	id: "/api/calls/tracks",
	path: "/api/calls/tracks",
	getParentRoute: () => Route$14
});
var ApiCallsSessionRouteRoute = Route$1.update({
	id: "/api/calls/session",
	path: "/api/calls/session",
	getParentRoute: () => Route$14
});
var rootRouteChildren = {
	IndexRoute,
	CallsRoute,
	ChatsRoute,
	SettingsRoute,
	CallIdRoute,
	ChatIdRoute,
	PostIdRoute,
	UUsernameRoute,
	ApiAiGenerateRouteRoute: Route.update({
		id: "/api/ai/generate",
		path: "/api/ai/generate",
		getParentRoute: () => Route$14
	}),
	ApiCallsSessionRouteRoute,
	ApiCallsTracksRouteRoute,
	ApiEcosystemActivityRouteRoute,
	ApiEcosystemChatRouteRoute,
	GroupsInviteConversationIdRoute
};
var routeTree = Route$14._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0
	});
}
//#endregion
export { getRouter };
