import { o as __toESM } from "../_runtime.mjs";
import { n as UsersService, o as seedIdentityCache, r as getCachedIdentityById } from "./users-vRrLGFai.mjs";
import { o as require_react } from "../_libs/@emotion/react+[...].mjs";
import { H as useTheme, J as alpha, xt as require_jsx_runtime } from "../_libs/@mui/icons-material+[...].mjs";
import { B as Box, C as InputAdornment, E as Drawer, H as Avatar, J as IconButton, K as Typography, T as Fab, X as Paper, Y as CircularProgress, _ as ListItemIcon, b as ListItemButton, f as Skeleton, g as ListItemText, m as Menu, n as TextField, p as MenuItem, q as Alert, s as Stack, t as useMediaQuery, z as Button } from "../_libs/@mui/material+[...].mjs";
import { a as useParams$1, i as useAuth, s as useRouter } from "./chat-GLmU6cBO.mjs";
import { At as ArrowDownWideNarrow, B as MessageCircle, H as LogIn, K as Link2, O as Repeat2, Q as Heart, T as Send, Y as Image$1, dt as Download, g as SquarePen, kt as ArrowLeft, wt as ChartColumn, y as SlidersHorizontal } from "../_libs/lucide-react.mjs";
import { t as FormattedText } from "./FormattedText-D8u0iX80.mjs";
import { r as zt } from "../_libs/react-hot-toast.mjs";
import { C as useCachedProfilePreview, O as useProfile, _ as fetchProfilePreview } from "./DynamicIsland-DPFhB0ig.mjs";
import { t as AppShell } from "./AppShell-JgOEZgrs.mjs";
import { a as getCachedMomentThread, c as seedMomentThread, i as getCachedMomentPreview, n as SocialService, o as isFreshMomentThread, r as THREAD_CACHE_STALE_AFTER_MS, s as seedMomentPreview, t as ActorsListDrawer } from "./ActorsListDrawer-NQvy58wX.mjs";
import { n as resolveIdentity, t as formatPostTimestamp } from "./time-pgZ5YIc8.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/post._id-BbgZS1Iy.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var EXPORT_CARD = "#161514";
var EXPORT_PAD = 16;
var EXPORT_MIN_WIDTH = 375;
var EXPORT_MAX_WIDTH = 430;
var clampText = (value, limit) => {
	const clean = String(value || "").trim();
	return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean;
};
var getMomentTimeLabel = (moment) => {
	return formatPostTimestamp(moment?.$createdAt || moment?.createdAt, moment?.$updatedAt || moment?.updatedAt) || "Just now";
};
var wrapLines = (ctx, text, maxWidth) => {
	const words = String(text || "").split(/\s+/).filter(Boolean);
	if (!words.length) return [""];
	const lines = [];
	let current = words.shift() || "";
	for (const word of words) {
		const next = `${current} ${word}`;
		if (ctx.measureText(next).width <= maxWidth) current = next;
		else {
			lines.push(current);
			current = word;
		}
	}
	lines.push(current);
	return lines;
};
var drawRoundedRect = (ctx, x, y, width, height, radius) => {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.arcTo(x + width, y, x + width, y + height, radius);
	ctx.arcTo(x + width, y + height, x, y + height, radius);
	ctx.arcTo(x, y + height, x, y, radius);
	ctx.arcTo(x, y, x + width, y, radius);
	ctx.closePath();
};
var loadImage = (src) => new Promise((resolve) => {
	if (!src) return resolve(null);
	const image = new Image();
	image.crossOrigin = "anonymous";
	image.onload = () => resolve(image);
	image.onerror = () => resolve(null);
	image.src = src;
});
var resolveExportImageSrc = async (src) => {
	if (!src) return null;
	if (/^(https?:|data:|blob:)/.test(src)) return src;
	try {
		return await fetchProfilePreview(src, 96, 96);
	} catch (_e) {
		return null;
	}
};
var resolveExportAvatarSource = async (identity) => {
	return resolveExportImageSrc(identity?.avatar || identity?.profilePicId || identity?.preferences?.avatar || identity?.preferences?.profilePicId || null);
};
var drawAvatar = async (ctx, x, y, size, src, label = "U") => {
	ctx.save();
	ctx.beginPath();
	ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
	ctx.closePath();
	ctx.clip();
	ctx.fillStyle = "rgba(255,255,255,0.06)";
	ctx.fillRect(x, y, size, size);
	const avatar = await loadImage(await resolveExportImageSrc(src) || "");
	if (avatar) ctx.drawImage(avatar, x, y, size, size);
	else {
		ctx.fillStyle = "#F59E0B";
		ctx.fillRect(x, y, size, size);
		ctx.fillStyle = "#161514";
		ctx.font = `700 ${Math.floor(size * .45)}px sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(label.slice(0, 1).toUpperCase(), x + size / 2, y + size / 2 + 2);
	}
	ctx.restore();
};
var drawMetricBlock = (ctx, x, y, value, label, color) => {
	ctx.fillStyle = color;
	ctx.font = "900 14px sans-serif";
	ctx.fillText(String(value), x, y);
	ctx.fillStyle = "rgba(255,255,255,0.72)";
	ctx.font = "800 10px sans-serif";
	ctx.fillText(label.toUpperCase(), x + 18, y);
};
var drawCommentIcon = (ctx, x, y, size, color) => {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = 1.8;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.beginPath();
	ctx.moveTo(x + 4, y + 5);
	ctx.arc(x + size / 2, y + size / 2, size / 2 - 4, Math.PI * 1.08, Math.PI * 1.98, false);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x + size * .42, y + size - 6);
	ctx.lineTo(x + size * .3, y + size - 1);
	ctx.lineTo(x + size * .52, y + size - 3);
	ctx.stroke();
	ctx.restore();
};
var drawRepeatIcon = (ctx, x, y, size, color) => {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = 1.8;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.beginPath();
	ctx.arc(x + size * .42, y + size * .42, size * .24, Math.PI * 1.15, Math.PI * .15, true);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x + size * .68, y + size * .18);
	ctx.lineTo(x + size * .84, y + size * .21);
	ctx.lineTo(x + size * .74, y + size * .36);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(x + size * .58, y + size * .58, size * .24, Math.PI * .15, Math.PI * 1.15, true);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x + size * .32, y + size * .82);
	ctx.lineTo(x + size * .16, y + size * .79);
	ctx.lineTo(x + size * .26, y + size * .64);
	ctx.stroke();
	ctx.restore();
};
var drawHeartIcon = (ctx, x, y, size, color, filled = false) => {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.fillStyle = filled ? color : "transparent";
	ctx.lineWidth = 1.8;
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	ctx.beginPath();
	const left = x + size * .5;
	const top = y + size * .28;
	ctx.moveTo(left, y + size * .85);
	ctx.bezierCurveTo(x + size * .12, y + size * .6, x + size * .1, top, x + size * .33, top);
	ctx.bezierCurveTo(x + size * .48, top, x + size * .5, y + size * .46, left, y + size * .36);
	ctx.bezierCurveTo(x + size * .5, y + size * .46, x + size * .52, top, x + size * .67, top);
	ctx.bezierCurveTo(x + size * .9, top, x + size * .88, y + size * .6, left, y + size * .85);
	if (filled) ctx.fill();
	else ctx.stroke();
	ctx.restore();
};
var drawLinkIcon = (ctx, x, y, size, color) => {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.8;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.beginPath();
	ctx.arc(x + size * .36, y + size * .52, size * .2, Math.PI * .2, Math.PI * 1.35);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(x + size * .64, y + size * .48, size * .2, Math.PI * 1.2, Math.PI * .85, true);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x + size * .48, y + size * .4);
	ctx.lineTo(x + size * .56, y + size * .4);
	ctx.stroke();
	ctx.restore();
};
var drawSendIcon = (ctx, x, y, size, color) => {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = 1.8;
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(x + 3, y + size * .58);
	ctx.lineTo(x + size - 2, y + 4);
	ctx.lineTo(x + size * .56, y + size * .9);
	ctx.lineTo(x + size * .48, y + size * .62);
	ctx.closePath();
	ctx.stroke();
	ctx.restore();
};
var ThreadPostView = ({ name, handle, timeLabel, caption, attachments, avatarSrc, avatarLabel, replyingTo, stats, threadLineMode = "none", variant = "card", onClick, onLike, onPulse, liked }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
	component: "article",
	onClick,
	sx: {
		display: "flex",
		px: 2,
		py: 1.5,
		position: "relative",
		cursor: onClick ? "pointer" : "default",
		bgcolor: variant === "card" ? "#161514" : "transparent",
		border: variant === "card" ? "1px solid rgba(255,255,255,0.07)" : "none",
		borderRadius: variant === "card" ? "20px" : 0,
		boxShadow: variant === "card" ? "0 0 0 1px rgba(245, 158, 11, 0.08), 0 0 30px rgba(245, 158, 11, 0.12), 0 18px 42px rgba(0, 0, 0, 0.34)" : "none",
		overflow: "hidden",
		"&:hover": onClick ? {
			bgcolor: variant === "card" ? "#1F1D1B" : "rgba(255,255,255,0.02)",
			borderColor: "rgba(245, 158, 11, 0.16)"
		} : void 0
	},
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
		sx: {
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			mr: 1.5,
			flexShrink: 0,
			width: 48
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
			sx: {
				position: "relative",
				width: 48,
				height: "100%",
				display: "flex",
				justifyContent: "center"
			},
			children: [
				(threadLineMode === "up" || threadLineMode === "both") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, { sx: {
					position: "absolute",
					left: "50%",
					top: 0,
					bottom: "50%",
					width: "2px",
					transform: "translateX(-1px)",
					bgcolor: "rgba(255,255,255,0.16)"
				} }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
					src: avatarSrc || void 0,
					sx: {
						width: 48,
						height: 48,
						bgcolor: "rgba(255,255,255,0.05)",
						color: "#fff",
						fontWeight: 800,
						fontSize: "0.95rem",
						position: "relative",
						zIndex: 1
					},
					children: avatarLabel
				}),
				(threadLineMode === "down" || threadLineMode === "both") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, { sx: {
					position: "absolute",
					left: "50%",
					top: "50%",
					bottom: 0,
					width: "2px",
					transform: "translateX(-1px)",
					bgcolor: "rgba(255,255,255,0.16)"
				} })
			]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
		sx: {
			flex: 1,
			minWidth: 0
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
				sx: {
					display: "flex",
					gap: .5,
					alignItems: "baseline",
					flexWrap: "wrap",
					mb: .25
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						sx: {
							fontWeight: 800,
							color: "text.primary",
							fontSize: "0.95rem",
							lineHeight: 1.2
						},
						children: name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						sx: {
							color: "text.secondary",
							fontSize: "0.93rem",
							lineHeight: 1.2
						},
						children: handle
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						sx: {
							color: "text.secondary",
							fontSize: "0.93rem",
							lineHeight: 1.2
						},
						children: "·"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						sx: {
							color: "text.secondary",
							fontSize: "0.93rem",
							lineHeight: 1.2
						},
						children: timeLabel
					})
				]
			}),
			replyingTo && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Typography, {
				sx: {
					color: "text.secondary",
					fontSize: "0.93rem",
					mb: .25
				},
				children: ["Replying to ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
					component: "span",
					sx: { color: "#6366F1" },
					children: replyingTo
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormattedText, {
				text: caption,
				variant: "body2",
				sx: {
					color: "text.primary",
					fontSize: "0.95rem",
					lineHeight: 1.35,
					whiteSpace: "pre-wrap",
					wordBreak: "break-word"
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
				sx: {
					display: "flex",
					justifyContent: "space-between",
					maxWidth: 425,
					mt: 1.25,
					color: "text.secondary",
					fontSize: "0.8rem"
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
						sx: {
							display: "flex",
							alignItems: "center",
							gap: .75
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
							size: "small",
							sx: {
								p: .35,
								color: "#536471"
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, {
								size: 16,
								strokeWidth: 1.8
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							sx: {
								fontSize: "0.8rem",
								color: "#536471"
							},
							children: stats.replies || 0
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
						sx: {
							display: "flex",
							alignItems: "center",
							gap: .75
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
							size: "small",
							onClick: onPulse,
							sx: {
								p: .35,
								color: "#10B981"
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Repeat2, {
								size: 16,
								strokeWidth: 1.8
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							sx: {
								fontSize: "0.8rem",
								color: "#10B981"
							},
							children: stats.pulses || 0
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
						sx: {
							display: "flex",
							alignItems: "center",
							gap: .75
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
							size: "small",
							onClick: onLike,
							sx: {
								p: .35,
								color: liked ? "#F59E0B" : "#536471"
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, {
								size: 16,
								fill: liked ? "#F59E0B" : "none",
								strokeWidth: 1.8
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							sx: {
								fontSize: "0.8rem",
								color: liked ? "#F59E0B" : "#536471"
							},
							children: stats.likes || 0
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
						sx: {
							display: "flex",
							alignItems: "center",
							gap: .75
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
							size: "small",
							sx: {
								p: .35,
								color: "#536471"
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartColumn, {
								size: 16,
								strokeWidth: 1.8
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							sx: {
								fontSize: "0.8rem",
								color: "#536471"
							},
							children: stats.views || 0
						})]
					})
				]
			})
		]
	})]
});
var QuoteMomentView = ({ name, handle, timeLabel, caption, avatarSrc, avatarLabel, quotedAvatarSrc, quotedCaption, quotedName, quotedHandle, attachments, stats, onClick, onLike, onPulse, liked }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
	component: "article",
	onClick,
	sx: {
		display: "flex",
		flexDirection: "column",
		gap: 1.5,
		px: 2,
		py: 1.5,
		position: "relative",
		cursor: onClick ? "pointer" : "default",
		bgcolor: "#000000",
		border: "1px solid rgba(255,255,255,0.07)",
		borderRadius: "20px",
		boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.08), 0 0 30px rgba(245, 158, 11, 0.12), 0 18px 42px rgba(0, 0, 0, 0.34)",
		overflow: "hidden",
		"&:hover": onClick ? {
			bgcolor: "#000000",
			borderColor: "rgba(245, 158, 11, 0.16)"
		} : void 0
	},
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
			sx: {
				display: "flex",
				alignItems: "center",
				gap: 1.25,
				minWidth: 0
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
				src: avatarSrc || void 0,
				sx: {
					width: 42,
					height: 42,
					bgcolor: "rgba(255,255,255,0.05)",
					color: "#fff",
					fontWeight: 800,
					fontSize: "0.95rem",
					borderRadius: "14px",
					flexShrink: 0
				},
				children: avatarLabel
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				sx: {
					minWidth: 0,
					flex: 1
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						gap: .5,
						alignItems: "baseline",
						flexWrap: "wrap"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							sx: {
								fontWeight: 800,
								color: "text.primary",
								fontSize: "0.95rem",
								lineHeight: 1.2
							},
							children: name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							sx: {
								color: "text.secondary",
								fontSize: "0.93rem",
								lineHeight: 1.2
							},
							children: handle
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							sx: {
								color: "text.secondary",
								fontSize: "0.93rem",
								lineHeight: 1.2
							},
							children: "·"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							sx: {
								color: "text.secondary",
								fontSize: "0.93rem",
								lineHeight: 1.2
							},
							children: timeLabel
						})
					]
				})
			})]
		}),
		caption && caption.trim() !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormattedText, {
			text: caption,
			variant: "body1",
			sx: {
				color: "text.primary",
				fontSize: "0.94rem",
				lineHeight: 1.5,
				whiteSpace: "pre-wrap",
				wordBreak: "break-word"
			}
		}),
		!!attachments?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
			sx: {
				display: "grid",
				gap: 1,
				gridTemplateColumns: attachments.filter((a) => a.type === "image").length === 1 ? "1fr" : "1fr 1fr",
				borderRadius: "16px",
				overflow: "hidden",
				border: "1px solid rgba(255,255,255,0.08)",
				bgcolor: "rgba(0,0,0,0.2)"
			},
			children: attachments.filter((a) => a.type === "image").map((att, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				component: "img",
				src: SocialService.getMediaPreview(att.id, 800, 600),
				sx: {
					width: "100%",
					height: attachments.filter((a) => a.type === "image").length === 1 ? 300 : 180,
					objectFit: "cover"
				}
			}, `${att.id}-${i}`))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Paper, {
			sx: {
				p: 1.5,
				borderRadius: "16px",
				bgcolor: "#000000",
				border: "1px solid rgba(255,255,255,0.06)",
				boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.05), 0 0 24px rgba(245, 158, 11, 0.08)"
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Stack, {
				direction: "row",
				spacing: 1.25,
				alignItems: "center",
				sx: { mb: 1.25 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
						src: quotedAvatarSrc || void 0,
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
						children: quotedName
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						variant: "caption",
						sx: {
							opacity: .3,
							fontFamily: "var(--font-mono)",
							fontSize: "0.68rem"
						},
						children: quotedHandle
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
				variant: "body2",
				sx: {
					color: "rgba(255,255,255,0.72)",
					lineHeight: 1.45,
					fontSize: "0.84rem"
				},
				children: quotedCaption
			})]
		}),
		!!attachments?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
			sx: {
				display: "grid",
				gap: 1,
				gridTemplateColumns: attachments.filter((a) => a.type === "image").length === 1 ? "1fr" : "1fr 1fr",
				borderRadius: "16px",
				overflow: "hidden",
				border: "1px solid rgba(255,255,255,0.08)",
				bgcolor: "rgba(0,0,0,0.2)"
			},
			children: attachments.filter((a) => a.type === "image").map((att, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				component: "img",
				src: SocialService.getMediaPreview(att.id, 800, 600),
				sx: {
					width: "100%",
					height: attachments.filter((a) => a.type === "image").length === 1 ? 300 : 180,
					objectFit: "cover"
				}
			}, `${att.id}-${i}`))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
			sx: {
				display: "flex",
				justifyContent: "space-between",
				maxWidth: 425,
				color: "text.secondary",
				fontSize: "0.8rem"
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						alignItems: "center",
						gap: .75
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
						size: "small",
						sx: {
							p: .35,
							color: "#536471"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, {
							size: 16,
							strokeWidth: 1.8
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						sx: {
							fontSize: "0.8rem",
							color: "#536471"
						},
						children: stats.replies || 0
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						alignItems: "center",
						gap: .75
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
						size: "small",
						onClick: onPulse,
						sx: {
							p: .35,
							color: "#10B981"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Repeat2, {
							size: 16,
							strokeWidth: 1.8
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						sx: {
							fontSize: "0.8rem",
							color: "#10B981"
						},
						children: stats.pulses || 0
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						alignItems: "center",
						gap: .75
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
						size: "small",
						onClick: onLike,
						sx: {
							p: .35,
							color: liked ? "#F59E0B" : "#536471"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, {
							size: 16,
							fill: liked ? "#F59E0B" : "none",
							strokeWidth: 1.8
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						sx: {
							fontSize: "0.8rem",
							color: liked ? "#F59E0B" : "#536471"
						},
						children: stats.likes || 0
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						alignItems: "center",
						gap: .75
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
						size: "small",
						sx: {
							p: .35,
							color: "#536471"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartColumn, {
							size: 16,
							strokeWidth: 1.8
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						sx: {
							fontSize: "0.8rem",
							color: "#536471"
						},
						children: stats.views || 0
					})]
				})
			]
		})
	]
});
var estimateCardHeight = (ctx, moment, width) => {
	const textWidth = width - 72;
	const caption = wrapLines(ctx, String(moment?.caption || ""), textWidth);
	const attachmentCount = (moment?.metadata?.attachments || []).filter((att) => att.type === "image" || att.type === "video").length;
	let height = 236;
	height += Math.min(8, caption.length) * 26;
	if (attachmentCount > 0) height += 270;
	if (moment?.attachedNote) height += 118;
	if (moment?.attachedEvent) height += 132;
	return height;
};
var renderMomentCard = async (ctx, moment, x, y, width, isReplyParent = false) => {
	const creator = moment?.creator || {};
	const identityName = resolveIdentity(creator, moment?.userId || moment?.creatorId);
	const avatarLabel = String(identityName.displayName || identityName.handle || "User").slice(0, 1);
	const cardHeight = estimateCardHeight(ctx, moment, width);
	const radius = 24;
	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.28)";
	ctx.shadowBlur = 20;
	ctx.shadowOffsetY = 10;
	ctx.fillStyle = EXPORT_CARD;
	drawRoundedRect(ctx, x, y, width, cardHeight, radius);
	ctx.fill();
	ctx.restore();
	const innerX = x + 20;
	let cursorY = y + 18;
	if (isReplyParent) {
		ctx.fillStyle = "#6366F1";
		ctx.font = "700 12px sans-serif";
		ctx.fillText("In reply to", innerX, cursorY + 12);
		cursorY += 18;
	}
	const avatarSource = await resolveExportAvatarSource(creator);
	await drawAvatar(ctx, innerX, cursorY, 38, avatarSource, avatarLabel);
	ctx.fillStyle = "#FFFFFF";
	ctx.font = "800 17px sans-serif";
	ctx.fillText(clampText(identityName.displayName || "Unknown", 24), innerX + 50, cursorY + 16);
	ctx.fillStyle = "rgba(255,255,255,0.45)";
	ctx.font = "700 11px monospace";
	ctx.fillText(clampText(identityName.handle || "", 28), innerX + 50, cursorY + 32);
	ctx.fillText(getMomentTimeLabel(moment), x + width - 20 - ctx.measureText(getMomentTimeLabel(moment)).width, cursorY + 32);
	cursorY += 54;
	const captionLines = wrapLines(ctx, String(moment?.caption || ""), width - 40);
	ctx.fillStyle = "rgba(255,255,255,0.96)";
	ctx.font = "500 15px sans-serif";
	captionLines.slice(0, 10).forEach((line, index) => {
		ctx.fillText(line, innerX, cursorY + index * 38);
	});
	cursorY += Math.min(10, captionLines.length) * 22 + 14;
	const attachments = (moment?.metadata?.attachments || []).filter((att) => att.type === "image" || att.type === "video");
	if (attachments.length) {
		const first = attachments[0];
		const media = await loadImage(first.type === "image" ? SocialService.getMediaPreview(first.id, 1200, 800) : SocialService.getMediaPreview(first.id, 1200, 800));
		const mediaHeight = 280;
		ctx.save();
		drawRoundedRect(ctx, innerX, cursorY, width - 40, mediaHeight, 18);
		ctx.clip();
		ctx.fillStyle = "rgba(255,255,255,0.03)";
		ctx.fillRect(innerX, cursorY, width - 40, mediaHeight);
		if (media) {
			const scale = Math.max((width - 40) / media.width, mediaHeight / media.height);
			const drawWidth = media.width * scale;
			const drawHeight = media.height * scale;
			ctx.drawImage(media, innerX + (width - 40 - drawWidth) / 2, cursorY + (mediaHeight - drawHeight) / 2, drawWidth, drawHeight);
		}
		ctx.restore();
		cursorY += mediaHeight + 14;
	}
	if (moment?.attachedNote) {
		ctx.fillStyle = "rgba(99,102,241,0.12)";
		drawRoundedRect(ctx, innerX, cursorY, width - 40, 92, 16);
		ctx.fill();
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "800 13px sans-serif";
		ctx.fillText("Attached Note", innerX + 14, cursorY + 24);
		ctx.fillStyle = "rgba(255,255,255,0.78)";
		ctx.font = "500 12px sans-serif";
		wrapLines(ctx, clampText(moment.attachedNote.content || "", 150), width - 68).slice(0, 3).forEach((line, idx) => {
			ctx.fillText(line, innerX + 14, cursorY + 48 + idx * 18);
		});
		cursorY += 108;
	}
	if (moment?.attachedEvent) {
		ctx.fillStyle = "rgba(168,85,247,0.12)";
		drawRoundedRect(ctx, innerX, cursorY, width - 40, 108, 16);
		ctx.fill();
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "800 13px sans-serif";
		ctx.fillText("Attached Event", innerX + 14, cursorY + 24);
		ctx.fillStyle = "rgba(255,255,255,0.78)";
		ctx.font = "500 12px sans-serif";
		ctx.fillText(clampText(moment.attachedEvent.title || "Untitled Event", 42), innerX + 14, cursorY + 52);
		ctx.fillText(clampText(moment.attachedEvent.location || "No location", 42), innerX + 14, cursorY + 74);
		cursorY += 126;
	}
	const metricsY = y + cardHeight - 48;
	drawMetricBlock(ctx, innerX, metricsY, moment?.stats?.replies || 0, "replies", "#6366F1");
	drawMetricBlock(ctx, innerX + 124, metricsY, moment?.stats?.pulses || 0, "pulses", "#10B981");
	drawMetricBlock(ctx, innerX + 236, metricsY, moment?.stats?.likes || 0, "likes", "#F59E0B");
	ctx.strokeStyle = "rgba(255,255,255,0.04)";
	ctx.beginPath();
	ctx.moveTo(innerX, y + cardHeight - 34);
	ctx.lineTo(x + width - 20, y + cardHeight - 34);
	ctx.stroke();
	const actionsY = y + cardHeight - 26;
	const iconSize = 18;
	[
		{
			x: innerX + 4,
			draw: (ix, iy) => drawCommentIcon(ctx, ix, iy, iconSize, "rgba(255,255,255,0.55)")
		},
		{
			x: innerX + 82,
			draw: (ix, iy) => drawRepeatIcon(ctx, ix, iy, iconSize, "rgba(255,255,255,0.55)")
		},
		{
			x: innerX + 160,
			draw: (ix, iy) => drawHeartIcon(ctx, ix, iy, iconSize, "rgba(255,255,255,0.55)", false)
		},
		{
			x: innerX + 238,
			draw: (ix, iy) => drawLinkIcon(ctx, ix, iy, iconSize, "rgba(255,255,255,0.55)")
		},
		{
			x: innerX + 316,
			draw: (ix, iy) => drawSendIcon(ctx, ix, iy, iconSize, "rgba(255,255,255,0.55)")
		}
	].forEach((slot) => slot.draw(slot.x, actionsY));
	return cardHeight;
};
var exportMomentAsImage = async (rootMoment) => {
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas unavailable");
	const parentMoment = rootMoment?.sourceMoment && rootMoment?.metadata?.sourceId ? rootMoment.sourceMoment : null;
	const exportWidth = Math.min(EXPORT_MAX_WIDTH, Math.max(EXPORT_MIN_WIDTH, Math.floor((window.innerWidth || EXPORT_MAX_WIDTH) - EXPORT_PAD * 2)));
	const margin = 14;
	const bodyWidth = exportWidth - EXPORT_PAD * 2;
	const bodyX = EXPORT_PAD;
	canvas.width = exportWidth;
	ctx.font = "500 18px sans-serif";
	const headerHeight = 8;
	const parentHeight = parentMoment ? estimateCardHeight(ctx, parentMoment, bodyWidth) + 20 : 0;
	const mainHeight = estimateCardHeight(ctx, rootMoment, bodyWidth);
	const totalHeight = margin + headerHeight + parentHeight + mainHeight + 32 + (parentMoment ? 20 : 0);
	canvas.height = totalHeight;
	const gradient = ctx.createLinearGradient(0, 0, 0, totalHeight);
	gradient.addColorStop(0, "#0E0D0B");
	gradient.addColorStop(1, "#090807");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "rgba(255,255,255,0.03)";
	for (let i = 0; i < 36; i += 1) {
		ctx.beginPath();
		ctx.arc(i * 97 % canvas.width, 60 + i * 53 % Math.max(1, canvas.height - 120), 1.5, 0, Math.PI * 2);
		ctx.fill();
	}
	let cursorY = margin + headerHeight;
	if (parentMoment) {
		ctx.fillStyle = "rgba(255,255,255,0.82)";
		ctx.fillRect(bodyX + 8, cursorY - 8, 2, 20);
		cursorY += 2;
		const parentCardHeight = await renderMomentCard(ctx, parentMoment, bodyX, cursorY, bodyWidth, true);
		cursorY += parentCardHeight + 14;
		ctx.fillStyle = "rgba(255,255,255,0.82)";
		ctx.beginPath();
		ctx.arc(bodyX + 9, cursorY - 10, 3, 0, Math.PI * 2);
		ctx.fill();
	}
	await renderMomentCard(ctx, rootMoment, bodyX, cursorY, bodyWidth, false);
	ctx.fillStyle = "rgba(255,255,255,0.28)";
	ctx.font = "700 11px monospace";
	const footer = `@${resolveIdentity(rootMoment.creator, rootMoment.userId || rootMoment.creatorId).handle?.replace(/^@/, "") || "connect"} • ${window.location.hostname}`;
	ctx.fillText(footer, bodyX, canvas.height - 14);
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) reject(/* @__PURE__ */ new Error("Failed to encode image"));
			else resolve(blob);
		}, "image/png", 1);
	});
};
function PostViewClient() {
	const params = useParams$1();
	const momentId = Array.isArray(params.id) ? params.id[0] : params.id;
	const router = useRouter();
	const { user, login } = useAuth();
	const { profile: myProfile } = useProfile();
	const hasPreviewRef = import_react.useRef(Boolean(getCachedMomentPreview(momentId)));
	const [moment, setMoment] = (0, import_react.useState)(() => getCachedMomentPreview(momentId) || null);
	const [replies, setReplies] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(() => !getCachedMomentPreview(momentId));
	const [replying, setReplying] = (0, import_react.useState)(false);
	const [replyContent, setReplyContent] = (0, import_react.useState)("");
	const [pulseMenuAnchorEl, setPulseMenuAnchorEl] = (0, import_react.useState)(null);
	const [shareDrawerOpen, setShareDrawerOpen] = (0, import_react.useState)(false);
	const [replyDrawerOpen, setReplyDrawerOpen] = (0, import_react.useState)(false);
	const [exportingImage, setExportingImage] = (0, import_react.useState)(false);
	const [threadAncestors, setThreadAncestors] = (0, import_react.useState)([]);
	const [showAncestors, setShowAncestors] = (0, import_react.useState)(false);
	const [ancestorLoading, setAncestorLoading] = (0, import_react.useState)(false);
	const [pullDistance, setPullDistance] = (0, import_react.useState)(0);
	const [actorsDrawerOpen, setActorsDrawerOpen] = (0, import_react.useState)(false);
	const [actorsList, setActorsList] = (0, import_react.useState)([]);
	const [actorsTitle, setActorsTitle] = (0, import_react.useState)("");
	const isMobile = useMediaQuery(useTheme().breakpoints.down("md"), { noSsr: true });
	const pullStartYRef = import_react.useRef(null);
	const touchStartYRef = import_react.useRef(null);
	const pullActiveRef = import_react.useRef(false);
	const userAvatarUrl = useCachedProfilePreview(myProfile?.avatar || user?.prefs?.profilePicId || null, 64, 64);
	const fetchActorsForPulses = async (targetMomentId) => {
		try {
			const pulses = await SocialService._listPulsesFor(targetMomentId);
			return await Promise.all(pulses.map(async (p) => {
				try {
					const prof = getCachedIdentityById(p.userId) || await UsersService.getProfileById(p.userId);
					let avatar = null;
					if (prof?.avatar) try {
						avatar = String(prof.avatar).startsWith("http") ? prof.avatar : await fetchProfilePreview(prof.avatar, 64, 64);
					} catch (_e) {}
					return {
						$id: p.userId,
						username: prof?.username,
						displayName: prof?.displayName,
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
	const hydrateMoment = (0, import_react.useCallback)(async (data) => {
		seedMomentPreview(data);
		const creatorId = data.userId || data.creatorId;
		const creator = getCachedIdentityById(creatorId) || await UsersService.getProfileById(creatorId);
		let avatar = null;
		if (creator?.avatar) try {
			avatar = String(creator.avatar).startsWith("http") ? creator.avatar : await fetchProfilePreview(creator.avatar, 64, 64);
		} catch (_e) {}
		return {
			...data,
			creator: {
				...creator,
				avatar
			}
		};
	}, []);
	const fetchAncestorThread = (0, import_react.useCallback)(async (sourceMomentId) => {
		const ancestors = [];
		let currentSourceId = sourceMomentId;
		for (let depth = 0; currentSourceId && depth < 8; depth += 1) {
			const hydratedSource = await hydrateMoment(await SocialService.getMomentById(currentSourceId, user?.$id));
			ancestors.unshift(hydratedSource);
			currentSourceId = hydratedSource.metadata?.sourceId || "";
		}
		return ancestors;
	}, [hydrateMoment, user?.$id]);
	const isQuoteMoment = moment?.metadata?.type === "quote" && Boolean(moment?.sourceMoment);
	const revealAncestorThread = (0, import_react.useCallback)(async () => {
		if (!moment?.metadata?.sourceId || isQuoteMoment || ancestorLoading || showAncestors) return;
		setAncestorLoading(true);
		try {
			const ancestors = await fetchAncestorThread(moment.metadata.sourceId);
			setThreadAncestors(ancestors);
			setMoment((prev) => prev ? {
				...prev,
				sourceMoment: ancestors[ancestors.length - 1] || null
			} : prev);
			setShowAncestors(true);
			seedMomentThread(momentId, {
				moment: {
					...moment,
					sourceMoment: ancestors[ancestors.length - 1] || null
				},
				replies,
				ancestors
			});
		} catch (error) {
			console.error("Failed to reveal ancestor thread", error);
			zt.error("Failed to load thread");
		} finally {
			setAncestorLoading(false);
			setPullDistance(0);
			pullStartYRef.current = null;
			pullActiveRef.current = false;
		}
	}, [
		ancestorLoading,
		fetchAncestorThread,
		isQuoteMoment,
		moment,
		momentId,
		replies,
		showAncestors
	]);
	const onPullPointerDown = (0, import_react.useCallback)((event) => {
		if (!moment?.metadata?.sourceId || isQuoteMoment || showAncestors) return;
		pullStartYRef.current = event.clientY;
		pullActiveRef.current = true;
		event.currentTarget.setPointerCapture?.(event.pointerId);
	}, [
		isQuoteMoment,
		moment?.metadata?.sourceId,
		showAncestors
	]);
	const onPullPointerMove = (0, import_react.useCallback)((event) => {
		if (!pullActiveRef.current || pullStartYRef.current === null || !moment?.metadata?.sourceId || isQuoteMoment || showAncestors) return;
		const distance = Math.max(0, event.clientY - pullStartYRef.current);
		setPullDistance(Math.min(distance, 120));
	}, [
		isQuoteMoment,
		moment?.metadata?.sourceId,
		showAncestors
	]);
	const onPullPointerUp = (0, import_react.useCallback)(() => {
		if (!pullActiveRef.current) return;
		pullActiveRef.current = false;
		if (pullDistance >= 72) {
			revealAncestorThread();
			return;
		}
		setPullDistance(0);
		pullStartYRef.current = null;
	}, [pullDistance, revealAncestorThread]);
	const triggerScrollReveal = (0, import_react.useCallback)(() => {
		if (!moment?.metadata?.sourceId || isQuoteMoment || ancestorLoading || showAncestors) return;
		revealAncestorThread();
	}, [
		ancestorLoading,
		isQuoteMoment,
		moment?.metadata?.sourceId,
		revealAncestorThread,
		showAncestors
	]);
	const onWheelCapture = (0, import_react.useCallback)((event) => {
		if (event.deltaY > 12) triggerScrollReveal();
	}, [triggerScrollReveal]);
	const onTouchStartCapture = (0, import_react.useCallback)((event) => {
		touchStartYRef.current = event.touches[0]?.clientY ?? null;
	}, []);
	const onTouchMoveCapture = (0, import_react.useCallback)((event) => {
		if (touchStartYRef.current === null) return;
		const currentY = event.touches[0]?.clientY;
		if (currentY === void 0) return;
		if (currentY - touchStartYRef.current > 16) triggerScrollReveal();
	}, [triggerScrollReveal]);
	const onTouchEndCapture = (0, import_react.useCallback)(() => {
		touchStartYRef.current = null;
	}, []);
	const openActorsList = async (title, fetcher) => {
		setActorsTitle(title);
		setActorsDrawerOpen(true);
		setActorsList([]);
		setActorsList(await fetcher());
	};
	const loadMoment = (0, import_react.useCallback)(async () => {
		if (!momentId) return;
		if (!hasPreviewRef.current) setLoading(true);
		setThreadAncestors([]);
		setShowAncestors(false);
		setPullDistance(0);
		pullStartYRef.current = null;
		pullActiveRef.current = false;
		const cachedThread = getCachedMomentThread(momentId);
		const threadFresh = isFreshMomentThread(momentId, THREAD_CACHE_STALE_AFTER_MS);
		try {
			const enrichedMoment = cachedThread?.moment ? cachedThread.moment : await hydrateMoment(await SocialService.getMomentById(momentId, user?.$id));
			setMoment(enrichedMoment);
			seedMomentPreview(enrichedMoment);
			seedIdentityCache(enrichedMoment.creator);
			if (cachedThread?.replies?.length) setReplies(cachedThread.replies);
			if (cachedThread?.ancestors?.length) {
				setThreadAncestors(cachedThread.ancestors);
				setShowAncestors(true);
			}
			if (cachedThread?.moment && threadFresh && cachedThread?.replies) {
				setLoading(false);
				return;
			}
			const replyData = await SocialService.getReplies(momentId, user?.$id);
			const enrichedReplies = await Promise.all(replyData.map(async (reply) => {
				const enrichedReply = await hydrateMoment(reply);
				seedMomentPreview(enrichedReply);
				seedIdentityCache(enrichedReply.creator);
				return enrichedReply;
			}));
			setReplies(enrichedReplies);
			seedMomentThread(momentId, {
				moment: enrichedMoment,
				replies: enrichedReplies,
				ancestors: cachedThread?.ancestors || []
			});
		} catch (_e) {
			console.error("Failed to load moment:", _e);
			zt.error("Moment not found");
			setThreadAncestors([]);
		} finally {
			setLoading(false);
		}
	}, [
		momentId,
		user,
		hydrateMoment
	]);
	(0, import_react.useEffect)(() => {
		loadMoment();
	}, [loadMoment]);
	(0, import_react.useEffect)(() => {
		if (!momentId || !moment) return;
		if (!replies.length && !showAncestors && !threadAncestors.length) return;
		seedMomentThread(momentId, {
			moment,
			replies,
			ancestors: showAncestors ? threadAncestors : []
		});
	}, [
		momentId,
		moment,
		replies,
		showAncestors,
		threadAncestors
	]);
	const handleToggleLike = async (targetMoment) => {
		if (!user) {
			zt.error("Please login to like this post");
			return;
		}
		const target = targetMoment || moment;
		if (!target) return;
		try {
			const creatorId = target.userId || target.creatorId;
			const contentSnippet = target.caption?.substring(0, 30);
			const { liked } = await SocialService.toggleLike(user.$id, target.$id, creatorId, contentSnippet);
			if (target.$id === moment?.$id) setMoment((prev) => ({
				...prev,
				isLiked: liked,
				stats: {
					...prev.stats,
					likes: Math.max(0, (prev.stats?.likes || 0) + (liked ? 1 : -1))
				}
			}));
			else setReplies((prev) => prev.map((r) => r.$id === target.$id ? {
				...r,
				isLiked: liked,
				stats: {
					...r.stats,
					likes: Math.max(0, (r.stats?.likes || 0) + (liked ? 1 : -1))
				}
			} : r));
		} catch (_e) {
			zt.error("Failed to update like");
		}
	};
	const handlePulse = async () => {
		if (!user) {
			zt.error("Please login to pulse this post");
			return;
		}
		if (!moment) return;
		try {
			await SocialService.createMoment(user.$id, "", "pulse", [], "public", void 0, void 0, moment.$id);
			zt.success("Pulsed to your feed");
			setMoment((prev) => {
				if (!prev) return prev;
				const next = {
					...prev,
					isPulsed: true,
					stats: {
						...prev.stats,
						pulses: (prev.stats?.pulses || 0) + 1
					}
				};
				seedMomentThread(momentId, {
					moment: next,
					replies,
					ancestors: showAncestors ? threadAncestors : []
				});
				return next;
			});
			setPulseMenuAnchorEl(null);
		} catch (_e) {
			zt.error("Failed to pulse");
		}
	};
	const handleQuote = () => {
		if (!user || !moment) return;
		setPulseMenuAnchorEl(null);
		const replyBox = document.getElementById("reply-box");
		if (replyBox) {
			replyBox.scrollIntoView({ behavior: "smooth" });
			setReplyContent(`Quoting ${resolveIdentity(moment.creator, creatorId).handle}: `);
		}
	};
	const handleReply = async () => {
		if (!user || !moment || !replyContent.trim()) return;
		setReplying(true);
		try {
			const enrichedReply = await hydrateMoment(await SocialService.createMoment(user.$id, replyContent, "reply", [], "public", void 0, void 0, moment.$id));
			seedMomentPreview(enrichedReply);
			seedIdentityCache(enrichedReply.creator);
			const nextReplies = [enrichedReply, ...replies];
			setMoment((prev) => {
				if (!prev) return prev;
				const next = {
					...prev,
					stats: {
						...prev.stats,
						replies: (prev.stats?.replies || 0) + 1
					}
				};
				seedMomentThread(momentId, {
					moment: next,
					replies: nextReplies,
					ancestors: showAncestors ? threadAncestors : []
				});
				return next;
			});
			setReplies(nextReplies);
			setReplyContent("");
			zt.success("Reply posted!");
			setReplyDrawerOpen(false);
		} catch (e) {
			console.error("Failed to post reply:", e);
			zt.error("Failed to post reply");
		} finally {
			setReplying(false);
		}
	};
	const handleCopyLink = () => {
		navigator.clipboard.writeText(window.location.href);
		zt.success("Link copied to clipboard");
	};
	const handleExportScreenshot = async () => {
		if (!moment) return;
		setExportingImage(true);
		try {
			const blob = await exportMomentAsImage(moment);
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = `kylrix-connect-${moment.$id}.png`;
			anchor.click();
			window.setTimeout(() => URL.revokeObjectURL(url), 2e3);
			zt.success("Screenshot saved");
			setShareDrawerOpen(false);
		} catch (error) {
			console.error("Failed to export screenshot:", error);
			zt.error("Failed to export screenshot");
		} finally {
			setExportingImage(false);
		}
	};
	if (loading && !moment) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
		sx: {
			maxWidth: "sm",
			mx: "auto",
			py: 4,
			px: 2
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Stack, {
			spacing: 2,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						alignItems: "center",
						gap: 1.5
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
						variant: "rounded",
						width: 40,
						height: 40,
						sx: {
							borderRadius: "12px",
							bgcolor: "rgba(255,255,255,0.05)"
						}
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
						sx: { flex: 1 },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
							width: "30%",
							sx: { bgcolor: "rgba(255,255,255,0.05)" }
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
							width: "20%",
							sx: { bgcolor: "rgba(255,255,255,0.05)" }
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
					variant: "rounded",
					height: 240,
					sx: {
						borderRadius: "24px",
						bgcolor: "rgba(255,255,255,0.05)"
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
					variant: "rounded",
					height: 120,
					sx: {
						borderRadius: "24px",
						bgcolor: "rgba(255,255,255,0.05)"
					}
				})
			]
		})
	}) });
	if (!moment) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
		sx: {
			textAlign: "center",
			py: 10
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
			variant: "h5",
			color: "text.secondary",
			children: "Moment not found"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			sx: { mt: 2 },
			onClick: () => router.back(),
			children: "Go Back"
		})]
	}) });
	const isOwnPost = user?.$id === (moment.userId || moment.creatorId);
	const creatorId = moment.userId || moment.creatorId;
	const cachedCreator = getCachedIdentityById(creatorId);
	const resolvedCreator = resolveIdentity(moment.creator || cachedCreator, creatorId);
	const creatorName = isOwnPost ? user?.name || "You" : resolvedCreator.displayName;
	const creatorAvatar = isOwnPost ? userAvatarUrl : moment.creator?.avatar || cachedCreator?.avatar;
	const quotedIdentity = isQuoteMoment ? resolveIdentity(moment.sourceMoment.creator, moment.sourceMoment.userId || moment.sourceMoment.creatorId) : null;
	const currentThreadLineMode = showAncestors || Boolean(moment.metadata?.sourceId) && !isQuoteMoment ? "up" : "none";
	const handleBackToFeed = () => {
		router.push("/");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
		onWheelCapture,
		onTouchStartCapture,
		onTouchMoveCapture,
		onTouchEndCapture,
		onTouchCancelCapture: onTouchEndCapture,
		sx: {
			width: "100%",
			maxWidth: 600,
			mx: "auto",
			pt: {
				xs: 1.5,
				sm: 2.5
			},
			pb: {
				xs: 3,
				sm: 4
			},
			px: 0,
			borderLeft: "1px solid rgba(255,255,255,0.08)",
			borderRight: "1px solid rgba(255,255,255,0.08)"
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				sx: {
					px: 2,
					mb: 1.5
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: handleBackToFeed,
					startIcon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { size: 18 }),
					sx: {
						px: 1.5,
						py: 1,
						borderRadius: "14px",
						textTransform: "none",
						fontWeight: 800,
						color: "text.primary",
						bgcolor: "rgba(255,255,255,0.03)",
						border: "1px solid rgba(255,255,255,0.05)",
						"&:hover": { bgcolor: "rgba(255,255,255,0.05)" }
					},
					children: "Back to feed"
				})
			}),
			!user && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, {
				severity: "info",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogIn, { size: 20 }),
				action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					color: "inherit",
					size: "small",
					onClick: login,
					sx: { fontWeight: 800 },
					children: "LOGIN"
				}),
				sx: {
					mb: 2,
					borderRadius: "16px",
					bgcolor: "rgba(99, 102, 241, 0.1)",
					color: "#6366F1",
					border: "1px solid rgba(99, 102, 241, 0.2)",
					"& .MuiAlert-icon": { color: "#6366F1" }
				},
				children: "You are viewing this post as a guest. Login to like or reply."
			}),
			moment.metadata?.sourceId && !isQuoteMoment && !showAncestors && ancestorLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				onPointerDown: onPullPointerDown,
				onPointerMove: onPullPointerMove,
				onPointerUp: onPullPointerUp,
				onPointerCancel: onPullPointerUp,
				sx: {
					borderRadius: 0,
					border: "none",
					bgcolor: "transparent",
					minHeight: `${72 + pullDistance}px`,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexDirection: "column",
					gap: 0,
					userSelect: "none",
					touchAction: "none",
					overflow: "hidden",
					transition: pullActiveRef.current ? "none" : "min-height 180ms ease, background-color 180ms ease"
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Stack, {
					spacing: 1.25,
					sx: {
						width: "100%",
						px: 2,
						py: 1.5
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
						sx: {
							display: "flex",
							alignItems: "center",
							gap: 1.25
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
							sx: { flex: 1 },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
								variant: "rounded",
								width: 96,
								height: 12,
								sx: {
									bgcolor: "rgba(255,255,255,0.08)",
									mb: .75
								}
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
								variant: "rounded",
								width: "70%",
								height: 10,
								sx: { bgcolor: "rgba(255,255,255,0.06)" }
							})]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
						sx: {
							display: "flex",
							alignItems: "center",
							gap: 1.25
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
							sx: {
								flex: 1,
								display: "flex",
								flexDirection: "column",
								gap: .75
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
									variant: "rounded",
									width: "42%",
									height: 12,
									sx: { bgcolor: "rgba(255,255,255,0.08)" }
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
									variant: "rounded",
									width: "88%",
									height: 12,
									sx: { bgcolor: "rgba(255,255,255,0.06)" }
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
									variant: "rounded",
									width: "76%",
									height: 12,
									sx: { bgcolor: "rgba(255,255,255,0.06)" }
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Stack, {
									direction: "row",
									spacing: 1.2,
									sx: { pt: .5 },
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
											variant: "rounded",
											width: 42,
											height: 18,
											sx: { bgcolor: "rgba(255,255,255,0.06)" }
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
											variant: "rounded",
											width: 42,
											height: 18,
											sx: { bgcolor: "rgba(255,255,255,0.06)" }
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
											variant: "rounded",
											width: 42,
											height: 18,
											sx: { bgcolor: "rgba(255,255,255,0.06)" }
										})
									]
								})
							]
						})
					})]
				})
			}),
			!isQuoteMoment && showAncestors && threadAncestors.length > 0 || moment ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
				sx: {
					bgcolor: "#000000",
					border: "1px solid rgba(255,255,255,0.05)",
					boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.06), 0 0 28px rgba(245, 158, 11, 0.1)",
					borderRadius: "20px",
					overflow: "hidden",
					maxHeight: {
						xs: "58dvh",
						md: "60dvh"
					},
					overflowY: "auto",
					overscrollBehavior: "contain",
					WebkitOverflowScrolling: "touch"
				},
				children: [showAncestors && threadAncestors.length > 0 && threadAncestors.map((ancestor, index) => {
					const ancestorId = ancestor.userId || ancestor.creatorId;
					const resolvedAncestor = resolveIdentity(ancestor.creator, ancestorId);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThreadPostView, {
						name: resolvedAncestor.displayName,
						handle: resolvedAncestor.handle,
						timeLabel: formatPostTimestamp(ancestor.$createdAt, ancestor.$updatedAt),
						caption: ancestor.caption,
						attachments: ancestor.metadata?.attachments,
						avatarSrc: ancestor.creator?.avatar,
						avatarLabel: resolvedAncestor.displayName?.charAt(0).toUpperCase(),
						stats: {
							replies: ancestor.stats?.replies || 0,
							pulses: ancestor.stats?.pulses || 0,
							likes: ancestor.stats?.likes || 0,
							views: ancestor.stats?.views || 0
						},
						threadLineMode: index === 0 ? "down" : "both",
						variant: "thread",
						onClick: () => router.push(`/post/${ancestor.$id}`),
						onLike: (e) => {
							e.stopPropagation();
							handleToggleLike(ancestor);
						},
						onPulse: (e) => {
							e.stopPropagation();
							openActorsList("Pulsed by", async () => await fetchActorsForPulses(ancestor.$id));
						},
						liked: ancestor.isLiked
					}, ancestor.$id);
				}), isQuoteMoment && quotedIdentity ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuoteMomentView, {
					name: creatorName,
					handle: resolvedCreator.handle,
					timeLabel: formatPostTimestamp(moment.$createdAt, moment.$updatedAt),
					caption: moment.caption,
					attachments: moment.metadata?.attachments,
					avatarSrc: creatorAvatar,
					avatarLabel: creatorName.replace(/^@/, "").charAt(0).toUpperCase(),
					quotedAvatarSrc: moment.sourceMoment.creator?.avatar,
					quotedCaption: moment.sourceMoment.caption,
					quotedName: quotedIdentity.displayName,
					quotedHandle: quotedIdentity.handle,
					stats: {
						replies: moment.stats?.replies || 0,
						pulses: moment.stats?.pulses || 0,
						likes: moment.stats?.likes || 0,
						views: moment.stats?.views || 0
					},
					onLike: (e) => {
						e.stopPropagation();
						handleToggleLike();
					},
					onPulse: (e) => {
						e.stopPropagation();
						setPulseMenuAnchorEl(e.currentTarget);
					},
					liked: moment.isLiked
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThreadPostView, {
					name: creatorName,
					handle: resolvedCreator.handle,
					timeLabel: formatPostTimestamp(moment.$createdAt, moment.$updatedAt),
					caption: moment.caption,
					attachments: moment.metadata?.attachments,
					avatarSrc: creatorAvatar,
					avatarLabel: creatorName.replace(/^@/, "").charAt(0).toUpperCase(),
					replyingTo: moment.metadata?.sourceId && moment.sourceMoment ? `@${resolveIdentity(moment.sourceMoment.creator, moment.sourceMoment.userId || moment.sourceMoment.creatorId).handle?.replace(/^@/, "") || ""}` : null,
					stats: {
						replies: moment.stats?.replies || 0,
						pulses: moment.stats?.pulses || 0,
						likes: moment.stats?.likes || 0,
						views: moment.stats?.views || 0
					},
					threadLineMode: currentThreadLineMode,
					variant: "thread",
					onLike: (e) => {
						e.stopPropagation();
						handleToggleLike();
					},
					onPulse: (e) => {
						e.stopPropagation();
						setPulseMenuAnchorEl(e.currentTarget);
					},
					liked: moment.isLiked
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
				id: "comments-section",
				sx: {
					pt: 2,
					maxHeight: {
						xs: "36dvh",
						md: "30dvh"
					},
					overflowY: "auto",
					overscrollBehavior: "contain",
					WebkitOverflowScrolling: "touch",
					pr: .5
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						px: 2,
						mb: 1
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						sx: {
							fontWeight: 900,
							fontSize: "0.9rem",
							letterSpacing: "0.04em",
							textTransform: "uppercase",
							color: "text.secondary"
						},
						children: "Comments"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Stack, {
						direction: "row",
						spacing: .5,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
							size: "small",
							sx: { color: "text.secondary" },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownWideNarrow, { size: 17 })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
							size: "small",
							sx: { color: "text.secondary" },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, { size: 17 })
						})]
					})]
				}), replies.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						py: 4,
						px: 2,
						textAlign: "center"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
							sx: {
								width: 52,
								height: 52,
								borderRadius: "18px",
								display: "grid",
								placeItems: "center",
								mx: "auto",
								mb: 1.5,
								bgcolor: "rgba(255,255,255,0.04)",
								color: "rgba(255,255,255,0.8)",
								border: "1px solid rgba(255,255,255,0.06)"
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { size: 22 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							sx: {
								fontWeight: 800,
								color: "text.primary"
							},
							children: "No comments yet"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							sx: {
								color: "text.secondary",
								fontSize: "0.92rem",
								mt: .5
							},
							children: "Be the first to comment."
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
					sx: { mt: .5 },
					children: replies.map((reply, index) => {
						const rCreatorId = reply.userId || reply.creatorId;
						const rResolvedCreator = resolveIdentity(reply.creator, rCreatorId);
						const rCreatorName = rResolvedCreator.displayName;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThreadPostView, {
							name: rCreatorName,
							handle: rResolvedCreator.handle,
							timeLabel: formatPostTimestamp(reply.$createdAt, reply.$updatedAt),
							caption: reply.caption,
							avatarSrc: reply.creator?.avatar,
							avatarLabel: rCreatorName.replace(/^@/, "").charAt(0).toUpperCase(),
							replyingTo: reply.metadata?.sourceId ? `@${creatorName.replace(/^@/, "")}` : null,
							stats: {
								replies: reply.stats?.replies || 0,
								pulses: reply.stats?.pulses || 0,
								likes: reply.stats?.likes || 0,
								views: reply.stats?.views || 0
							},
							threadLineMode: index < replies.length - 1 ? "both" : "up",
							variant: "thread",
							onClick: () => router.push(`/post/${reply.$id}`),
							onLike: (e) => {
								e.stopPropagation();
								handleToggleLike(reply);
							},
							onPulse: (e) => {
								e.stopPropagation();
								setPulseMenuAnchorEl(e.currentTarget);
							},
							liked: reply.isLiked
						}, reply.$id);
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Menu, {
				anchorEl: pulseMenuAnchorEl,
				open: Boolean(pulseMenuAnchorEl),
				onClose: () => setPulseMenuAnchorEl(null),
				PaperProps: { sx: {
					mt: 1,
					borderRadius: "16px",
					bgcolor: "#1F1D1B",
					border: "1px solid rgba(255, 255, 255, 0.08)",
					minWidth: 180
				} },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MenuItem, {
					onClick: handlePulse,
					sx: {
						gap: 1.5,
						py: 1.2,
						fontWeight: 700,
						fontSize: "0.75rem",
						textTransform: "uppercase",
						letterSpacing: "0.05em",
						color: "#10B981"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Repeat2, {
						size: 18,
						strokeWidth: 2
					}), " Pulse Now"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MenuItem, {
					onClick: handleQuote,
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
			user && !isMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				id: "reply-box",
				sx: {
					mt: 2,
					p: 1.5,
					bgcolor: "#161514",
					borderRadius: "18px",
					border: "1px solid rgba(255,255,255,0.07)",
					boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.06), 0 0 24px rgba(245, 158, 11, 0.08)"
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Stack, {
					direction: "row",
					spacing: 2,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
						src: userAvatarUrl || void 0,
						sx: {
							width: 30,
							height: 30,
							borderRadius: "8px"
						},
						children: user.name?.charAt(0)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
						fullWidth: true,
						placeholder: "Post your reply",
						variant: "standard",
						multiline: true,
						maxRows: 10,
						value: replyContent,
						onChange: (e) => setReplyContent(e.target.value),
						InputProps: {
							disableUnderline: true,
							sx: {
								color: "white",
								py: .5,
								fontSize: "0.92rem"
							},
							endAdornment: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputAdornment, {
								position: "end",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
									onClick: handleReply,
									disabled: !replyContent.trim() || replying,
									sx: {
										p: .8,
										bgcolor: "#F59E0B",
										color: "black",
										"&:hover": { bgcolor: alpha("#F59E0B", .8) },
										"&.Mui-disabled": {
											bgcolor: "rgba(245, 158, 11, 0.2)",
											color: "rgba(0,0,0,0.3)"
										}
									},
									children: replying ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircularProgress, {
										size: 16,
										color: "inherit"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { size: 16 })
								})
							})
						}
					})]
				})
			}),
			user && isMobile && !replyDrawerOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fab, {
				color: "primary",
				"aria-label": "comment",
				onClick: () => setReplyDrawerOpen(true),
				sx: {
					position: "fixed",
					right: 20,
					bottom: "calc(20px + env(safe-area-inset-bottom))",
					zIndex: 1400,
					bgcolor: "#F59E0B",
					color: "#161514",
					"&:hover": { bgcolor: alpha("#F59E0B", .9) }
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { size: 20 })
			}),
			user && isMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer, {
				anchor: "bottom",
				open: replyDrawerOpen,
				onClose: () => setReplyDrawerOpen(false),
				PaperProps: { sx: {
					bgcolor: "rgba(22, 20, 18, 0.98)",
					borderTopLeftRadius: "24px",
					borderTopRightRadius: "24px",
					border: "1px solid rgba(255,255,255,0.05)",
					backgroundImage: "none",
					maxWidth: 720,
					mx: "auto",
					width: "100%",
					boxShadow: "0 -20px 50px rgba(0,0,0,0.55)",
					pb: "env(safe-area-inset-bottom)"
				} },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						px: 2,
						pt: 1.5,
						pb: 2
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, { sx: {
							width: 42,
							height: 4,
							borderRadius: 999,
							bgcolor: "rgba(255,255,255,0.12)",
							mx: "auto",
							mb: 2
						} }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							variant: "subtitle1",
							sx: {
								fontWeight: 900,
								fontFamily: "var(--font-clash)",
								mb: .5
							},
							children: "Comment"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							variant: "body2",
							sx: {
								color: "text.secondary",
								mb: 2
							},
							children: "Add your reply below."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Stack, {
							direction: "row",
							spacing: 2,
							sx: {
								bgcolor: "#161514",
								border: "1px solid rgba(255,255,255,0.07)",
								borderRadius: "20px",
								p: 1.5,
								boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.06), 0 0 24px rgba(245, 158, 11, 0.08)"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
								src: userAvatarUrl || void 0,
								sx: {
									width: 30,
									height: 30,
									borderRadius: "8px"
								},
								children: user.name?.charAt(0)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
								fullWidth: true,
								placeholder: "Write a comment",
								variant: "standard",
								multiline: true,
								maxRows: 10,
								value: replyContent,
								onChange: (e) => setReplyContent(e.target.value),
								InputProps: {
									disableUnderline: true,
									sx: {
										color: "white",
										py: .5,
										fontSize: "0.92rem"
									},
									endAdornment: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputAdornment, {
										position: "end",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
											onClick: handleReply,
											disabled: !replyContent.trim() || replying,
											sx: {
												p: .8,
												bgcolor: "#F59E0B",
												color: "black",
												"&:hover": { bgcolor: alpha("#F59E0B", .8) },
												"&.Mui-disabled": {
													bgcolor: "rgba(245, 158, 11, 0.2)",
													color: "rgba(0,0,0,0.3)"
												}
											},
											children: replying ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircularProgress, {
												size: 16,
												color: "inherit"
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { size: 16 })
										})
									})
								}
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer, {
				anchor: "bottom",
				open: shareDrawerOpen,
				onClose: () => setShareDrawerOpen(false),
				PaperProps: { sx: {
					bgcolor: "#000000",
					borderTopLeftRadius: "28px",
					borderTopRightRadius: "28px",
					border: "1px solid rgba(255,255,255,0.07)",
					backgroundImage: "none",
					maxWidth: 720,
					mx: "auto",
					width: "100%",
					pb: "env(safe-area-inset-bottom)"
				} },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Box, {
					sx: {
						px: 2,
						pt: 1.5,
						pb: 2
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, { sx: {
							width: 44,
							height: 4,
							borderRadius: 999,
							bgcolor: "rgba(255,255,255,0.14)",
							mx: "auto",
							mb: 2
						} }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							variant: "subtitle1",
							sx: {
								fontWeight: 900,
								fontFamily: "var(--font-clash)",
								mb: .5
							},
							children: "Share post"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
							variant: "body2",
							sx: {
								color: "text.secondary",
								mb: 2
							},
							children: "Export this post as a branded PNG image."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ListItemButton, {
							onClick: handleExportScreenshot,
							disabled: exportingImage,
							sx: {
								mb: 1,
								borderRadius: "16px",
								bgcolor: "#000000",
								border: "1px solid rgba(245, 158, 11, 0.14)",
								boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.06), 0 0 24px rgba(245, 158, 11, 0.08)"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListItemIcon, {
									sx: {
										color: "#F59E0B",
										minWidth: 40
									},
									children: exportingImage ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircularProgress, {
										size: 18,
										color: "inherit"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image$1, { size: 18 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListItemText, {
									primary: "Screenshot",
									secondary: "Download an image of this post thread",
									primaryTypographyProps: { fontWeight: 800 },
									secondaryTypographyProps: { color: "text.secondary" }
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { size: 18 })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ListItemButton, {
							onClick: () => {
								handleCopyLink();
								setShareDrawerOpen(false);
							},
							sx: {
								borderRadius: "16px",
								bgcolor: "#000000",
								border: "1px solid rgba(255,255,255,0.07)",
								boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.04), 0 0 20px rgba(245, 158, 11, 0.06)"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListItemIcon, {
								sx: {
									color: "#6366F1",
									minWidth: 40
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link2, { size: 18 })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListItemText, {
								primary: "Copy link",
								secondary: "Share the direct URL instead",
								primaryTypographyProps: { fontWeight: 800 },
								secondaryTypographyProps: { color: "text.secondary" }
							})]
						})
					]
				})
			}),
			user && !isMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, { sx: { mt: .5 } }),
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
	}) });
}
function PostView() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PostViewClient, {});
}
var SplitComponent = PostView;
//#endregion
export { SplitComponent as component };
