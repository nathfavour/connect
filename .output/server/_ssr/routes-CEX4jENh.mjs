import { o as __toESM } from "../_runtime.mjs";
import { n as UsersService, o as seedIdentityCache, r as getCachedIdentityById, s as subscribeIdentityCache } from "./users-vRrLGFai.mjs";
import { o as require_react } from "../_libs/@emotion/react+[...].mjs";
import { H as useTheme, J as alpha, a as Event_default, d as Close_default, i as LocationOn_default, n as Language_default, o as OpenInNew_default, r as AccessTime_default, s as Description_default, xt as require_jsx_runtime } from "../_libs/@mui/icons-material+[...].mjs";
import { A as DialogActions, B as Box, D as Divider, E as Drawer, F as CardHeader, H as Avatar, I as CardContent, J as IconButton, K as Typography, L as CardActions, N as Container, O as DialogTitle$1, R as Card, S as Link, T as Fab, U as InputBase, X as Paper, Y as CircularProgress, _ as ListItemIcon, f as Skeleton, g as ListItemText, k as DialogContent, m as Menu, n as TextField, p as MenuItem, s as Stack, t as useMediaQuery, u as Tooltip, x as List, y as ListItem, z as Button } from "../_libs/@mui/material+[...].mjs";
import { i as useAuth, s as useRouter, t as ChatService } from "./chat-GLmU6cBO.mjs";
import { t as CallService } from "./call-DhmbyQFj.mjs";
import { A as Plus, B as MessageCircle, C as Share, E as Search, Et as Bookmark, O as Repeat2, Q as Heart, T as Send, Tt as Calendar, V as MapPin, Y as Image, _t as CircleAlert, at as FileCheck, g as SquarePen, i as Video, it as FileText, j as Phone, lt as Ellipsis, n as X, p as Trash2, pt as Clock } from "../_libs/lucide-react.mjs";
import { t as FormattedText } from "./FormattedText-D8u0iX80.mjs";
import { r as zt } from "../_libs/react-hot-toast.mjs";
import { t as motion } from "../_libs/framer-motion+[...].mjs";
import { C as useCachedProfilePreview, O as useProfile, S as useAppChrome, _ as fetchProfilePreview } from "./DynamicIsland-DPFhB0ig.mjs";
import { i as getUserSubscriptionTier, t as AppShell } from "./AppShell-JgOEZgrs.mjs";
import { n as showUpgradeIsland, t as EcosystemService } from "./upgrade-island-DBox53k5.mjs";
import { n as SocialService, s as seedMomentPreview, t as ActorsListDrawer } from "./ActorsListDrawer-NQvy58wX.mjs";
import { n as resolveIdentity, r as resolveIdentityUsername, t as formatPostTimestamp } from "./time-pgZ5YIc8.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CEX4jENh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FastDraftInput = (0, import_react.forwardRef)(function FastDraftInput({ initialValue = "", placeholder, rows = 3, autoFocus = false, onEmptyChange }, ref) {
	const inputRef = (0, import_react.useRef)(null);
	const lastEmptyRef = (0, import_react.useRef)(!initialValue.trim());
	(0, import_react.useEffect)(() => {
		if (!autoFocus) return;
		const frame = window.requestAnimationFrame(() => {
			inputRef.current?.focus();
		});
		return () => window.cancelAnimationFrame(frame);
	}, [autoFocus]);
	(0, import_react.useEffect)(() => {
		onEmptyChange?.(lastEmptyRef.current);
	}, [onEmptyChange]);
	(0, import_react.useImperativeHandle)(ref, () => ({
		getValue: () => inputRef.current?.value || "",
		setValue: (value) => {
			const next = value ?? "";
			if (inputRef.current) {
				inputRef.current.value = next;
				inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
			}
		},
		clear: () => {
			if (inputRef.current) {
				inputRef.current.value = "";
				inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
			}
		},
		focus: () => inputRef.current?.focus()
	}), []);
	const syncEmptyState = (value) => {
		const isEmpty = !value.trim();
		if (isEmpty === lastEmptyRef.current) return;
		lastEmptyRef.current = isEmpty;
		onEmptyChange?.(isEmpty);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
		component: "textarea",
		ref: inputRef,
		defaultValue: initialValue,
		placeholder,
		rows,
		onInput: (e) => syncEmptyState(e.currentTarget.value),
		sx: {
			width: "100%",
			border: "none",
			outline: "none",
			resize: "none",
			background: "transparent",
			color: "text.primary",
			font: "inherit",
			fontSize: "1.1rem",
			fontWeight: 500,
			lineHeight: 1.6,
			padding: 0,
			minHeight: `${rows * 1.6}em`,
			"&::placeholder": {
				color: alpha("#FFFFFF", .36),
				opacity: 1
			}
		}
	});
});
var NoteSelectorModal = ({ open, onClose, onSelect }) => {
	const isMobile = useMediaQuery(useTheme().breakpoints.down("md"));
	const { user } = useAuth();
	const [notes, setNotes] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
	const loadNotes = (0, import_react.useCallback)(async () => {
		if (!user?.$id) return;
		setLoading(true);
		try {
			setNotes((await EcosystemService.listNotes(user.$id)).rows.filter((n) => n.isPublic === true));
		} catch (error) {
			console.error("Failed to load notes:", error);
		} finally {
			setLoading(false);
		}
	}, [user?.$id]);
	(0, import_react.useEffect)(() => {
		if (open && user) loadNotes();
	}, [
		open,
		user,
		loadNotes
	]);
	const filteredNotes = notes.filter((note) => note.title?.toLowerCase().includes(searchQuery.toLowerCase()) || note.content?.toLowerCase().includes(searchQuery.toLowerCase()));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer, {
		anchor: isMobile ? "bottom" : "right",
		open,
		onClose,
		PaperProps: { sx: {
			width: isMobile ? "100%" : "min(100vw, 500px)",
			maxWidth: "100%",
			height: isMobile ? "auto" : "100%",
			maxHeight: isMobile ? "92dvh" : "100%",
			borderRadius: isMobile ? "28px 28px 0 0" : "0",
			bgcolor: "rgba(10, 10, 10, 0.9)",
			backdropFilter: "blur(25px) saturate(180%)",
			border: "1px solid rgba(255, 255, 255, 0.1)",
			backgroundImage: "none",
			boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
			overflow: "hidden",
			display: "flex",
			flexDirection: "column"
		} },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
				sx: {
					p: 3,
					pb: 2,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
					flexShrink: 0
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						alignItems: "center",
						gap: 2
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
						sx: {
							p: 1,
							borderRadius: "12px",
							bgcolor: alpha("#6366F1", .1),
							color: "#6366F1",
							display: "flex"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, {
							size: 24,
							strokeWidth: 1.5
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						variant: "h6",
						sx: {
							fontWeight: 900,
							fontFamily: "var(--font-space-grotesk)",
							letterSpacing: "-0.02em",
							lineHeight: 1.2
						},
						children: "Attach Cognitive Note"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						variant: "caption",
						sx: {
							color: "rgba(255, 255, 255, 0.4)",
							fontWeight: 600
						},
						children: "Select a public note from your Kylrix Note vault"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
					onClick: onClose,
					sx: {
						color: "rgba(255, 255, 255, 0.3)",
						"&:hover": {
							color: "white",
							bgcolor: "rgba(255, 255, 255, 0.05)"
						}
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 20 })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
				sx: {
					p: 3,
					mt: 1,
					flex: 1,
					overflowY: "auto"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						alignItems: "center",
						bgcolor: "rgba(255, 255, 255, 0.03)",
						border: "1px solid rgba(255, 255, 255, 0.08)",
						borderRadius: "16px",
						px: 2,
						py: 1,
						mb: 3,
						transition: "all 0.2s ease",
						"&:focus-within": {
							borderColor: alpha("#6366F1", .5),
							bgcolor: "rgba(255, 255, 255, 0.05)"
						}
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							size: 18,
							color: "rgba(255, 255, 255, 0.3)",
							strokeWidth: 1.5
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, { sx: { width: 12 } }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputBase, {
							autoFocus: true,
							placeholder: "Search your notes...",
							fullWidth: true,
							value: searchQuery,
							onChange: (e) => setSearchQuery(e.target.value),
							sx: {
								color: "white",
								fontSize: "0.95rem",
								fontWeight: 500,
								"& .MuiInputBase-input::placeholder": {
									color: "rgba(255, 255, 255, 0.3)",
									opacity: 1
								}
							}
						})
					]
				}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						py: 8,
						gap: 2
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircularProgress, {
						size: 32,
						sx: { color: "#6366F1" }
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						variant: "caption",
						sx: {
							color: "rgba(255, 255, 255, 0.4)",
							fontWeight: 700,
							letterSpacing: "0.1em"
						},
						children: "ACCESSING VAULT..."
					})]
				}) : filteredNotes.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
					sx: { pt: 0 },
					children: filteredNotes.map((note) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ListItem, {
						component: "div",
						onClick: () => {
							onSelect(note);
							onClose();
						},
						sx: {
							cursor: "pointer",
							borderRadius: "16px",
							p: 2,
							mb: 1.5,
							border: "1px solid rgba(255, 255, 255, 0.05)",
							bgcolor: "rgba(255, 255, 255, 0.01)",
							transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
							"&:hover": {
								bgcolor: "rgba(255, 255, 255, 0.04)",
								borderColor: alpha("#6366F1", .3),
								transform: "translateX(4px)"
							}
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListItemIcon, {
							sx: { minWidth: 48 },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
								sx: {
									width: 36,
									height: 36,
									borderRadius: "10px",
									bgcolor: "rgba(255, 255, 255, 0.03)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "#6366F1"
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileCheck, {
									size: 20,
									strokeWidth: 1.5
								})
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListItemText, {
							primary: note.title || "Untitled Note",
							secondary: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
								variant: "caption",
								noWrap: true,
								sx: {
									color: "rgba(255, 255, 255, 0.4)",
									display: "block",
									mt: .5,
									overflow: "hidden",
									textOverflow: "ellipsis"
								},
								children: note.content?.substring(0, 100).replace(/[#*`]/g, "")
							}),
							primaryTypographyProps: { sx: {
								fontWeight: 800,
								color: "white",
								fontSize: "0.95rem"
							} }
						})]
					}, note.$id))
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						textAlign: "center",
						py: 8,
						px: 4
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
							sx: {
								mb: 2,
								color: "rgba(255, 255, 255, 0.1)"
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, {
								size: 48,
								strokeWidth: 1
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							sx: {
								color: "white",
								fontWeight: 800,
								mb: 1
							},
							children: searchQuery ? "NO_MATCHING_NOTES" : "VAULT_EMPTY_OR_PRIVATE"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							variant: "body2",
							sx: {
								color: "rgba(255, 255, 255, 0.4)",
								lineHeight: 1.6
							},
							children: searchQuery ? `No public notes found matching "${searchQuery}".` : "Only notes marked as \"Public\" in Kylrix Note can be shared in the ecosystem feed."
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				sx: {
					p: 3,
					pt: 0,
					display: "flex",
					gap: 1,
					borderTop: "1px solid rgba(255, 255, 255, 0.05)",
					flexShrink: 0
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: onClose,
					sx: {
						borderRadius: "12px",
						px: 3,
						color: "rgba(255, 255, 255, 0.5)",
						fontWeight: 700,
						textTransform: "none",
						"&:hover": {
							color: "white",
							bgcolor: "rgba(255, 255, 255, 0.05)"
						}
					},
					children: "Cancel"
				})
			})
		]
	});
};
var NoteViewDrawer = ({ open, onClose, note }) => {
	if (!note) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer, {
		anchor: "right",
		open,
		onClose,
		PaperProps: { sx: {
			width: {
				xs: "100%",
				sm: 450
			},
			bgcolor: "background.default",
			borderLeft: "1px solid rgba(255, 255, 255, 0.08)"
		} },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
			sx: {
				p: 3,
				display: "flex",
				flexDirection: "column",
				height: "100%"
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						alignItems: "center",
						mb: 3
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Description_default, {
							color: "primary",
							sx: {
								mr: 1.5,
								fontSize: 28
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							variant: "h6",
							fontWeight: 800,
							sx: { flex: 1 },
							children: "Shared Note"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
							onClick: onClose,
							size: "small",
							sx: { bgcolor: "rgba(255, 255, 255, 0.05)" },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Close_default, { fontSize: "small" })
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Paper, {
					elevation: 0,
					variant: "outlined",
					sx: {
						p: 3,
						borderRadius: 4,
						bgcolor: "rgba(255, 255, 255, 0.02)",
						mb: 4
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							variant: "h5",
							fontWeight: 900,
							gutterBottom: true,
							sx: { color: "primary.main" },
							children: note.title || "Untitled Note"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
							variant: "caption",
							color: "text.disabled",
							sx: {
								display: "block",
								mb: 3
							},
							children: ["Last updated: ", new Date(note.updatedAt || note.$updatedAt).toLocaleDateString()]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Divider, { sx: {
							mb: 3,
							opacity: .1
						} }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
							sx: {
								color: "text.secondary",
								lineHeight: 1.8,
								whiteSpace: "pre-wrap",
								fontFamily: "var(--font-inter)",
								fontSize: "1rem"
							},
							children: note.content
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						mt: "auto",
						display: "flex",
						gap: 2
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						fullWidth: true,
						variant: "outlined",
						startIcon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OpenInNew_default, {}),
						component: "a",
						href: `/notes/shared/${note.$id || note.id}`,
						target: "_blank",
						sx: {
							borderRadius: 3,
							py: 1.5,
							fontWeight: 700
						},
						children: "Shared View"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						fullWidth: true,
						variant: "contained",
						color: "primary",
						component: "a",
						href: `http://localhost:3002/note/${note.$id || note.id}`,
						target: "_blank",
						sx: {
							borderRadius: 3,
							py: 1.5,
							fontWeight: 800,
							color: "black"
						},
						children: "Open in Note"
					})]
				})
			]
		})
	});
};
var EventSelectorModal = ({ open, onClose, onSelect }) => {
	const isMobile = useMediaQuery(useTheme().breakpoints.down("md"));
	const { user } = useAuth();
	const [events, setEvents] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
	const loadEvents = (0, import_react.useCallback)(async () => {
		if (!user?.$id) return;
		setLoading(true);
		try {
			setEvents((await EcosystemService.listEvents(user.$id)).rows.filter((e) => e.visibility === "public"));
		} catch (error) {
			console.error("Failed to load events:", error);
		} finally {
			setLoading(false);
		}
	}, [user]);
	(0, import_react.useEffect)(() => {
		if (open && user) loadEvents();
	}, [
		open,
		user,
		loadEvents
	]);
	const filteredEvents = events.filter((event) => event.title?.toLowerCase().includes(searchQuery.toLowerCase()) || event.description?.toLowerCase().includes(searchQuery.toLowerCase()));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer, {
		anchor: isMobile ? "bottom" : "right",
		open,
		onClose,
		PaperProps: { sx: {
			width: isMobile ? "100%" : "min(100vw, 500px)",
			maxWidth: "100%",
			height: isMobile ? "auto" : "100%",
			maxHeight: isMobile ? "92dvh" : "100%",
			borderRadius: isMobile ? "28px 28px 0 0" : "0",
			bgcolor: "rgba(10, 10, 10, 0.9)",
			backdropFilter: "blur(25px) saturate(180%)",
			border: "1px solid rgba(255, 255, 255, 0.1)",
			backgroundImage: "none",
			boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
			overflow: "hidden",
			display: "flex",
			flexDirection: "column"
		} },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
				sx: {
					p: 3,
					pb: 2,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
					flexShrink: 0
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						alignItems: "center",
						gap: 2
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
						sx: {
							p: 1,
							borderRadius: "12px",
							bgcolor: alpha("#00A3FF", .1),
							color: "#00A3FF",
							display: "flex"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, {
							size: 24,
							strokeWidth: 1.5
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						variant: "h6",
						sx: {
							fontWeight: 900,
							fontFamily: "var(--font-space-grotesk)",
							letterSpacing: "-0.02em",
							lineHeight: 1.2
						},
						children: "Attach Orchestrated Event"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						variant: "caption",
						sx: {
							color: "rgba(255, 255, 255, 0.4)",
							fontWeight: 600
						},
						children: "Select a public event from your Kylrix Flow calendar"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
					onClick: onClose,
					sx: {
						color: "rgba(255, 255, 255, 0.3)",
						"&:hover": {
							color: "white",
							bgcolor: "rgba(255, 255, 255, 0.05)"
						}
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 20 })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
				sx: {
					p: 3,
					mt: 1,
					flex: 1,
					overflowY: "auto"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						alignItems: "center",
						bgcolor: "rgba(255, 255, 255, 0.03)",
						border: "1px solid rgba(255, 255, 255, 0.08)",
						borderRadius: "16px",
						px: 2,
						py: 1,
						mb: 3,
						transition: "all 0.2s ease",
						"&:focus-within": {
							borderColor: alpha("#00A3FF", .5),
							bgcolor: "rgba(255, 255, 255, 0.05)"
						}
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							size: 18,
							color: "rgba(255, 255, 255, 0.3)",
							strokeWidth: 1.5
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, { sx: { width: 12 } }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputBase, {
							autoFocus: true,
							placeholder: "Search your events...",
							fullWidth: true,
							value: searchQuery,
							onChange: (e) => setSearchQuery(e.target.value),
							sx: {
								color: "white",
								fontSize: "0.95rem",
								fontWeight: 500,
								"& .MuiInputBase-input::placeholder": {
									color: "rgba(255, 255, 255, 0.3)",
									opacity: 1
								}
							}
						})
					]
				}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						py: 8,
						gap: 2
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircularProgress, {
						size: 32,
						sx: { color: "#00A3FF" }
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						variant: "caption",
						sx: {
							color: "rgba(255, 255, 255, 0.4)",
							fontWeight: 700,
							letterSpacing: "0.1em"
						},
						children: "SYNCING CALENDAR..."
					})]
				}) : filteredEvents.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
					sx: { pt: 0 },
					children: filteredEvents.map((event) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ListItem, {
						component: "div",
						onClick: () => {
							onSelect(event);
							onClose();
						},
						sx: {
							cursor: "pointer",
							borderRadius: "16px",
							p: 2,
							mb: 1.5,
							border: "1px solid rgba(255, 255, 255, 0.05)",
							bgcolor: "rgba(255, 255, 255, 0.01)",
							transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
							"&:hover": {
								bgcolor: "rgba(255, 255, 255, 0.04)",
								borderColor: alpha("#00A3FF", .3),
								transform: "translateX(4px)"
							}
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListItemIcon, {
							sx: { minWidth: 48 },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
								sx: {
									width: 36,
									height: 36,
									borderRadius: "10px",
									bgcolor: "rgba(255, 255, 255, 0.03)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "#00A3FF"
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, {
									size: 20,
									strokeWidth: 1.5
								})
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListItemText, {
							primary: event.title || "Untitled Event",
							secondary: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
								sx: {
									display: "flex",
									flexDirection: "column",
									gap: .5,
									mt: .5
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
									sx: {
										display: "flex",
										alignItems: "center",
										gap: 1,
										color: "rgba(255, 255, 255, 0.4)"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 12 }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
										variant: "caption",
										sx: { fontWeight: 600 },
										children: [
											new Date(event.startTime).toLocaleDateString(),
											" • ",
											new Date(event.startTime).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit"
											})
										]
									})]
								}), event.location && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
									sx: {
										display: "flex",
										alignItems: "center",
										gap: 1,
										color: "rgba(255, 255, 255, 0.4)"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { size: 12 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
										variant: "caption",
										sx: { fontWeight: 600 },
										children: event.location
									})]
								})]
							}),
							primaryTypographyProps: { sx: {
								fontWeight: 800,
								color: "white",
								fontSize: "0.95rem"
							} }
						})]
					}, event.$id))
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						textAlign: "center",
						py: 8,
						px: 4
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
							sx: {
								mb: 2,
								color: "rgba(255, 255, 255, 0.1)"
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, {
								size: 48,
								strokeWidth: 1
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							sx: {
								color: "white",
								fontWeight: 800,
								mb: 1
							},
							children: searchQuery ? "NO_MATCHING_EVENTS" : "CALENDAR_EMPTY_OR_PRIVATE"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							variant: "body2",
							sx: {
								color: "rgba(255, 255, 255, 0.4)",
								lineHeight: 1.6
							},
							children: searchQuery ? `No public events found matching "${searchQuery}".` : "Only events marked as \"Public\" in Kylrix Flow can be shared in the ecosystem feed."
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				sx: {
					p: 3,
					pt: 0,
					display: "flex",
					gap: 1,
					borderTop: "1px solid rgba(255, 255, 255, 0.05)",
					flexShrink: 0
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: onClose,
					sx: {
						borderRadius: "12px",
						px: 3,
						color: "rgba(255, 255, 255, 0.5)",
						fontWeight: 700,
						textTransform: "none",
						"&:hover": {
							color: "white",
							bgcolor: "rgba(255, 255, 255, 0.05)"
						}
					},
					children: "Cancel"
				})
			})
		]
	});
};
var EventViewDrawer = ({ open, onClose, event }) => {
	if (!event) return null;
	const startDate = new Date(event.startTime);
	const endDate = new Date(event.endTime);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer, {
		anchor: "right",
		open,
		onClose,
		PaperProps: { sx: {
			width: {
				xs: "100%",
				sm: 450
			},
			bgcolor: "background.default",
			borderLeft: "1px solid rgba(255, 255, 255, 0.08)"
		} },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
			sx: {
				p: 3,
				display: "flex",
				flexDirection: "column",
				height: "100%"
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						alignItems: "center",
						mb: 3
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Event_default, {
							color: "primary",
							sx: {
								mr: 1.5,
								fontSize: 28
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							variant: "h6",
							fontWeight: 800,
							sx: { flex: 1 },
							children: "Event Details"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
							onClick: onClose,
							size: "small",
							sx: { bgcolor: "rgba(255, 255, 255, 0.05)" },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Close_default, { fontSize: "small" })
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Paper, {
					elevation: 0,
					variant: "outlined",
					sx: {
						p: 3,
						borderRadius: 4,
						bgcolor: "rgba(255, 255, 255, 0.02)",
						mb: 4
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							variant: "h5",
							fontWeight: 900,
							gutterBottom: true,
							sx: {
								color: "primary.main",
								fontFamily: "var(--font-space-grotesk)"
							},
							children: event.title || "Untitled Event"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Stack, {
							spacing: 2,
							sx: { mt: 3 },
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
									sx: {
										display: "flex",
										gap: 2,
										alignItems: "flex-start"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccessTime_default, { sx: {
										color: "rgba(255, 255, 255, 0.4)",
										fontSize: 20,
										mt: .3
									} }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
										variant: "subtitle2",
										fontWeight: 700,
										color: "white",
										children: startDate.toLocaleDateString([], {
											weekday: "long",
											month: "long",
											day: "numeric"
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
										variant: "caption",
										color: "text.secondary",
										children: [
											startDate.toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit"
											}),
											" - ",
											endDate.toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit"
											})
										]
									})] })]
								}),
								event.location && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
									sx: {
										display: "flex",
										gap: 2,
										alignItems: "flex-start"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocationOn_default, { sx: {
										color: "rgba(255, 255, 255, 0.4)",
										fontSize: 20,
										mt: .3
									} }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
										variant: "subtitle2",
										fontWeight: 700,
										color: "white",
										children: "Location"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
										variant: "caption",
										color: "text.secondary",
										children: event.location
									})] })]
								}),
								event.meetingUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
									sx: {
										display: "flex",
										gap: 2,
										alignItems: "flex-start"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Language_default, { sx: {
										color: "rgba(255, 255, 255, 0.4)",
										fontSize: 20,
										mt: .3
									} }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
										variant: "subtitle2",
										fontWeight: 700,
										color: "white",
										children: "Online Meeting"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										href: event.meetingUrl,
										target: "_blank",
										variant: "caption",
										color: "primary",
										sx: {
											textDecoration: "none",
											fontWeight: 600
										},
										children: "Join Meeting"
									})] })]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Divider, { sx: {
							my: 3,
							opacity: .1
						} }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							variant: "subtitle2",
							fontWeight: 700,
							color: "white",
							gutterBottom: true,
							children: "Description"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							variant: "body2",
							sx: {
								color: "text.secondary",
								lineHeight: 1.7
							},
							children: event.description || "No description provided."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
					sx: {
						mt: "auto",
						display: "flex",
						gap: 2
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						fullWidth: true,
						variant: "contained",
						color: "primary",
						component: "a",
						href: `http://localhost:3003/events/${event.$id || event.id}`,
						target: "_blank",
						sx: {
							borderRadius: 3,
							py: 1.5,
							fontWeight: 800,
							color: "black"
						},
						children: "Open in Flow"
					})
				})
			]
		})
	});
};
var CallSelectorModal = ({ open, onClose, onSelect }) => {
	const { user } = useAuth();
	const [calls, setCalls] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
	const loadCalls = (0, import_react.useCallback)(async () => {
		if (!user?.$id) return;
		setLoading(true);
		try {
			setCalls((await CallService.getCallHistory(user.$id)).filter((c) => c.isLink && !c.isExpired));
		} catch (error) {
			console.error("Failed to load calls:", error);
		} finally {
			setLoading(false);
		}
	}, [user?.$id]);
	(0, import_react.useEffect)(() => {
		if (open && user) loadCalls();
	}, [
		open,
		user,
		loadCalls
	]);
	const filteredCalls = calls.filter((call) => call.title?.toLowerCase().includes(searchQuery.toLowerCase()) || call.type?.toLowerCase().includes(searchQuery.toLowerCase()));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer, {
		open,
		onClose,
		PaperProps: { sx: {
			borderRadius: "24px 24px 0 0",
			bgcolor: "rgba(10, 10, 10, 0.9)",
			backdropFilter: "blur(25px) saturate(180%)",
			border: "1px solid rgba(255, 255, 255, 0.1)",
			backgroundImage: "none",
			boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
			overflow: "hidden",
			maxHeight: "88vh",
			width: "100%"
		} },
		anchor: "bottom",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle$1, {
				sx: {
					p: 3,
					pb: 2,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						alignItems: "center",
						gap: 2
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
						sx: {
							p: 1,
							borderRadius: "12px",
							bgcolor: alpha("#F59E0B", .1),
							color: "#F59E0B",
							display: "flex"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, {
							size: 24,
							strokeWidth: 1.5
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						variant: "h6",
						sx: {
							fontWeight: 900,
							fontFamily: "var(--font-space-grotesk)",
							letterSpacing: "-0.02em",
							lineHeight: 1.2
						},
						children: "Attach Call Link"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						variant: "caption",
						sx: {
							color: "rgba(255, 255, 255, 0.4)",
							fontWeight: 600
						},
						children: "Select an active call link to share"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
					onClick: onClose,
					sx: {
						color: "rgba(255, 255, 255, 0.3)",
						"&:hover": {
							color: "white",
							bgcolor: "rgba(255, 255, 255, 0.05)"
						}
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 20 })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
				sx: {
					p: 3,
					mt: 1
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						alignItems: "center",
						bgcolor: "rgba(255, 255, 255, 0.03)",
						border: "1px solid rgba(255, 255, 255, 0.08)",
						borderRadius: "16px",
						px: 2,
						py: 1,
						mb: 3,
						transition: "all 0.2s ease",
						"&:focus-within": {
							borderColor: alpha("#F59E0B", .5),
							bgcolor: "rgba(255, 255, 255, 0.05)"
						}
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							size: 18,
							color: "rgba(255, 255, 255, 0.3)",
							strokeWidth: 1.5
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, { sx: { width: 12 } }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputBase, {
							autoFocus: true,
							placeholder: "Search your call links...",
							fullWidth: true,
							value: searchQuery,
							onChange: (e) => setSearchQuery(e.target.value),
							sx: {
								color: "white",
								fontSize: "0.95rem",
								fontWeight: 500,
								"& .MuiInputBase-input::placeholder": {
									color: "rgba(255, 255, 255, 0.3)",
									opacity: 1
								}
							}
						})
					]
				}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						py: 8,
						gap: 2
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircularProgress, {
						size: 32,
						sx: { color: "#F59E0B" }
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						variant: "caption",
						sx: {
							color: "rgba(255, 255, 255, 0.4)",
							fontWeight: 700,
							letterSpacing: "0.1em"
						},
						children: "FETCHING CALLS..."
					})]
				}) : filteredCalls.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
					sx: { pt: 0 },
					children: filteredCalls.map((call) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ListItem, {
						component: "div",
						onClick: () => {
							onSelect(call);
							onClose();
						},
						sx: {
							cursor: "pointer",
							borderRadius: "16px",
							p: 2,
							mb: 1.5,
							border: "1px solid rgba(255, 255, 255, 0.05)",
							bgcolor: "rgba(255, 255, 255, 0.01)",
							transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
							"&:hover": {
								bgcolor: "rgba(255, 255, 255, 0.04)",
								borderColor: alpha("#F59E0B", .3),
								transform: "translateX(4px)"
							}
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListItemIcon, {
							sx: { minWidth: 48 },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
								sx: {
									width: 36,
									height: 36,
									borderRadius: "10px",
									bgcolor: "rgba(255, 255, 255, 0.03)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "#F59E0B"
								},
								children: call.type === "video" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, {
									size: 20,
									strokeWidth: 1.5
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, {
									size: 20,
									strokeWidth: 1.5
								})
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListItemText, {
							primary: call.title || `${call.type.charAt(0).toUpperCase() + call.type.slice(1)} Call`,
							secondary: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
								sx: {
									display: "flex",
									alignItems: "center",
									gap: 1,
									mt: .5,
									color: "rgba(255, 255, 255, 0.4)"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 12 }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
									variant: "caption",
									sx: { fontWeight: 600 },
									children: ["Starts: ", new Date(call.startsAt).toLocaleString()]
								})]
							}),
							primaryTypographyProps: { sx: {
								fontWeight: 800,
								color: "white",
								fontSize: "0.95rem"
							} }
						})]
					}, call.$id))
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						textAlign: "center",
						py: 8,
						px: 4
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
							sx: {
								mb: 2,
								color: "rgba(255, 255, 255, 0.1)"
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, {
								size: 48,
								strokeWidth: 1
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							sx: {
								color: "white",
								fontWeight: 800,
								mb: 1
							},
							children: searchQuery ? "NO_MATCHING_CALLS" : "NO_ACTIVE_CALL_LINKS"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							variant: "body2",
							sx: {
								color: "rgba(255, 255, 255, 0.4)",
								lineHeight: 1.6
							},
							children: searchQuery ? `No call links found matching "${searchQuery}".` : "You don't have any active call links. Create one in the Calls section first."
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogActions, {
				sx: {
					p: 3,
					pt: 0
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: onClose,
					sx: {
						borderRadius: "12px",
						px: 3,
						color: "rgba(255, 255, 255, 0.5)",
						fontWeight: 700,
						textTransform: "none",
						"&:hover": {
							color: "white",
							bgcolor: "rgba(255, 255, 255, 0.05)"
						}
					},
					children: "Cancel"
				})
			})
		]
	});
};
var CACHE_KEY = "kylrix_feed_cache";
var profileRegistry = /* @__PURE__ */ new Map();
var momentCardSx = {
	borderRadius: "20px",
	bgcolor: "#161514",
	border: "1px solid rgba(255, 255, 255, 0.07)",
	boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.06), 0 0 30px rgba(245, 158, 11, 0.12), 0 22px 48px rgba(0, 0, 0, 0.34)",
	overflow: "hidden",
	transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
	"&:hover": {
		bgcolor: "#161514",
		transform: "translateY(-2px)",
		borderColor: "rgba(245, 158, 11, 0.18)",
		boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.1), 0 0 38px rgba(245, 158, 11, 0.2), 0 24px 56px rgba(0, 0, 0, 0.38)"
	}
};
var feedAvatarSx = {
	width: 40,
	height: 40,
	borderRadius: "12px",
	border: "1px solid rgba(255, 255, 255, 0.08)",
	boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
};
var feedTitleSx = {
	fontWeight: 850,
	fontSize: "0.93rem",
	lineHeight: 1.2,
	color: "white",
	fontFamily: "var(--font-clash)",
	letterSpacing: "0.01em"
};
var feedSubheaderSx = {
	opacity: .42,
	fontWeight: 700,
	fontSize: "0.8rem",
	lineHeight: 1.2,
	fontFamily: "var(--font-mono)"
};
var feedBodySx = {
	color: "text.primary",
	fontSize: "0.92rem",
	lineHeight: 1.45,
	display: "-webkit-box",
	WebkitBoxOrient: "vertical",
	overflow: "hidden",
	wordBreak: "break-word"
};
var feedActionCountSx = {
	fontWeight: 700,
	opacity: .5,
	fontSize: "0.72rem",
	lineHeight: 1
};
var readFeedCache = (view) => {
	if (typeof window === "undefined") return null;
	const cached = localStorage.getItem(`${CACHE_KEY}_${view}`);
	if (!cached) return null;
	try {
		const parsed = JSON.parse(cached);
		if (Array.isArray(parsed)) return {
			rows: parsed,
			cachedAt: Date.now()
		};
		if (parsed && Array.isArray(parsed.rows)) return {
			rows: parsed.rows,
			cachedAt: Number(parsed.cachedAt) || Date.now()
		};
	} catch {
		return null;
	}
	return null;
};
var getInitialFeedCache = (view) => readFeedCache(view);
var writeFeedCache = (view, rows, cachedAt = Date.now()) => {
	if (typeof window === "undefined") return;
	const payload = {
		rows: rows.slice(0, 50),
		cachedAt
	};
	localStorage.setItem(`${CACHE_KEY}_${view}`, JSON.stringify(payload));
};
var FeedSkeleton = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stack, {
	spacing: 3,
	children: [
		1,
		2,
		3
	].map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		sx: {
			borderRadius: "20px",
			bgcolor: "#000000",
			border: "1px solid rgba(255, 255, 255, 0.07)",
			boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.04), 0 0 24px rgba(245, 158, 11, 0.08)"
		},
		elevation: 0,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
			avatar: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
				variant: "circular",
				width: 36,
				height: 36,
				sx: { bgcolor: "rgba(255,255,255,0.05)" }
			}),
			title: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
				width: "40%",
				sx: { bgcolor: "rgba(255,255,255,0.05)" }
			}),
			subheader: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
				width: "20%",
				sx: { bgcolor: "rgba(255,255,255,0.05)" }
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
			variant: "rectangular",
			height: 100,
			sx: {
				borderRadius: 2,
				bgcolor: "rgba(255,255,255,0.05)"
			}
		}) })]
	}, i))
});
var PostComposer = import_react.memo(function PostComposer({ isMobile, isOpen, user, userAvatarUrl, editingMoment, selectedNote, selectedEvent, selectedCall, pulseTarget, selectedFiles, posting, onCancel, onSubmit, onSelectFiles, onOpenNote, onOpenEvent, onOpenCall, onClearNote, onClearEvent, onClearCall, onClearPulseTarget, onRemoveFile, composerKey, draftInputRef, hasDraftText: hasDraftTextProp, setHasDraftText }) {
	const [filePreviews, setFilePreviews] = import_react.useState([]);
	const mediaInputRef = import_react.useRef(null);
	const isProPlan = getUserSubscriptionTier(user) === "PRO";
	import_react.useEffect(() => {
		if (!isOpen) return;
		const value = editingMoment?.caption || "";
		setHasDraftText(Boolean(value.trim()));
		const t = setTimeout(() => {
			draftInputRef.current?.focus();
		}, 0);
		return () => clearTimeout(t);
	}, [
		composerKey,
		editingMoment?.caption,
		draftInputRef,
		isOpen,
		setHasDraftText
	]);
	import_react.useEffect(() => {
		const previews = selectedFiles.map((file) => ({
			file,
			url: URL.createObjectURL(file)
		}));
		setFilePreviews(previews);
		return () => {
			previews.forEach((preview) => URL.revokeObjectURL(preview.url));
		};
	}, [selectedFiles]);
	const canSubmit = Boolean(hasDraftTextProp || selectedNote || selectedEvent || selectedCall || pulseTarget || selectedFiles.length > 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
		initial: false,
		animate: isMobile ? isOpen ? {
			opacity: 1,
			y: 0
		} : {
			opacity: 0,
			y: 100
		} : { opacity: isOpen ? 1 : .01 },
		transition: {
			type: "spring",
			damping: 25,
			stiffness: 300
		},
		style: isMobile ? {
			position: "fixed",
			bottom: 0,
			left: 0,
			right: 0,
			zIndex: 2e3,
			padding: "16px",
			background: "#161514",
			borderTop: "1px solid rgba(255, 255, 255, 0.1)",
			borderRadius: "24px 24px 0 0",
			boxShadow: "0 -10px 40px rgba(0,0,0,0.8)",
			transform: "translateZ(0)",
			willChange: "transform, opacity",
			backfaceVisibility: "hidden",
			pointerEvents: isOpen ? "auto" : "none",
			visibility: isOpen ? "visible" : "hidden"
		} : {
			pointerEvents: isOpen ? "auto" : "none",
			visibility: isOpen ? "visible" : "hidden"
		},
		"aria-hidden": !isOpen,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			sx: {
				mb: isMobile ? 0 : 4,
				borderRadius: isMobile ? "16px" : "24px",
				bgcolor: isMobile ? "transparent" : "rgba(255, 255, 255, 0.03)",
				border: isMobile ? "none" : "1px solid rgba(255, 255, 255, 0.08)"
			},
			elevation: 0,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					sx: { p: isMobile ? 1 : 3 },
					children: [
						isMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
							sx: {
								display: "flex",
								justifyContent: "flex-end",
								mb: 1
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
								onClick: onCancel,
								sx: { color: "rgba(255,255,255,0.3)" },
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 20 })
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
							sx: {
								display: "flex",
								gap: 2
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								src: userAvatarUrl || void 0,
								sx: {
									bgcolor: alpha("#F59E0B", .1),
									color: "#F59E0B",
									fontWeight: 800
								},
								children: user.name?.charAt(0).toUpperCase() || "U"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FastDraftInput, {
								ref: draftInputRef,
								initialValue: editingMoment?.caption || "",
								placeholder: editingMoment ? "Update your moment..." : "Share an update with the ecosystem...",
								rows: isMobile ? 4 : 2,
								autoFocus: true,
								onEmptyChange: setHasDraftText
							})]
						}),
						editingMoment && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
							sx: {
								mt: 1,
								mb: 1,
								display: "flex",
								alignItems: "center",
								gap: 1
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
								variant: "caption",
								sx: {
									color: "#F59E0B",
									fontWeight: 900,
									letterSpacing: "0.05em"
								},
								children: "EDITING MODE"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "small",
								onClick: onCancel,
								sx: {
									fontSize: "0.65rem",
									fontWeight: 800,
									color: "rgba(255,255,255,0.4)"
								},
								children: "Cancel"
							})]
						}),
						selectedNote && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Paper, {
							variant: "outlined",
							sx: {
								mt: 2,
								p: 2,
								borderRadius: 3,
								display: "flex",
								alignItems: "center",
								bgcolor: "rgba(0, 240, 255, 0.03)",
								borderColor: "rgba(0, 240, 255, 0.2)",
								position: "relative"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, {
									size: 20,
									color: "#6366F1",
									style: { marginRight: "16px" },
									strokeWidth: 1.5
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
									sx: {
										flex: 1,
										minWidth: 0
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
										variant: "subtitle2",
										fontWeight: 800,
										noWrap: true,
										children: selectedNote.title || "Untitled Note"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
										variant: "caption",
										color: "text.secondary",
										noWrap: true,
										sx: { display: "block" },
										children: [selectedNote.content?.substring(0, 60).replace(/[#*`]/g, ""), "..."]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
									size: "small",
									onClick: onClearNote,
									sx: { ml: 1 },
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
										size: 16,
										strokeWidth: 1.5
									})
								})
							]
						}),
						selectedEvent && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Paper, {
							variant: "outlined",
							sx: {
								mt: 2,
								p: 2,
								borderRadius: 3,
								display: "flex",
								alignItems: "center",
								bgcolor: "rgba(0, 163, 255, 0.03)",
								borderColor: "rgba(0, 163, 255, 0.2)",
								position: "relative"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, {
									size: 20,
									color: "#00A3FF",
									style: { marginRight: "16px" },
									strokeWidth: 1.5
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
									sx: {
										flex: 1,
										minWidth: 0
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
										variant: "subtitle2",
										fontWeight: 800,
										noWrap: true,
										children: selectedEvent.title || "Untitled Event"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
										variant: "caption",
										color: "text.secondary",
										noWrap: true,
										sx: { display: "block" },
										children: new Date(selectedEvent.startTime).toLocaleString()
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
									size: "small",
									onClick: onClearEvent,
									sx: { ml: 1 },
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
										size: 16,
										strokeWidth: 1.5
									})
								})
							]
						}),
						selectedCall && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Paper, {
							variant: "outlined",
							sx: {
								mt: 2,
								p: 2,
								borderRadius: 3,
								display: "flex",
								alignItems: "center",
								bgcolor: "rgba(245, 158, 11, 0.03)",
								borderColor: "rgba(245, 158, 11, 0.2)",
								position: "relative"
							},
							children: [
								selectedCall.type === "video" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, {
									size: 20,
									color: "#F59E0B",
									style: { marginRight: "16px" },
									strokeWidth: 1.5
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, {
									size: 20,
									color: "#F59E0B",
									style: { marginRight: "16px" },
									strokeWidth: 1.5
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
									sx: {
										flex: 1,
										minWidth: 0
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
										variant: "subtitle2",
										fontWeight: 800,
										noWrap: true,
										children: selectedCall.title || `${selectedCall.type.charAt(0).toUpperCase() + selectedCall.type.slice(1)} Call`
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
										variant: "caption",
										color: "text.secondary",
										noWrap: true,
										sx: { display: "block" },
										children: ["Starts: ", new Date(selectedCall.startsAt).toLocaleString()]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
									size: "small",
									onClick: onClearCall,
									sx: { ml: 1 },
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
										size: 16,
										strokeWidth: 1.5
									})
								})
							]
						}),
						pulseTarget && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Paper, {
							variant: "outlined",
							sx: {
								mt: 2,
								p: 2,
								borderRadius: 3,
								bgcolor: "rgba(16, 185, 129, 0.03)",
								borderColor: "rgba(16, 185, 129, 0.2)",
								position: "relative"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Repeat2, {
									size: 20,
									color: "#10B981",
									style: { marginRight: "16px" },
									strokeWidth: 1.5
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
									sx: {
										flex: 1,
										minWidth: 0
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
										variant: "subtitle2",
										fontWeight: 800,
										noWrap: true,
										children: ["Quoting ", resolveIdentity(pulseTarget.creator, pulseTarget.userId || pulseTarget.creatorId).handle]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
										variant: "caption",
										color: "text.secondary",
										noWrap: true,
										sx: { display: "block" },
										children: [pulseTarget.caption?.substring(0, 60), "..."]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
									size: "small",
									onClick: onClearPulseTarget,
									sx: { ml: 1 },
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
										size: 16,
										strokeWidth: 1.5
									})
								})
							]
						}),
						filePreviews.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
							sx: {
								display: "flex",
								gap: 1,
								mt: 2,
								flexWrap: "wrap"
							},
							children: filePreviews.map((preview, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
								sx: {
									position: "relative",
									width: 80,
									height: 80
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
									component: "img",
									src: preview.url,
									sx: {
										width: "100%",
										height: "100%",
										objectFit: "cover",
										borderRadius: 2,
										border: "1px solid rgba(255,255,255,0.1)"
									}
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
									size: "small",
									sx: {
										position: "absolute",
										top: -8,
										right: -8,
										bgcolor: "rgba(0,0,0,0.6)",
										"&:hover": { bgcolor: "rgba(0,0,0,0.8)" }
									},
									onClick: () => onRemoveFile(idx),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
										size: 12,
										color: "white"
									})
								})]
							}, `${preview.file.name}-${preview.file.lastModified}-${idx}`))
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Divider, { sx: { opacity: .05 } }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardActions, {
					sx: {
						justifyContent: "space-between",
						px: 2,
						py: 1.5,
						bgcolor: "#000000"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
						sx: {
							display: "flex",
							gap: .5
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								ref: mediaInputRef,
								type: "file",
								accept: "image/*",
								multiple: true,
								id: "media-upload",
								style: { display: "none" },
								onChange: (e) => {
									onSelectFiles(e);
									e.currentTarget.value = "";
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
								"aria-disabled": !isProPlan,
								onClick: () => {
									if (!isProPlan) {
										showUpgradeIsland("attach media to moments");
										return;
									}
									mediaInputRef.current?.click();
								},
								sx: {
									borderRadius: "10px",
									color: isProPlan ? "#F59E0B" : "rgba(255, 255, 255, 0.28)",
									bgcolor: isProPlan ? "transparent" : "rgba(255, 255, 255, 0.02)",
									border: "1px solid rgba(255, 255, 255, 0.06)",
									opacity: isProPlan ? 1 : .55,
									cursor: isProPlan ? "pointer" : "not-allowed",
									"&:hover": {
										bgcolor: isProPlan ? alpha("#F59E0B", .1) : "rgba(255, 255, 255, 0.03)",
										color: isProPlan ? "#F59E0B" : "rgba(255, 255, 255, 0.35)"
									}
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, {
									size: 20,
									strokeWidth: 1.5
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								startIcon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, {
									size: 18,
									strokeWidth: 1.5
								}),
								onClick: onOpenNote,
								sx: {
									borderRadius: "10px",
									textTransform: "none",
									fontWeight: 700,
									color: "text.secondary",
									minWidth: 0,
									px: 1.5,
									"&:hover": {
										color: "primary.main",
										bgcolor: "rgba(0, 240, 255, 0.05)"
									}
								},
								children: !isMobile && "Note"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								startIcon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, {
									size: 18,
									strokeWidth: 1.5
								}),
								onClick: onOpenEvent,
								sx: {
									borderRadius: "10px",
									textTransform: "none",
									fontWeight: 700,
									color: "text.secondary",
									minWidth: 0,
									px: 1.5,
									"&:hover": {
										color: "primary.main",
										bgcolor: "rgba(99, 102, 241, 0.05)"
									}
								},
								children: !isMobile && "Event"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								startIcon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, {
									size: 18,
									strokeWidth: 1.5
								}),
								onClick: onOpenCall,
								sx: {
									borderRadius: "10px",
									textTransform: "none",
									fontWeight: 700,
									color: "text.secondary",
									minWidth: 0,
									px: 1.5,
									"&:hover": {
										color: "#F59E0B",
										bgcolor: alpha("#F59E0B", .05)
									}
								},
								children: !isMobile && "Call"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "contained",
						disabled: !canSubmit || posting,
						onClick: async () => {
							await onSubmit(draftInputRef.current?.getValue() || "");
						},
						sx: {
							borderRadius: "12px",
							px: 4,
							fontWeight: 800,
							textTransform: "none",
							bgcolor: "#F59E0B",
							color: "black",
							"&:hover": { bgcolor: alpha("#F59E0B", .8) }
						},
						children: posting ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircularProgress, {
							size: 20,
							color: "inherit"
						}) : editingMoment ? "Update" : "Post"
					})]
				})
			]
		})
	});
});
var MobileComposerDock = import_react.memo((0, import_react.forwardRef)(function MobileComposerDock({ isMobile, user, userAvatarUrl, editingMoment, selectedNote, selectedEvent, selectedCall, pulseTarget, selectedFiles, posting, onCancel, onSubmit, onSelectFiles, onOpenNote, onOpenEvent, onOpenCall, onClearNote, onClearEvent, onClearCall, onClearPulseTarget, onRemoveFile, composerKey, draftInputRef, hasDraftText, setHasDraftText }, ref) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const { setChromeState, resetChromeState } = useAppChrome();
	(0, import_react.useImperativeHandle)(ref, () => ({
		open: () => setOpen(true),
		close: () => setOpen(false)
	}), []);
	(0, import_react.useEffect)(() => {
		if (open) {
			setChromeState({
				mode: "compact",
				label: editingMoment ? "Edit moment" : "Compose"
			});
			return;
		}
		resetChromeState();
	}, [
		editingMoment,
		open,
		resetChromeState,
		setChromeState
	]);
	(0, import_react.useEffect)(() => {
		return () => resetChromeState();
	}, [resetChromeState]);
	const handleCancel = (0, import_react.useCallback)(() => {
		onCancel();
		setOpen(false);
	}, [onCancel]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [isMobile && user && !open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fab, {
		color: "primary",
		disableRipple: true,
		disableFocusRipple: true,
		sx: {
			position: "fixed",
			bottom: "calc(132px + env(safe-area-inset-bottom))",
			right: 24,
			width: 64,
			height: 64,
			border: "1px solid rgba(255, 255, 255, 0.12)",
			bgcolor: "#000000",
			color: "#F59E0B",
			backgroundImage: "linear-gradient(180deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.06) 100%)",
			boxShadow: "0 18px 44px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(245, 158, 11, 0.18), 0 0 28px rgba(245, 158, 11, 0.24)",
			transform: "translateZ(0)",
			transition: "transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease",
			WebkitTapHighlightColor: "transparent",
			touchAction: "manipulation",
			zIndex: 1400,
			"&::before": {
				content: "\"\"",
				position: "absolute",
				inset: 6,
				borderRadius: "50%",
				background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16), transparent 65%)",
				pointerEvents: "none"
			},
			"&:hover": {
				bgcolor: "#000000",
				color: "#F59E0B",
				transform: "translateY(-2px) scale(1.04)",
				boxShadow: "0 22px 50px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(245, 158, 11, 0.22), 0 0 34px rgba(245, 158, 11, 0.3)"
			},
			"&:active": { transform: "translateY(0) scale(0.98)" }
		},
		onPointerDown: (event) => {
			if (event.button !== 0) return;
			setOpen(true);
		},
		onClick: () => setOpen(true),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
			size: 26,
			strokeWidth: 2.1
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PostComposer, {
		composerKey,
		isMobile,
		isOpen: !isMobile || open,
		user,
		userAvatarUrl,
		editingMoment,
		selectedNote,
		selectedEvent,
		selectedCall,
		pulseTarget,
		selectedFiles,
		posting,
		onCancel: handleCancel,
		onSubmit,
		onSelectFiles,
		onOpenNote,
		onOpenEvent,
		onOpenCall,
		onClearNote,
		onClearEvent,
		onClearCall,
		onClearPulseTarget,
		onRemoveFile,
		draftInputRef,
		hasDraftText,
		setHasDraftText
	}, composerKey)] });
}));
var NewPostsWidget = ({ pendingMoments, onClick }) => {
	const router = useRouter();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
		onClick,
		sx: {
			position: "fixed",
			top: 80,
			left: "50%",
			transform: "translateX(-50%)",
			zIndex: 1e3,
			bgcolor: "#F59E0B",
			color: "black",
			px: 2,
			py: 1,
			borderRadius: "50px",
			display: "flex",
			alignItems: "center",
			gap: 1.5,
			cursor: "pointer",
			boxShadow: "0 8px 32px rgba(245, 158, 11, 0.3)",
			transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
			"&:hover": {
				transform: "translateX(-50%) translateY(-2px)",
				bgcolor: alpha("#F59E0B", .9)
			},
			"&:active": { transform: "translateX(-50%) scale(0.95)" }
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
			sx: {
				display: "flex",
				ml: -.5
			},
			children: pendingMoments.slice(0, 3).map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
				onClick: (e) => {
					e.stopPropagation();
					const username = resolveIdentityUsername(m.creator, m.userId || m.creatorId);
					if (username) router.push(`/u/${username}`);
				},
				src: m.creator?.avatar,
				sx: {
					width: 24,
					height: 24,
					border: "2px solid #F59E0B",
					ml: i === 0 ? 0 : -1,
					zIndex: 3 - i,
					fontSize: "0.65rem",
					bgcolor: "#000000",
					color: "#F59E0B",
					cursor: "pointer"
				},
				children: resolveIdentity(m.creator, m.userId || m.creatorId).displayName.charAt(0).toUpperCase()
			}, m.$id))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
			sx: {
				fontWeight: 800,
				fontSize: "0.85rem",
				letterSpacing: "0.02em"
			},
			children: [
				pendingMoments.length,
				" new ",
				pendingMoments.length === 1 ? "post" : "posts"
			]
		})]
	});
};
var Feed = ({ view = "personal" }) => {
	const { user } = useAuth();
	const { profile: myProfile } = useProfile();
	const router = useRouter();
	const initialFeedCache = getInitialFeedCache(view);
	const [moments, setMoments] = (0, import_react.useState)(() => initialFeedCache?.rows || []);
	const [loading, setLoading] = (0, import_react.useState)(() => !initialFeedCache);
	const [posting, setPosting] = (0, import_react.useState)(false);
	const [pendingMoments, setPendingMoments] = (0, import_react.useState)([]);
	const [showNewPosts, setShowNewPosts] = (0, import_react.useState)(false);
	const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
	const [searchResults, setSearchResults] = (0, import_react.useState)([]);
	const [momentSearchResults, setMomentSearchResults] = (0, import_react.useState)([]);
	const [searching, setSearching] = (0, import_react.useState)(false);
	const [selectedFiles, setSelectedFiles] = (0, import_react.useState)([]);
	const [selectedNote, setSelectedNote] = (0, import_react.useState)(null);
	const [selectedEvent, setSelectedEvent] = (0, import_react.useState)(null);
	const [selectedCall, setSelectedCall] = (0, import_react.useState)(null);
	const [pulseTarget, setPulseTarget] = (0, import_react.useState)(null);
	const [isNoteModalOpen, setIsNoteSelectorOpen] = (0, import_react.useState)(false);
	const [isNoteDrawerOpen, setIsNoteDrawerOpen] = (0, import_react.useState)(false);
	const [viewingNote, setViewingNote] = (0, import_react.useState)(null);
	const [isEventModalOpen, setIsEventSelectorOpen] = (0, import_react.useState)(false);
	const [isEventDrawerOpen, setIsEventDrawerOpen] = (0, import_react.useState)(false);
	const [viewingEvent, setViewingEvent] = (0, import_react.useState)(null);
	const [isCallModalOpen, setIsCallSelectorOpen] = (0, import_react.useState)(false);
	const [composerResetToken, setComposerResetToken] = (0, import_react.useState)(0);
	const [postMenuAnchorEl, setPostMenuAnchorEl] = (0, import_react.useState)(null);
	const [pulseMenuAnchorEl, setPulseMenuAnchorEl] = (0, import_react.useState)(null);
	const [shareAnchorEl, setShareAnchorEl] = (0, import_react.useState)(null);
	const [menuMoment, setMenuMoment] = (0, import_react.useState)(null);
	const [selectedMoment, setSelectedMoment] = (0, import_react.useState)(null);
	const [actorsDrawerOpen, setActorsDrawerOpen] = (0, import_react.useState)(false);
	const [actorsList, setActorsList] = (0, import_react.useState)([]);
	const [actorsTitle, setActorsTitle] = (0, import_react.useState)("");
	const [isSearchOpen, setIsSearchOpen] = (0, import_react.useState)(false);
	const [editingMoment, setEditingMoment] = (0, import_react.useState)(null);
	const [hasDraftText, setHasDraftText] = (0, import_react.useState)(Boolean(editingMoment?.caption?.trim()));
	const momentsRef = import_react.useRef([]);
	const feedCacheRef = import_react.useRef({});
	const feedCacheAgeRef = import_react.useRef({});
	const feedLoadSeqRef = import_react.useRef(0);
	const feedPrefetchRef = import_react.useRef({});
	const draftInputRef = import_react.useRef(null);
	const mobileComposerDockRef = import_react.useRef(null);
	const userAvatarUrl = useCachedProfilePreview(myProfile?.avatar || getCachedIdentityById(user?.$id)?.avatar || user?.prefs?.profilePicId || null, 64, 64);
	const isMobile = useMediaQuery(useTheme().breakpoints.down("md"), { noSsr: true });
	(0, import_react.useLayoutEffect)(() => {
		momentsRef.current = [];
		const memoryCached = feedCacheRef.current[view];
		const storageCached = memoryCached ? {
			rows: memoryCached,
			cachedAt: feedCacheAgeRef.current[view] || Date.now()
		} : readFeedCache(view);
		if (storageCached) {
			momentsRef.current = storageCached.rows;
			feedCacheRef.current[view] = storageCached.rows;
			feedCacheAgeRef.current[view] = storageCached.cachedAt;
			setMoments(storageCached.rows);
			setLoading(false);
		} else setLoading(true);
	}, [view]);
	const saveToCache = (0, import_react.useCallback)((data) => {
		const sliced = data.slice(0, 50);
		feedCacheRef.current[view] = sliced;
		feedCacheAgeRef.current[view] = Date.now();
		writeFeedCache(view, sliced, feedCacheAgeRef.current[view]);
	}, [view]);
	const handleOpenMoment = (0, import_react.useCallback)((moment) => {
		seedMomentPreview(moment);
		router.push(`/post/${moment.$id}`);
	}, [router]);
	const handleToggleLike = async (e, moment) => {
		e.stopPropagation();
		if (!user) {
			zt.error("Please login to like this post");
			return;
		}
		try {
			const creatorId = moment.userId || moment.creatorId;
			const contentSnippet = moment.caption?.substring(0, 30);
			const { liked } = await SocialService.toggleLike(user.$id, moment.$id, creatorId, contentSnippet);
			setMoments((prev) => {
				const next = prev.map((m) => m.$id === moment.$id ? {
					...m,
					isLiked: liked,
					stats: {
						...m.stats,
						likes: Math.max(0, (m.stats?.likes || 0) + (liked ? 1 : -1))
					}
				} : m);
				momentsRef.current = next;
				saveToCache(next);
				return next;
			});
		} catch (_e) {
			zt.error("Failed to update like");
		}
	};
	const handleDeletePost = async (momentId) => {
		if (!confirm("Are you sure you want to delete this moment?")) return;
		try {
			await SocialService.deleteMoment(momentId);
			setMoments((prev) => {
				const next = prev.filter((m) => m.$id !== momentId);
				momentsRef.current = next;
				saveToCache(next);
				return next;
			});
			zt.success("Moment deleted");
			setPostMenuAnchorEl(null);
		} catch (_e) {
			zt.error("Failed to delete moment");
		}
	};
	const loadFeed = (0, import_react.useCallback)(async () => {
		if (view === "search") {
			setLoading(false);
			return;
		}
		const requestId = ++feedLoadSeqRef.current;
		const cached = feedCacheRef.current[view];
		if (cached) {
			momentsRef.current = cached;
			setMoments(cached);
			setLoading(false);
			return;
		} else {
			setLoading(true);
			momentsRef.current = [];
		}
		try {
			const response = view === "trending" ? await SocialService.getTrendingFeed(user?.$id) : await SocialService.getFeed(user?.$id);
			if (requestId !== feedLoadSeqRef.current) return;
			const filteredRows = (response?.rows || []).filter((m) => {
				const creatorId = m.userId || m.creatorId;
				const type = m.metadata?.type || "post";
				if (user?.$id && creatorId === user.$id && type === "post") return false;
				return true;
			});
			const updated = filteredRows.map((fresh) => {
				const existing = momentsRef.current.find((p) => p.$id === fresh.$id);
				const cachedCreator = getCachedIdentityById(fresh.userId || fresh.creatorId);
				return {
					...fresh,
					creator: existing?.creator || cachedCreator || fresh.creator,
					sourceMoment: existing?.sourceMoment ? {
						...fresh.sourceMoment,
						creator: existing.sourceMoment.creator || fresh.sourceMoment?.creator
					} : fresh.sourceMoment
				};
			});
			momentsRef.current = updated;
			setMoments(updated);
			saveToCache(updated);
			const oppositeView = view === "personal" ? "trending" : view === "trending" ? "personal" : null;
			if (oppositeView && !feedCacheRef.current[oppositeView]) window.setTimeout(() => {
				if (feedPrefetchRef.current[oppositeView]) return;
				feedPrefetchRef.current[oppositeView] = (async () => {
					try {
						const filtered = ((oppositeView === "trending" ? await SocialService.getTrendingFeed(user?.$id) : await SocialService.getFeed(user?.$id))?.rows || []).filter((m) => {
							const creatorId = m.userId || m.creatorId;
							const type = m.metadata?.type || "post";
							if (user?.$id && creatorId === user.$id && type === "post") return false;
							return true;
						});
						feedCacheRef.current[oppositeView] = filtered.slice(0, 50);
						feedCacheAgeRef.current[oppositeView] = Date.now();
						writeFeedCache(oppositeView, filtered, feedCacheAgeRef.current[oppositeView]);
					} catch (_e) {} finally {
						delete feedPrefetchRef.current[oppositeView];
					}
				})();
			}, 0);
			setLoading(false);
			const uniqueCreatorIds = Array.from(new Set(filteredRows.map((m) => m.userId || m.creatorId)));
			await Promise.all(uniqueCreatorIds.map(async (id) => {
				if (profileRegistry.has(id)) return;
				const cachedIdentity = getCachedIdentityById(id);
				if (cachedIdentity) {
					profileRegistry.set(id, cachedIdentity);
					return;
				}
				try {
					const profile = await UsersService.getProfileById(id);
					if (requestId !== feedLoadSeqRef.current) return;
					let avatar = null;
					if (profile?.avatar && !String(profile.avatar).startsWith("http") && profile.avatar.length > 5) avatar = String(profile.avatar).startsWith("http") ? profile.avatar : await fetchProfilePreview(profile.avatar, 64, 64);
					const hydratedProfile = {
						...profile,
						avatar
					};
					profileRegistry.set(id, hydratedProfile);
					seedIdentityCache(hydratedProfile);
					setMoments((prev) => {
						const next = prev.map((m) => {
							let nextUpdated = m;
							if ((m.userId || m.creatorId) === id) nextUpdated = {
								...nextUpdated,
								creator: profileRegistry.get(id)
							};
							if (nextUpdated.sourceMoment) {
								if ((nextUpdated.sourceMoment.userId || nextUpdated.sourceMoment.creatorId) === id) nextUpdated = {
									...nextUpdated,
									sourceMoment: {
										...nextUpdated.sourceMoment,
										creator: profileRegistry.get(id)
									}
								};
							}
							return nextUpdated;
						});
						momentsRef.current = next;
						return next;
					});
				} catch (_e) {
					const fallbackProfile = {
						username: "user",
						displayName: "User",
						$id: id,
						userId: id,
						avatar: null
					};
					profileRegistry.set(id, fallbackProfile);
					seedIdentityCache(fallbackProfile);
				}
			}));
			setMoments((prev) => {
				momentsRef.current = prev;
				saveToCache(prev);
				return prev;
			});
		} catch (error) {
			console.error("Failed to load feed:", error);
			if (momentsRef.current.length === 0) {
				momentsRef.current = [];
				setMoments([]);
			}
		} finally {
			if (requestId === feedLoadSeqRef.current) setLoading(false);
		}
	}, [
		user,
		view,
		saveToCache
	]);
	(0, import_react.useEffect)(() => {
		return subscribeIdentityCache((identity) => {
			profileRegistry.set(identity.userId, identity);
			setMoments((prev) => {
				const next = prev.map((m) => {
					if ((m.userId || m.creatorId) === identity.userId) return {
						...m,
						creator: identity
					};
					if (m.sourceMoment) {
						if ((m.sourceMoment.userId || m.sourceMoment.creatorId) === identity.userId) return {
							...m,
							sourceMoment: {
								...m.sourceMoment,
								creator: identity
							}
						};
					}
					return m;
				});
				momentsRef.current = next;
				return next;
			});
		});
	}, []);
	(0, import_react.useEffect)(() => {
		moments.slice(0, 20).forEach(seedMomentPreview);
	}, [moments]);
	(0, import_react.useEffect)(() => {
		if (view === "search") return;
		loadFeed();
	}, [
		view,
		user?.$id,
		loadFeed
	]);
	(0, import_react.useEffect)(() => {
		const unsubFunc = SocialService.subscribeToFeed(async (event) => {
			if (event.type === "create") {
				const payload = event.payload;
				const authorId = payload?.userId || payload?.authorId || payload?.createdBy || payload?.$createdBy || payload?.creatorId || payload?.creator?.$id || payload?.creator?.userId || payload?.user?.$id || payload?.user?.userId;
				if (authorId && user?.$id && authorId === user.$id) return;
				const nextMoment = await SocialService.enrichMoment(payload, user?.$id) || payload;
				const authorLabel = nextMoment?.displayName || nextMoment?.username || nextMoment?.author?.displayName || nextMoment?.author?.username || (authorId ? resolveIdentityUsername(getCachedIdentityById(authorId), authorId) : null) || "Someone";
				const teaser = (nextMoment?.caption || nextMoment?.content || nextMoment?.text || "shared a new post").toString().trim();
				setPendingMoments((prev) => [nextMoment, ...prev.filter((moment) => moment.$id !== nextMoment.$id)]);
				setShowNewPosts(true);
				if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("kylrix:island-notification", { detail: {
					type: "connect",
					title: `New post from ${authorLabel}`,
					message: teaser,
					app: "connect",
					majestic: true,
					duration: 7e3
				} }));
			} else if (event.type === "delete") setMoments((prev) => {
				const next = prev.filter((m) => m.$id !== event.payload.$id);
				momentsRef.current = next;
				return next;
			});
			else if (event.type === "update") {
				const payload = event.payload;
				if (payload._interactionUpdate || payload.messageId) {
					const momentId = payload.messageId || payload.$id;
					const updatedStats = await SocialService.getInteractionCounts(momentId);
					const isLiked = user?.$id ? await SocialService.isLiked(user.$id, momentId) : false;
					setMoments((prev) => {
						const next = prev.map((m) => m.$id === momentId ? {
							...m,
							stats: updatedStats,
							isLiked
						} : m);
						momentsRef.current = next;
						return next;
					});
				} else {
					const enriched = await SocialService.enrichMoment(payload, user?.$id);
					setMoments((prev) => {
						const next = prev.map((m) => m.$id === enriched.$id ? {
							...m,
							...enriched
						} : m);
						momentsRef.current = next;
						return next;
					});
				}
			}
		});
		return () => {
			if (typeof unsubFunc === "function") {
				const result = unsubFunc();
				if (result instanceof Promise) result.catch((e) => console.error("Cleanup failed", e));
			}
		};
	}, [
		user,
		view,
		loadFeed,
		saveToCache
	]);
	const handleEditMoment = (moment) => {
		setEditingMoment(moment);
		setPulseTarget(moment.sourceMoment || null);
		setHasDraftText(Boolean(moment.caption?.trim()));
		mobileComposerDockRef.current?.open();
		setPostMenuAnchorEl(null);
		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	};
	const handleCancelComposer = (0, import_react.useCallback)(() => {
		setEditingMoment(null);
		setHasDraftText(false);
		draftInputRef.current?.clear();
		setSelectedNote(null);
		setSelectedEvent(null);
		setSelectedCall(null);
		setPulseTarget(null);
		setSelectedFiles([]);
		setComposerResetToken((value) => value + 1);
	}, []);
	const handlePost = async (draftText) => {
		if (!draftText.trim() && !selectedNote && !selectedEvent && !selectedCall && !pulseTarget && selectedFiles.length === 0) return;
		setPosting(true);
		try {
			if (editingMoment) {
				const updated = await SocialService.updateMoment(editingMoment.$id, draftText);
				const enriched = await SocialService.enrichMoment(updated, user.$id);
				setMoments((prev) => {
					const next = prev.map((m) => m.$id === enriched.$id ? {
						...m,
						...enriched
					} : m);
					momentsRef.current = next;
					saveToCache(next);
					return next;
				});
				zt.success("Moment updated");
			} else {
				const mediaIds = [];
				if (selectedFiles.length > 0) for (const file of selectedFiles) {
					const id = await SocialService.uploadMedia(file);
					mediaIds.push(id);
				}
				const type = pulseTarget ? "quote" : "post";
				const createdMoment = await SocialService.createMoment(user.$id, draftText, type, mediaIds, "public", selectedNote?.$id, selectedEvent?.$id, pulseTarget?.$id, selectedCall?.$id);
				const enriched = await SocialService.enrichMoment(createdMoment, user.$id);
				setMoments((prev) => {
					if (prev.some((m) => m.$id === enriched.$id)) return prev;
					const updated = [enriched, ...prev];
					momentsRef.current = updated;
					saveToCache(updated);
					return updated;
				});
				zt.success("Moment shared");
			}
			handleCancelComposer();
			window.scrollTo({
				top: 0,
				behavior: "smooth"
			});
		} catch (error) {
			console.error("Failed to post:", error);
			zt.error(editingMoment ? "Failed to update moment" : "Failed to post moment");
		} finally {
			setPosting(false);
		}
	};
	const handleFileSelect = (e) => {
		if (e.target.files) {
			const files = Array.from(e.target.files);
			setSelectedFiles((prev) => [...prev, ...files]);
		}
	};
	const handleQuote = (moment) => {
		setPulseTarget(moment);
		setPulseMenuAnchorEl(null);
		mobileComposerDockRef.current?.open();
		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	};
	const handlePulse = async (moment) => {
		if (!user) return;
		const pulse = momentsRef.current.find((m) => m.metadata?.type === "pulse" && m.metadata?.sourceId === moment.$id && (m.userId === user.$id || m.creatorId === user.$id));
		const alreadyPulsed = moment.isPulsed || (user?.$id ? await SocialService.isPulsed(user.$id, moment.$id) : false);
		if (pulse || alreadyPulsed) try {
			if (await SocialService.unpulseMoment(user.$id, moment.$id)) {
				zt.success("Removed from your feed");
				setMoments((prev) => {
					const next = prev.filter((m) => m.$id !== pulse.$id);
					momentsRef.current = next;
					saveToCache(next);
					return next;
				});
				setMoments((prev) => {
					const next = prev.map((m) => m.$id === moment.$id ? {
						...m,
						isPulsed: false,
						stats: {
							...m.stats,
							pulses: Math.max(0, (m.stats?.pulses || 0) - 1)
						}
					} : m);
					momentsRef.current = next;
					saveToCache(next);
					return next;
				});
			}
		} catch (_e) {
			zt.error("Failed to remove pulse");
		}
		else try {
			if (user?.$id ? await SocialService.isPulsed(user.$id, moment.$id) : false) {
				setMoments((prev) => {
					const next = prev.map((m) => m.$id === moment.$id ? {
						...m,
						isPulsed: true
					} : m);
					momentsRef.current = next;
					saveToCache(next);
					return next;
				});
				zt("Already pulsed");
			} else {
				await SocialService.createMoment(user.$id, "", "pulse", [], "public", void 0, void 0, moment.$id);
				zt.success("Pulsed to your feed");
				setMoments((prev) => {
					const next = prev.map((m) => m.$id === moment.$id ? {
						...m,
						isPulsed: true,
						stats: {
							...m.stats,
							pulses: (m.stats?.pulses || 0) + 1
						}
					} : m);
					momentsRef.current = next;
					saveToCache(next);
					return next;
				});
			}
		} catch (_e) {
			zt.error("Failed to pulse");
		}
		setPulseMenuAnchorEl(null);
	};
	const fetchActorsForLikes = async (momentId) => {
		try {
			const interactions = await SocialService._listInteractionsFor(momentId, "like");
			return await Promise.all(interactions.map(async (i) => {
				try {
					const p = profileRegistry.get(i.userId) || getCachedIdentityById(i.userId) || await UsersService.getProfileById(i.userId);
					const avatar = p?.avatar ? String(p.avatar).startsWith("http") ? p.avatar : await fetchProfilePreview(p.avatar, 64, 64) : null;
					return {
						$id: i.userId,
						username: p?.username,
						displayName: p?.displayName,
						avatar
					};
				} catch (_e) {
					return { $id: i.userId };
				}
			}));
		} catch (e) {
			console.error("Failed to fetch like actors", e);
			return [];
		}
	};
	const fetchActorsForPulses = async (momentId) => {
		try {
			const pulses = await SocialService._listPulsesFor(momentId);
			return await Promise.all(pulses.map(async (p) => {
				try {
					const profile = profileRegistry.get(p.userId) || getCachedIdentityById(p.userId) || await UsersService.getProfileById(p.userId);
					const avatar = profile?.avatar ? String(profile.avatar).startsWith("http") ? profile.avatar : await fetchProfilePreview(profile.avatar, 64, 64) : null;
					return {
						$id: p.userId,
						username: profile?.username,
						displayName: profile?.displayName,
						avatar
					};
				} catch (_e) {
					return { $id: p.userId };
				}
			}));
		} catch (e) {
			console.error("Failed to fetch pulse actors", e);
			return [];
		}
	};
	const openActorsList = async (title, fetcher) => {
		setActorsTitle(title);
		setActorsDrawerOpen(true);
		setActorsList([]);
		setActorsList(await fetcher());
	};
	const handleOpenNote = (note) => {
		setViewingNote(note);
		setIsNoteDrawerOpen(true);
	};
	const handleOpenEvent = (event) => {
		setViewingEvent(event);
		setIsEventDrawerOpen(true);
	};
	const handleForwardToSaved = async (moment) => {
		if (!user) return;
		try {
			const savedChat = (await ChatService.getConversations(user.$id)).rows.find((c) => c.type === "direct" && c.participants.length === 1 && c.participants[0] === user.$id);
			if (savedChat) {
				await ChatService.sendMessage(savedChat.$id, user.$id, `Forwarded Moment from ${resolveIdentity(moment.creator, moment.userId || moment.creatorId).handle}:\n\n${moment.caption}`, "text");
				alert("Saved to Messages");
			}
		} catch (_e) {
			zt.error("Failed to update like");
		}
	};
	const handleForwardToChat = (moment) => {
		if (!moment) return;
		setShareAnchorEl(null);
		router.push("/messages");
		zt.success("Select a conversation to share this moment");
	};
	const handleSearch = (0, import_react.useCallback)(async (query) => {
		if (!query.trim()) {
			setSearchResults([]);
			setMomentSearchResults([]);
			return;
		}
		setSearching(true);
		try {
			const [userResult, momentResult] = await Promise.all([UsersService.searchUsers(query), SocialService.searchMoments(query, user?.$id)]);
			const enrichedUsers = await Promise.all(userResult.rows.map(async (u) => {
				let avatar = null;
				const sourceAvatar = getCachedIdentityById(u.userId || u.$id)?.avatar || u.avatar || null;
				if (sourceAvatar) try {
					avatar = String(sourceAvatar).startsWith("http") ? sourceAvatar : await fetchProfilePreview(sourceAvatar, 64, 64);
				} catch (_e) {}
				return {
					...u,
					avatar
				};
			}));
			const enrichedMoments = await Promise.all(momentResult.rows.map(async (m) => {
				const creatorId = m.userId || m.creatorId;
				if (profileRegistry.has(creatorId)) return {
					...m,
					creator: profileRegistry.get(creatorId)
				};
				const cachedCreator = getCachedIdentityById(creatorId);
				if (cachedCreator) {
					profileRegistry.set(creatorId, cachedCreator);
					return {
						...m,
						creator: cachedCreator
					};
				}
				try {
					const profile = await UsersService.getProfileById(creatorId);
					let avatar = null;
					if (profile?.avatar) avatar = String(profile.avatar).startsWith("http") ? profile.avatar : await fetchProfilePreview(profile.avatar, 64, 64);
					const enrichedCreator = {
						...profile,
						avatar
					};
					profileRegistry.set(creatorId, enrichedCreator);
					return {
						...m,
						creator: enrichedCreator
					};
				} catch (_e) {
					return m;
				}
			}));
			setSearchResults(enrichedUsers);
			setMomentSearchResults(enrichedMoments);
		} catch (e) {
			console.error("Search failed", e);
		} finally {
			setSearching(false);
		}
	}, [user?.$id]);
	(0, import_react.useEffect)(() => {
		if (view === "search") {
			const timer = setTimeout(() => {
				handleSearch(searchQuery);
			}, 300);
			return () => clearTimeout(timer);
		}
	}, [
		searchQuery,
		handleSearch,
		view
	]);
	const handleNewPostsClick = () => {
		setMoments((prev) => {
			const updated = [...pendingMoments, ...prev];
			saveToCache(updated);
			return updated;
		});
		setPendingMoments([]);
		setShowNewPosts(false);
		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	};
	if (view === "search" || isSearchOpen) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Paper, {
			sx: {
				p: 1.5,
				mb: 4,
				borderRadius: "20px",
				bgcolor: "#000000",
				border: "1px solid rgba(255, 255, 255, 0.05)",
				display: "flex",
				alignItems: "center",
				gap: 1.5
			},
			children: [
				isSearchOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
					onClick: () => setIsSearchOpen(false),
					sx: { color: "rgba(255,255,255,0.5)" },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 20 })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
					size: 20,
					color: "#F59E0B",
					style: {
						marginLeft: isSearchOpen ? "0" : "12px",
						opacity: .6
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
					fullWidth: true,
					placeholder: "Search for people by name or @username...",
					variant: "standard",
					InputProps: {
						disableUnderline: true,
						sx: {
							fontSize: "1rem",
							fontWeight: 600
						}
					},
					value: searchQuery,
					onChange: (e) => setSearchQuery(e.target.value),
					autoFocus: true
				})
			]
		}),
		searching && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
			sx: {
				display: "flex",
				justifyContent: "center",
				py: 4
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircularProgress, {
				size: 24,
				sx: { color: "#F59E0B" }
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Stack, {
			spacing: 3,
			children: [
				searchResults.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
					variant: "overline",
					sx: {
						opacity: .5,
						fontWeight: 900,
						ml: 1,
						mb: 1,
						display: "block"
					},
					children: "People"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stack, {
					spacing: 1,
					children: searchResults.filter((u) => u.userId !== user?.$id).map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Paper, {
						onClick: () => router.push(`/@${u.username}`),
						sx: {
							p: 2,
							borderRadius: "16px",
							bgcolor: "#000000",
							border: "1px solid rgba(255, 255, 255, 0.05)",
							display: "flex",
							alignItems: "center",
							gap: 2,
							cursor: "pointer",
							transition: "all 0.2s ease",
							"&:hover": {
								bgcolor: "#1C1A18",
								transform: "translateX(4px)",
								borderColor: "rgba(245, 158, 11, 0.3)"
							}
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								onClick: (e) => {
									e.stopPropagation();
									router.push(`/u/${u.username}`);
								},
								src: u.avatar,
								sx: {
									width: 48,
									height: 48,
									bgcolor: alpha("#F59E0B", .1),
									color: "#F59E0B",
									fontWeight: 800,
									border: "1px solid rgba(245, 158, 11, 0.2)",
									cursor: "pointer"
								},
								children: (u.displayName || u.username)?.charAt(0).toUpperCase()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
								sx: { flex: 1 },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
									sx: { fontWeight: 800 },
									children: u.displayName || u.username
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
									variant: "caption",
									sx: {
										opacity: .5,
										fontWeight: 700
									},
									children: ["@", u.username]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
								size: "small",
								sx: { color: "#F59E0B" },
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 20 })
							})
						]
					}, u.$id))
				})] }),
				momentSearchResults.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
					variant: "overline",
					sx: {
						opacity: .5,
						fontWeight: 900,
						ml: 1,
						mb: 1,
						display: "block"
					},
					children: "Moments"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stack, {
					spacing: 2,
					children: momentSearchResults.map((moment) => {
						const isOwnPost = user?.$id === (moment.userId || moment.creatorId);
						const creatorId = moment.userId || moment.creatorId;
						const cachedCreator = getCachedIdentityById(creatorId);
						const resolvedCreator = resolveIdentity(moment.creator || cachedCreator, creatorId);
						const creatorName = isOwnPost ? user?.name || "You" : resolvedCreator.displayName;
						const creatorAvatar = isOwnPost ? userAvatarUrl : moment.creator?.avatar || cachedCreator?.avatar || void 0;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							onClick: () => handleOpenMoment(moment),
							sx: {
								...momentCardSx,
								cursor: "pointer"
							},
							elevation: 0,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
								avatar: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
									onClick: (e) => {
										e.stopPropagation();
										const username = resolveIdentityUsername(moment.creator || cachedCreator, creatorId);
										if (username) router.push(`/u/${username}`);
									},
									src: creatorAvatar,
									sx: {
										...feedAvatarSx,
										width: 36,
										height: 36,
										cursor: "pointer"
									}
								}),
								sx: {
									px: 2,
									pt: 2,
									pb: .5,
									"& .MuiCardHeader-content": { minWidth: 0 }
								},
								title: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
									sx: feedTitleSx,
									children: creatorName
								}),
								subheader: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
									sx: feedSubheaderSx,
									children: new Date(moment.createdAt).toLocaleDateString()
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
								sx: {
									pt: .25,
									px: 2,
									pb: 1.5
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
									variant: "body2",
									sx: {
										...feedBodySx,
										opacity: .8,
										WebkitLineClamp: 3
									},
									children: moment.caption
								})
							})]
						}, moment.$id);
					})
				})] }),
				!searching && searchQuery && searchResults.length === 0 && momentSearchResults.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
					sx: {
						textAlign: "center",
						py: 8,
						opacity: .4,
						fontWeight: 600
					},
					children: [
						"No results found for \"",
						searchQuery,
						"\""
					]
				}),
				!searchQuery && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						textAlign: "center",
						py: 8,
						opacity: .4
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							size: 48,
							style: { marginBottom: "16px" }
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							sx: { fontWeight: 700 },
							children: "Search the Kylrix Ecosystem"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							variant: "body2",
							children: "Find friends, creators, and moments."
						})
					]
				})
			]
		})
	] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
		sx: {
			maxWidth: 600,
			mx: "auto",
			p: {
				xs: 1,
				sm: 2
			},
			position: "relative"
		},
		children: [
			showNewPosts && pendingMoments.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewPostsWidget, {
				pendingMoments: pendingMoments.filter((m) => {
					const creatorId = m.userId || m.creatorId;
					const type = m.metadata?.type || "post";
					return !(user?.$id === creatorId && type === "post");
				}),
				onClick: handleNewPostsClick
			}),
			user && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobileComposerDock, {
				ref: mobileComposerDockRef,
				composerKey: `${editingMoment?.$id || "new"}-${composerResetToken}`,
				isMobile,
				user,
				userAvatarUrl,
				editingMoment,
				selectedNote,
				selectedEvent,
				selectedCall,
				pulseTarget,
				selectedFiles,
				posting,
				onCancel: handleCancelComposer,
				onSubmit: handlePost,
				onSelectFiles: handleFileSelect,
				onOpenNote: () => setIsNoteSelectorOpen(true),
				onOpenEvent: () => setIsEventSelectorOpen(true),
				onOpenCall: () => setIsCallSelectorOpen(true),
				onClearNote: () => setSelectedNote(null),
				onClearEvent: () => setSelectedEvent(null),
				onClearCall: () => setSelectedCall(null),
				onClearPulseTarget: () => setPulseTarget(null),
				onRemoveFile: (index) => setSelectedFiles((prev) => prev.filter((_, i) => i !== index)),
				draftInputRef,
				hasDraftText,
				setHasDraftText
			}, composerResetToken),
			moments.length === 0 && loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FeedSkeleton, {}),
			moments.filter((m) => {
				const creatorId = m.userId || m.creatorId;
				const type = m.metadata?.type || "post";
				if (user?.$id && creatorId === user.$id && type === "post") return false;
				return true;
			}).map((moment) => {
				const isOwnPost = user?.$id === (moment.userId || moment.creatorId);
				const creatorId = moment.userId || moment.creatorId;
				const cachedCreator = getCachedIdentityById(creatorId);
				const resolvedCreator = resolveIdentity(moment.creator || cachedCreator, creatorId);
				const creatorName = isOwnPost ? user?.name || "You" : resolvedCreator.displayName;
				const creatorAvatar = isOwnPost ? userAvatarUrl : moment.creator?.avatar || cachedCreator?.avatar || void 0;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					sx: {
						...momentCardSx,
						mb: 3
					},
					elevation: 0,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
							sx: {
								px: 2,
								pt: 2,
								pb: .75,
								"& .MuiCardHeader-content": { minWidth: 0 }
							},
							avatar: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								src: creatorAvatar,
								sx: {
									width: 40,
									height: 40,
									bgcolor: isOwnPost ? "#F59E0B" : "#000000",
									color: isOwnPost ? "#000" : "text.secondary",
									border: "1px solid rgba(255, 255, 255, 0.08)",
									fontWeight: 800,
									borderRadius: "14px",
									boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
								},
								children: creatorName.charAt(0).toUpperCase()
							}),
							title: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
								sx: {
									...feedTitleSx,
									color: isOwnPost ? "#F59E0B" : "white"
								},
								children: [creatorName, isOwnPost && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
									component: "span",
									variant: "caption",
									sx: {
										ml: 1,
										opacity: .4,
										fontWeight: 800,
										verticalAlign: "middle",
										textTransform: "uppercase",
										letterSpacing: "0.05em",
										fontSize: "0.62rem"
									},
									children: "Author"
								})]
							}),
							subheader: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
								variant: "caption",
								sx: feedSubheaderSx,
								children: formatPostTimestamp(moment.$createdAt, moment.$updatedAt)
							}),
							action: isOwnPost && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
								onClick: (e) => {
									setPostMenuAnchorEl(e.currentTarget);
									setMenuMoment(moment);
								},
								sx: {
									color: "rgba(255, 255, 255, 0.2)",
									"&:hover": {
										color: "white",
										bgcolor: "rgba(255,255,255,0.05)"
									}
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, { size: 18 })
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							sx: {
								pt: .25,
								px: 2,
								pb: 1.5,
								cursor: "pointer"
							},
							onClick: () => handleOpenMoment(moment),
							children: [
								moment.metadata?.type === "pulse" && moment.sourceMoment && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
									sx: {
										display: "flex",
										alignItems: "center",
										gap: 1,
										mb: 1.25,
										color: "#10B981",
										opacity: .9
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Repeat2, {
										size: 13,
										strokeWidth: 3
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
										variant: "caption",
										sx: {
											fontWeight: 900,
											letterSpacing: "0.1em",
											textTransform: "uppercase",
											fontSize: "0.6rem"
										},
										children: isOwnPost ? "PULSED BY YOU" : `PULSED BY ${creatorName.toUpperCase()}`
									})]
								}),
								moment.metadata?.type === "reply" && moment.sourceMoment && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
									sx: {
										mb: 2,
										position: "relative"
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
											sx: {
												display: "flex",
												alignItems: "center",
												gap: 1.5,
												mb: 1,
												opacity: .5,
												"&:hover": { opacity: .8 },
												cursor: "pointer"
											},
											onClick: (e) => {
												e.stopPropagation();
												handleOpenMoment(moment.sourceMoment);
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
												src: moment.sourceMoment.creator?.avatar,
												sx: {
													width: 16,
													height: 16,
													borderRadius: "5px"
												}
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
												variant: "caption",
												sx: {
													fontWeight: 800,
													letterSpacing: "0.02em",
													fontSize: "0.72rem"
												},
												children: ["Replying to ", resolveIdentity(moment.sourceMoment.creator, moment.sourceMoment.userId || moment.sourceMoment.creatorId).handle]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, { sx: {
											position: "absolute",
											left: 8,
											top: 20,
											bottom: -10,
											width: "1.5px",
											bgcolor: "rgba(255,255,255,0.08)",
											borderRadius: "1px"
										} }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Paper, {
											sx: {
												p: 1.25,
												ml: 3,
												borderRadius: "12px",
												bgcolor: "#000000",
												border: "1px solid rgba(255, 255, 255, 0.04)",
												pointerEvents: "none"
											},
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
												variant: "caption",
												sx: {
													opacity: .6,
													display: "-webkit-box",
													WebkitLineClamp: 2,
													WebkitBoxOrient: "vertical",
													overflow: "hidden",
													fontSize: "0.76rem",
													lineHeight: 1.4,
													fontStyle: "italic"
												},
												children: moment.sourceMoment.caption
											})
										})
									]
								}),
								moment.caption && moment.caption.trim() !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormattedText, {
									text: moment.caption,
									variant: "body1",
									sx: {
										...feedBodySx,
										lineHeight: 1.5,
										fontSize: "0.94rem",
										mb: moment.attachedNote || moment.sourceMoment && moment.metadata?.type !== "reply" || moment.metadata?.attachments?.length ? 1.5 : 0,
										mt: moment.metadata?.type === "reply" ? 1 : 0
									}
								}),
								moment.metadata?.attachments?.filter((a) => a.type === "image").length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
									sx: {
										display: "grid",
										gap: 1,
										gridTemplateColumns: moment.metadata.attachments.filter((a) => a.type === "image").length === 1 ? "1fr" : "1fr 1fr",
										mb: 2,
										borderRadius: "16px",
										overflow: "hidden",
										border: "1px solid rgba(255, 255, 255, 0.08)",
										bgcolor: "rgba(0,0,0,0.2)"
									},
									children: moment.metadata.attachments.filter((a) => a.type === "image").map((att, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
										component: "img",
										src: SocialService.getMediaPreview(att.id, 800, 600),
										sx: {
											width: "100%",
											height: moment.metadata.attachments.filter((a) => a.type === "image").length === 1 ? 300 : 180,
											objectFit: "cover",
											transition: "transform 0.5s ease",
											"&:hover": { transform: "scale(1.02)" }
										}
									}, i))
								}),
								moment.metadata?.type === "pulse" && moment.sourceMoment && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Paper, {
									sx: {
										p: 1.5,
										borderRadius: "16px",
										bgcolor: "rgba(255,255,255,0.01)",
										border: "1px solid rgba(255,255,255,0.05)",
										transition: "all 0.2s ease",
										"&:hover": {
											bgcolor: "rgba(255,255,255,0.03)",
											borderColor: "rgba(255,255,255,0.1)"
										}
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Stack, {
										direction: "row",
										spacing: 1.25,
										alignItems: "center",
										sx: { mb: 1.25 },
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
												src: moment.sourceMoment.creator?.avatar,
												sx: {
													width: 20,
													height: 20,
													borderRadius: "6px",
													border: "1px solid rgba(255,255,255,0.05)"
												}
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
												sx: {
													fontWeight: 900,
													fontSize: "0.8rem",
													color: "rgba(255,255,255,0.8)"
												},
												children: resolveIdentity(moment.sourceMoment.creator, moment.sourceMoment.userId || moment.sourceMoment.creatorId).displayName
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
												variant: "caption",
												sx: {
													opacity: .3,
													fontFamily: "var(--font-mono)",
													fontSize: "0.68rem"
												},
												children: resolveIdentity(moment.sourceMoment.creator, moment.sourceMoment.userId || moment.sourceMoment.creatorId).handle
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
										variant: "body2",
										sx: {
											...feedBodySx,
											opacity: .7,
											WebkitLineClamp: 3,
											lineHeight: 1.45,
											fontSize: "0.84rem"
										},
										children: moment.sourceMoment.caption
									})]
								}),
								moment.metadata?.type === "quote" && moment.sourceMoment && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Paper, {
									sx: {
										p: 1.5,
										borderRadius: "16px",
										bgcolor: "rgba(255,255,255,0.01)",
										border: "1px solid rgba(255,255,255,0.05)",
										transition: "all 0.2s ease",
										"&:hover": {
											bgcolor: "rgba(255,255,255,0.03)",
											borderColor: "rgba(255,255,255,0.1)"
										}
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Stack, {
										direction: "row",
										spacing: 1.25,
										alignItems: "center",
										sx: { mb: 1.25 },
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
												src: moment.sourceMoment.creator?.avatar,
												sx: {
													width: 20,
													height: 20,
													borderRadius: "6px",
													border: "1px solid rgba(255,255,255,0.05)"
												}
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
												sx: {
													fontWeight: 900,
													fontSize: "0.8rem",
													color: "rgba(255,255,255,0.8)"
												},
												children: resolveIdentity(moment.sourceMoment.creator, moment.sourceMoment.userId || moment.sourceMoment.creatorId).displayName
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
												variant: "caption",
												sx: {
													opacity: .3,
													fontFamily: "var(--font-mono)",
													fontSize: "0.68rem"
												},
												children: resolveIdentity(moment.sourceMoment.creator, moment.sourceMoment.userId || moment.sourceMoment.creatorId).handle
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
										variant: "body2",
										sx: {
											...feedBodySx,
											opacity: .7,
											WebkitLineClamp: 3,
											lineHeight: 1.45,
											fontSize: "0.84rem"
										},
										children: moment.sourceMoment.caption
									})]
								}),
								moment.attachedNote && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Paper, {
									variant: "outlined",
									onClick: () => handleOpenNote(moment.attachedNote),
									sx: {
										p: 0,
										borderRadius: 4,
										bgcolor: "#000000",
										borderColor: "rgba(255, 255, 255, 0.08)",
										cursor: "pointer",
										transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
										overflow: "hidden",
										"&:hover": {
											borderColor: "rgba(99, 102, 241, 0.4)",
											transform: "translateY(-4px)",
											boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(99, 102, 241, 0.1)"
										}
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
										sx: {
											p: 2,
											background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(0, 163, 255, 0.02) 100%)",
											borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
											sx: {
												display: "flex",
												alignItems: "center",
												mb: 1.5
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
												sx: {
													width: 34,
													height: 34,
													borderRadius: 1.5,
													bgcolor: "rgba(99, 102, 241, 0.1)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													mr: 2,
													boxShadow: "0 4px 12px rgba(99, 102, 241, 0.15)"
												},
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, {
													size: 20,
													color: "#6366F1",
													strokeWidth: 1.5
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
												sx: {
													flex: 1,
													minWidth: 0
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
													variant: "subtitle1",
													sx: {
														...feedTitleSx,
														fontSize: "0.9rem"
													},
													children: moment.attachedNote.title || "Untitled Note"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
													variant: "caption",
													sx: {
														color: "rgba(255, 255, 255, 0.4)",
														fontWeight: 600,
														fontSize: "0.68rem"
													},
													children: ["Public Note • ", new Date(moment.attachedNote.updatedAt || moment.attachedNote.$updatedAt).toLocaleDateString()]
												})]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
											variant: "body2",
											sx: {
												...feedBodySx,
												color: "rgba(255, 255, 255, 0.7)",
												lineHeight: 1.5,
												fontSize: "0.86rem",
												WebkitLineClamp: 4
											},
											children: moment.attachedNote.content?.replace(/[#*`]/g, "")
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
										sx: {
											px: 2,
											py: 1.25,
											bgcolor: "rgba(0, 0, 0, 0.2)",
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
											variant: "caption",
											sx: {
												color: "#6366F1",
												fontWeight: 800,
												letterSpacing: "0.05em",
												textTransform: "uppercase",
												fontSize: "0.6rem"
											},
											children: "Shared via Kylrix Note"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
											sx: {
												display: "flex",
												gap: 1
											},
											children: moment.attachedNote.tags?.slice(0, 2).map((_tag, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
												sx: {
													px: 1,
													py: .25,
													borderRadius: 1,
													bgcolor: "rgba(255, 255, 255, 0.05)",
													fontSize: "0.62rem",
													color: "rgba(255, 255, 255, 0.5)",
													fontWeight: 700
												},
												children: ["#", _tag]
											}, i))
										})]
									})]
								}),
								moment.attachedEvent && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Paper, {
									variant: "outlined",
									onClick: () => handleOpenEvent(moment.attachedEvent),
									sx: {
										p: 0,
										borderRadius: 4,
										bgcolor: "#000000",
										borderColor: "rgba(255, 255, 255, 0.08)",
										cursor: "pointer",
										transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
										overflow: "hidden",
										"&:hover": {
											borderColor: "rgba(0, 163, 255, 0.4)",
											transform: "translateY(-4px)",
											boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 163, 255, 0.1)"
										}
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
										sx: {
											p: 2,
											background: "linear-gradient(135deg, rgba(0, 163, 255, 0.05) 0%, rgba(0, 120, 255, 0.02) 100%)",
											borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
											sx: {
												display: "flex",
												alignItems: "center",
												mb: 1.5
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
												sx: {
													width: 34,
													height: 34,
													borderRadius: 1.5,
													bgcolor: "rgba(0, 163, 255, 0.1)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													mr: 2,
													boxShadow: "0 4px 12px rgba(0, 163, 255, 0.15)"
												},
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, {
													size: 20,
													color: "#00A3FF",
													strokeWidth: 1.5
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
												sx: {
													flex: 1,
													minWidth: 0
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
													variant: "subtitle1",
													sx: {
														...feedTitleSx,
														fontSize: "0.9rem"
													},
													children: moment.attachedEvent.title || "Untitled Event"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
													variant: "caption",
													sx: {
														color: "rgba(255, 255, 255, 0.4)",
														fontWeight: 600,
														fontSize: "0.68rem"
													},
													children: ["Kylrix Flow Event • ", new Date(moment.attachedEvent.startTime).toLocaleDateString()]
												})]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
											sx: {
												display: "flex",
												flexDirection: "column",
												gap: .75
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
												sx: {
													display: "flex",
													alignItems: "center",
													gap: 1.5,
													color: "rgba(255, 255, 255, 0.6)"
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, {
													size: 13,
													strokeWidth: 1.5
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
													variant: "caption",
													fontWeight: 600,
													sx: { fontSize: "0.72rem" },
													children: [
														new Date(moment.attachedEvent.startTime).toLocaleTimeString([], {
															hour: "2-digit",
															minute: "2-digit"
														}),
														" - ",
														new Date(moment.attachedEvent.endTime).toLocaleTimeString([], {
															hour: "2-digit",
															minute: "2-digit"
														})
													]
												})]
											}), moment.attachedEvent.location && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
												sx: {
													display: "flex",
													alignItems: "center",
													gap: 1.5,
													color: "rgba(255, 255, 255, 0.6)"
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, {
													size: 13,
													strokeWidth: 1.5
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
													variant: "caption",
													fontWeight: 600,
													sx: { fontSize: "0.72rem" },
													children: moment.attachedEvent.location
												})]
											})]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
										sx: {
											px: 2,
											py: 1.25,
											bgcolor: "rgba(0, 0, 0, 0.2)",
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
											variant: "caption",
											sx: {
												color: "#00A3FF",
												fontWeight: 800,
												letterSpacing: "0.05em",
												textTransform: "uppercase",
												fontSize: "0.6rem"
											},
											children: "Scheduled via Kylrixflow"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "small",
											variant: "text",
											sx: {
												color: "#00A3FF",
												fontWeight: 800,
												fontSize: "0.6rem"
											},
											children: "View Details"
										})]
									})]
								}),
								moment.attachedCall && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Paper, {
									variant: "outlined",
									onClick: () => router.push(`/call/${moment.attachedCall.$id}`),
									sx: {
										p: 0,
										borderRadius: 4,
										bgcolor: "#000000",
										borderColor: "rgba(255, 255, 255, 0.08)",
										cursor: "pointer",
										transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
										overflow: "hidden",
										"&:hover": {
											borderColor: "rgba(245, 158, 11, 0.4)",
											transform: "translateY(-4px)",
											boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(245, 158, 11, 0.1)"
										}
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
										sx: {
											p: 2,
											background: "linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(245, 158, 11, 0.02) 100%)",
											borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
											sx: {
												display: "flex",
												alignItems: "center",
												mb: 1.5
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
												sx: {
													width: 34,
													height: 34,
													borderRadius: 1.5,
													bgcolor: "rgba(245, 158, 11, 0.1)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													mr: 2,
													boxShadow: "0 4px 12px rgba(245, 158, 11, 0.15)"
												},
												children: moment.attachedCall.type === "video" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, {
													size: 20,
													color: "#F59E0B",
													strokeWidth: 1.5
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, {
													size: 20,
													color: "#F59E0B",
													strokeWidth: 1.5
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
												sx: {
													flex: 1,
													minWidth: 0
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
													variant: "subtitle1",
													sx: {
														...feedTitleSx,
														fontSize: "0.9rem"
													},
													children: moment.attachedCall.title || `${moment.attachedCall.type.charAt(0).toUpperCase() + moment.attachedCall.type.slice(1)} Call`
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
													variant: "caption",
													sx: {
														color: "rgba(255, 255, 255, 0.4)",
														fontWeight: 600,
														fontSize: "0.68rem"
													},
													children: ["Kylrix Connect Call • ", new Date(moment.attachedCall.startsAt).toLocaleDateString()]
												})]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
											sx: {
												display: "flex",
												flexDirection: "column",
												gap: .75
											},
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
												sx: {
													display: "flex",
													alignItems: "center",
													gap: 1.5,
													color: "rgba(255, 255, 255, 0.6)"
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, {
													size: 13,
													strokeWidth: 1.5
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
													variant: "caption",
													fontWeight: 600,
													sx: { fontSize: "0.72rem" },
													children: ["Starts: ", new Date(moment.attachedCall.startsAt).toLocaleTimeString([], {
														hour: "2-digit",
														minute: "2-digit"
													})]
												})]
											})
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
										sx: {
											px: 2,
											py: 1.25,
											bgcolor: "rgba(0, 0, 0, 0.2)",
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
											variant: "caption",
											sx: {
												color: "#F59E0B",
												fontWeight: 800,
												letterSpacing: "0.05em",
												textTransform: "uppercase",
												fontSize: "0.6rem"
											},
											children: "Hosted via Kylrix Connect"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "small",
											variant: "text",
											sx: {
												color: "#F59E0B",
												fontWeight: 800,
												fontSize: "0.6rem"
											},
											children: "Join Call"
										})]
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardActions, {
							sx: {
								px: 2,
								pb: 1.25,
								pt: 1,
								justifyContent: "space-around",
								color: "rgba(255, 255, 255, 0.4)",
								borderTop: "1px solid rgba(255,255,255,0.05)"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
									title: "Reply",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
										sx: {
											display: "flex",
											alignItems: "center",
											gap: .5
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
											size: "small",
											sx: {
												p: .75,
												"&:hover": {
													color: "#6366F1",
													bgcolor: alpha("#6366F1", .1)
												}
											},
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, {
												size: 17,
												strokeWidth: 1.5
											})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
											variant: "caption",
											sx: feedActionCountSx,
											children: moment.stats?.replies || 0
										})]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
									title: "Pulse or Quote",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
										onClick: (e) => {
											e.stopPropagation();
											openActorsList("Pulsed by", async () => await fetchActorsForPulses(moment.$id));
										},
										sx: {
											display: "flex",
											alignItems: "center",
											gap: .5,
											cursor: "pointer"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
											size: "small",
											onClick: (e) => {
												e.stopPropagation();
												setPulseMenuAnchorEl(e.currentTarget);
												setMenuMoment(moment);
											},
											sx: {
												p: .75,
												color: moment.isPulsed ? "#10B981" : "inherit",
												bgcolor: moment.isPulsed ? "rgba(16,185,129,0.06)" : "transparent",
												"&:hover": {
													color: "#10B981",
													bgcolor: alpha("#10B981", .12)
												}
											},
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Repeat2, {
												size: 17,
												strokeWidth: moment.isPulsed ? 2 : 1.5
											})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
											variant: "caption",
											sx: feedActionCountSx,
											children: moment.stats?.pulses || 0
										})]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
									title: "Heart",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
										sx: {
											display: "flex",
											alignItems: "center",
											gap: .5
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
											size: "small",
											onClick: (e) => handleToggleLike(e, moment),
											sx: {
												p: .75,
												color: moment.isLiked ? "#F59E0B" : "inherit",
												"&:hover": {
													color: "#F59E0B",
													bgcolor: alpha("#F59E0B", .1)
												}
											},
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, {
												size: 17,
												fill: moment.isLiked ? "#F59E0B" : "none",
												strokeWidth: 1.5
											})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
											onClick: (e) => {
												e.stopPropagation();
												openActorsList("Likes", async () => await fetchActorsForLikes(moment.$id));
											},
											sx: {
												display: "flex",
												alignItems: "center",
												gap: .5,
												cursor: "pointer"
											},
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
												sx: feedActionCountSx,
												variant: "caption",
												children: moment.stats?.likes || 0
											})
										})]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
									title: "Bookmark",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
										size: "small",
										sx: {
											p: .75,
											"&:hover": {
												color: "#EC4899",
												bgcolor: alpha("#EC4899", .1)
											}
										},
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, {
											size: 17,
											strokeWidth: 1.5
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
									title: "Share",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
										size: "small",
										onClick: (e) => {
											e.stopPropagation();
											setShareAnchorEl(e.currentTarget);
											setSelectedMoment(moment);
										},
										sx: {
											p: .75,
											"&:hover": {
												color: "#6366F1",
												bgcolor: alpha("#6366F1", .1)
											}
										},
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share, {
											size: 17,
											strokeWidth: 1.5
										})
									})
								})
							]
						})
					]
				}, moment.$id);
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Menu, {
				anchorEl: postMenuAnchorEl,
				open: Boolean(postMenuAnchorEl),
				onClose: () => setPostMenuAnchorEl(null),
				PaperProps: { sx: {
					mt: 1,
					borderRadius: "16px",
					bgcolor: "#000000",
					border: "1px solid rgba(255, 255, 255, 0.08)",
					minWidth: 160
				} },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MenuItem, {
						onClick: () => menuMoment && handleEditMoment(menuMoment),
						sx: {
							gap: 1.5,
							py: 1.2,
							fontWeight: 700,
							fontSize: "0.75rem",
							textTransform: "uppercase",
							letterSpacing: "0.05em"
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquarePen, {
							size: 16,
							strokeWidth: 2,
							style: { opacity: .7 }
						}), " Edit Moment"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Divider, { sx: { borderColor: "rgba(255, 255, 255, 0.05)" } }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MenuItem, {
						onClick: () => menuMoment && handleDeletePost(menuMoment.$id),
						sx: {
							gap: 1.5,
							py: 1.2,
							fontWeight: 700,
							fontSize: "0.75rem",
							textTransform: "uppercase",
							letterSpacing: "0.05em",
							color: "#ff4d4d"
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
							size: 16,
							strokeWidth: 2
						}), " Delete Moment"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Menu, {
				anchorEl: pulseMenuAnchorEl,
				open: Boolean(pulseMenuAnchorEl),
				onClose: () => setPulseMenuAnchorEl(null),
				PaperProps: { sx: {
					mt: 1,
					borderRadius: "16px",
					bgcolor: "#000000",
					border: "1px solid rgba(255, 255, 255, 0.08)",
					minWidth: 180
				} },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MenuItem, {
					onClick: () => menuMoment && handlePulse(menuMoment),
					sx: {
						gap: 1.5,
						py: 1.2,
						fontWeight: 700,
						fontSize: "0.75rem",
						textTransform: "uppercase",
						letterSpacing: "0.05em",
						color: "#10B981"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Repeat2, {
							size: 18,
							strokeWidth: 2
						}),
						" ",
						moments.some((m) => m.metadata?.type === "pulse" && m.metadata?.sourceId === menuMoment?.$id && (m.userId === user?.$id || m.creatorId === user?.$id)) ? "Unpulse Moment" : "Pulse Now"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MenuItem, {
					onClick: () => menuMoment && handleQuote(menuMoment),
					sx: {
						gap: 1.5,
						py: 1.2,
						fontWeight: 700,
						fontSize: "0.75rem",
						textTransform: "uppercase",
						letterSpacing: "0.05em"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquarePen, {
						size: 18,
						strokeWidth: 2,
						style: { opacity: .7 }
					}), " Quote Moment"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Menu, {
				anchorEl: shareAnchorEl,
				open: Boolean(shareAnchorEl),
				onClose: () => setShareAnchorEl(null),
				PaperProps: { sx: {
					mt: 1,
					borderRadius: "16px",
					bgcolor: "#000000",
					border: "1px solid rgba(255, 255, 255, 0.08)",
					minWidth: 200
				} },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MenuItem, {
					onClick: () => handleForwardToSaved(selectedMoment),
					sx: {
						gap: 1.5,
						py: 1.2,
						fontWeight: 600
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, {
						size: 20,
						strokeWidth: 1.5,
						style: { opacity: .7 }
					}), " Save to Messages"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MenuItem, {
					onClick: () => handleForwardToChat(selectedMoment),
					sx: {
						gap: 1.5,
						py: 1.2,
						fontWeight: 600
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, {
						size: 20,
						strokeWidth: 1.5,
						style: { opacity: .7 }
					}), " Forward to Chat"]
				})]
			}),
			moments.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
				sx: {
					textAlign: "center",
					py: 10,
					bgcolor: "#000000",
					borderRadius: "32px",
					border: "1px dashed rgba(255, 255, 255, 0.1)"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
					sx: {
						color: "text.secondary",
						fontWeight: 700
					},
					children: "No moments in the feed yet."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
					variant: "body2",
					sx: {
						color: "text.disabled",
						mt: 1
					},
					children: "Be the first to share an update!"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoteSelectorModal, {
				open: isNoteModalOpen,
				onClose: () => setIsNoteSelectorOpen(false),
				onSelect: (note) => setSelectedNote(note)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoteViewDrawer, {
				open: isNoteDrawerOpen,
				onClose: () => setIsNoteDrawerOpen(false),
				note: viewingNote
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventSelectorModal, {
				open: isEventModalOpen,
				onClose: () => setIsEventSelectorOpen(false),
				onSelect: (event) => setSelectedEvent(event)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallSelectorModal, {
				open: isCallModalOpen,
				onClose: () => setIsCallSelectorOpen(false),
				onSelect: (call) => setSelectedCall(call)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventViewDrawer, {
				open: isEventDrawerOpen,
				onClose: () => setIsEventDrawerOpen(false),
				event: viewingEvent
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActorsListDrawer, {
				open: actorsDrawerOpen,
				onClose: () => setActorsDrawerOpen(false),
				title: actorsTitle,
				actors: actorsList,
				mobile: isMobile,
				onSelect: (actor) => {
					setActorsDrawerOpen(false);
					router.push(`/@${actor.username || actor.$id}`);
				}
			})
		]
	});
};
function Home$1() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Container, {
		maxWidth: "md",
		sx: { py: 2 },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feed, { view: "personal" })
	}) });
}
var SplitComponent = Home$1;
//#endregion
export { SplitComponent as component };
