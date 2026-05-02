globalThis.__nitro_main__ = import.meta.url;
import { a as toEventHandler, c as serve, i as defineLazyEventHandler, n as HTTPError, r as defineHandler, s as NodeResponse, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import "./_libs/hookable.mjs";
import { t as getContext } from "./_libs/unctx.mjs";
import { i as withoutTrailingSlash, n as joinURL, r as withLeadingSlash, t as decodePath } from "./_libs/ufo.mjs";
import "node:async_hooks";
import { promises } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
//#region #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs")) };
globalThis.__nitro_vite_envs__ = services;
getContext("nitro-app", {
	asyncContext: void 0,
	AsyncLocalStorage: void 0
});
//#endregion
//#region node_modules/.pnpm/nitro-nightly@3.0.1-20260417-125953-8c3f16b2_chokidar@4.0.3_dotenv@17.4.2_lru-cache@11._f702b2f75fa96247e2ff48d87c632d9d/node_modules/nitro-nightly/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new NodeResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region node_modules/.pnpm/nitro-nightly@3.0.1-20260417-125953-8c3f16b2_chokidar@4.0.3_dotenv@17.4.2_lru-cache@11._f702b2f75fa96247e2ff48d87c632d9d/node_modules/nitro-nightly/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/assets/ActorsListDrawer-Sei3x6I4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"510c-k04Ec4yGi53rbPrtz2aahWuLQ/0\"",
		"mtime": "2026-05-02T16:03:29.469Z",
		"size": 20748,
		"path": "../public/assets/ActorsListDrawer-Sei3x6I4.js"
	},
	"/assets/ActorsListDrawer-Sei3x6I4.js.map": {
		"type": "application/json",
		"etag": "\"13be6-F7w8tjze/LlkLiUcUyIwE96/XdQ\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 80870,
		"path": "../public/assets/ActorsListDrawer-Sei3x6I4.js.map"
	},
	"/assets/Alert-8lj-dOYu.js.map": {
		"type": "application/json",
		"etag": "\"57a7-Lu0qwgM7T/K6U5e+geN82pCW/o4\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 22439,
		"path": "../public/assets/Alert-8lj-dOYu.js.map"
	},
	"/assets/Alert-8lj-dOYu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"143b-r01rf74z/+8kxzKlDdq/tFMfagc\"",
		"mtime": "2026-05-02T16:03:29.470Z",
		"size": 5179,
		"path": "../public/assets/Alert-8lj-dOYu.js"
	},
	"/assets/Container-CpRSdyuI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7de-0s/etjeCG7L+/QOjW3Ag755Fnc0\"",
		"mtime": "2026-05-02T16:03:29.471Z",
		"size": 2014,
		"path": "../public/assets/Container-CpRSdyuI.js"
	},
	"/assets/Container-CpRSdyuI.js.map": {
		"type": "application/json",
		"etag": "\"29e3-Z3Q58zL8JHSWfrUzVBvHo0qBwCs\"",
		"mtime": "2026-05-02T16:03:29.476Z",
		"size": 10723,
		"path": "../public/assets/Container-CpRSdyuI.js.map"
	},
	"/assets/DynamicIsland-CW6WUaQb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"346a9-pK8KGy5FH7hNNVwT59tSHFeV0I8\"",
		"mtime": "2026-05-02T16:03:29.471Z",
		"size": 214697,
		"path": "../public/assets/DynamicIsland-CW6WUaQb.js"
	},
	"/assets/Fab-C3zuU6fW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bd4-ZRObZ034w4tczRTIbHmHPrl1BJs\"",
		"mtime": "2026-05-02T16:03:29.471Z",
		"size": 3028,
		"path": "../public/assets/Fab-C3zuU6fW.js"
	},
	"/assets/Fab-C3zuU6fW.js.map": {
		"type": "application/json",
		"etag": "\"2f89-CPt7kSCCTv068kMZw1nlTmtT4Wg\"",
		"mtime": "2026-05-02T16:03:29.477Z",
		"size": 12169,
		"path": "../public/assets/Fab-C3zuU6fW.js.map"
	},
	"/assets/FormattedText-Cz1QbH0z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61af-vfdj/TcoptK16AW6Q+v5/GnfUww\"",
		"mtime": "2026-05-02T16:03:29.471Z",
		"size": 25007,
		"path": "../public/assets/FormattedText-Cz1QbH0z.js"
	},
	"/assets/FormattedText-Cz1QbH0z.js.map": {
		"type": "application/json",
		"etag": "\"250f6-2mwCC1tKAhqcqiaZjjrzvlcPMyc\"",
		"mtime": "2026-05-02T16:03:29.477Z",
		"size": 151798,
		"path": "../public/assets/FormattedText-Cz1QbH0z.js.map"
	},
	"/assets/MenuItem-CmV-SnFq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cef-HURIZv1bB2g2fqhPbovv6i9esHw\"",
		"mtime": "2026-05-02T16:03:29.471Z",
		"size": 3311,
		"path": "../public/assets/MenuItem-CmV-SnFq.js"
	},
	"/assets/MenuItem-CmV-SnFq.js.map": {
		"type": "application/json",
		"etag": "\"348c-5c1w/nGD4FpyklB+JVngARE99fw\"",
		"mtime": "2026-05-02T16:03:29.477Z",
		"size": 13452,
		"path": "../public/assets/MenuItem-CmV-SnFq.js.map"
	},
	"/assets/PresenceProvider-B3WCMr-8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"835-ggN28sILEoaRRhpP0eGCIhVlKCw\"",
		"mtime": "2026-05-02T16:03:29.471Z",
		"size": 2101,
		"path": "../public/assets/PresenceProvider-B3WCMr-8.js"
	},
	"/assets/PresenceProvider-B3WCMr-8.js.map": {
		"type": "application/json",
		"etag": "\"2282-RKgOT6EHvo2qUZNlT86eMY272aA\"",
		"mtime": "2026-05-02T16:03:29.477Z",
		"size": 8834,
		"path": "../public/assets/PresenceProvider-B3WCMr-8.js.map"
	},
	"/assets/RouteErrorBoundary-JU2pY08y.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"349-c0F6LAIOmQbYrN3694qs1veiFyU\"",
		"mtime": "2026-05-02T16:03:29.471Z",
		"size": 841,
		"path": "../public/assets/RouteErrorBoundary-JU2pY08y.js"
	},
	"/assets/RouteErrorBoundary-JU2pY08y.js.map": {
		"type": "application/json",
		"etag": "\"7a6-9v6SfglFqMB5HfDsGgU4xtaTot4\"",
		"mtime": "2026-05-02T16:03:29.477Z",
		"size": 1958,
		"path": "../public/assets/RouteErrorBoundary-JU2pY08y.js.map"
	},
	"/assets/Stack-B4LeoELJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1cb22-VBbYQvMspne0Gp5zMQ5kBiP8UwI\"",
		"mtime": "2026-05-02T16:03:29.471Z",
		"size": 117538,
		"path": "../public/assets/Stack-B4LeoELJ.js"
	},
	"/assets/SwitchBase-CkVtnY-1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99e-/W8GL/EsdgdrfwXEnr+ZVLNwzto\"",
		"mtime": "2026-05-02T16:03:29.471Z",
		"size": 2462,
		"path": "../public/assets/SwitchBase-CkVtnY-1.js"
	},
	"/assets/SwitchBase-CkVtnY-1.js.map": {
		"type": "application/json",
		"etag": "\"301d-hsLcHK40caO6yqa6FqfHl2w0cyI\"",
		"mtime": "2026-05-02T16:03:29.478Z",
		"size": 12317,
		"path": "../public/assets/SwitchBase-CkVtnY-1.js.map"
	},
	"/assets/arrow-right-Cedf5YHV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ca-SzUcrwTcQlx4AH2+0/SiY4QghkE\"",
		"mtime": "2026-05-02T16:03:29.471Z",
		"size": 202,
		"path": "../public/assets/arrow-right-Cedf5YHV.js"
	},
	"/assets/AppShell-BfYhyLnZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e1a56-PZIqyxDvIezxNP7Uk7lGAo/x89Y\"",
		"mtime": "2026-05-02T16:03:29.470Z",
		"size": 924246,
		"path": "../public/assets/AppShell-BfYhyLnZ.js"
	},
	"/assets/Stack-B4LeoELJ.js.map": {
		"type": "application/json",
		"etag": "\"84a47-Y8NYAg3GtKf+u0zWzt/KwAlGSYA\"",
		"mtime": "2026-05-02T16:03:29.478Z",
		"size": 543303,
		"path": "../public/assets/Stack-B4LeoELJ.js.map"
	},
	"/assets/arrow-right-Cedf5YHV.js.map": {
		"type": "application/json",
		"etag": "\"394-F250PjPcg4/lCSOhIkw+IaSoRzU\"",
		"mtime": "2026-05-02T16:03:29.478Z",
		"size": 916,
		"path": "../public/assets/arrow-right-Cedf5YHV.js.map"
	},
	"/assets/call-2JP2bFYn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1628-GZqGjflcW8WXmGLBY43hMSNoTo0\"",
		"mtime": "2026-05-02T16:03:29.471Z",
		"size": 5672,
		"path": "../public/assets/call-2JP2bFYn.js"
	},
	"/assets/call-2JP2bFYn.js.map": {
		"type": "application/json",
		"etag": "\"4d5b-utJtzz9iCtAk8h35hLNUPYvB+UY\"",
		"mtime": "2026-05-02T16:03:29.478Z",
		"size": 19803,
		"path": "../public/assets/call-2JP2bFYn.js.map"
	},
	"/assets/call._id-BaNtqlri.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"87-2Hz/rE4xQ5ybrqMgSn0V8aUqJfE\"",
		"mtime": "2026-05-02T16:03:29.471Z",
		"size": 135,
		"path": "../public/assets/call._id-BaNtqlri.js"
	},
	"/assets/call._id-BaNtqlri.js.map": {
		"type": "application/json",
		"etag": "\"20b-SQMeJRQfwYan5KG6YB+NI1z3Seg\"",
		"mtime": "2026-05-02T16:03:29.478Z",
		"size": 523,
		"path": "../public/assets/call._id-BaNtqlri.js.map"
	},
	"/assets/call._id-Bb6uRP0l.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b19b-KU8tJd+5vx8jiE2q1z+w4xBWCiU\"",
		"mtime": "2026-05-02T16:03:29.471Z",
		"size": 45467,
		"path": "../public/assets/call._id-Bb6uRP0l.js"
	},
	"/assets/call._id-Bb6uRP0l.js.map": {
		"type": "application/json",
		"etag": "\"290df-tnZRY59RI+Vt4S8S4rFY3Rd8MEk\"",
		"mtime": "2026-05-02T16:03:29.478Z",
		"size": 168159,
		"path": "../public/assets/call._id-Bb6uRP0l.js.map"
	},
	"/assets/DynamicIsland-CW6WUaQb.js.map": {
		"type": "application/json",
		"etag": "\"1071c6-OsG7YlMmnDSAlKQIPp/rwdu5tmg\"",
		"mtime": "2026-05-02T16:03:29.476Z",
		"size": 1077702,
		"path": "../public/assets/DynamicIsland-CW6WUaQb.js.map"
	},
	"/assets/calls-BqtxFy1I.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"557-IrDkFe76Kz3Ux76fqrq/B+e1mME\"",
		"mtime": "2026-05-02T16:03:29.471Z",
		"size": 1367,
		"path": "../public/assets/calls-BqtxFy1I.js"
	},
	"/assets/calls-BqtxFy1I.js.map": {
		"type": "application/json",
		"etag": "\"1bf8-+EW8u9AotNoTyC2FXWUsNzjdB/0\"",
		"mtime": "2026-05-02T16:03:29.478Z",
		"size": 7160,
		"path": "../public/assets/calls-BqtxFy1I.js.map"
	},
	"/assets/calls-BycCVN0j.js.map": {
		"type": "application/json",
		"etag": "\"1fe-v1wsA+q4hSIlcgWiujob/4n+NOw\"",
		"mtime": "2026-05-02T16:03:29.478Z",
		"size": 510,
		"path": "../public/assets/calls-BycCVN0j.js.map"
	},
	"/assets/calls-BycCVN0j.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"84-nFiYP8wMM5m+ZvWPm1fhOWOMqek\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 132,
		"path": "../public/assets/calls-BycCVN0j.js"
	},
	"/assets/calls-ClZBHEHS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"478c-XX4tndU+KJb54R0tylZEVPXgykc\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 18316,
		"path": "../public/assets/calls-ClZBHEHS.js"
	},
	"/assets/calls-ClZBHEHS.js.map": {
		"type": "application/json",
		"etag": "\"105b2-rt7Nc5qE4Rd6mwLhR5rlHsggXmg\"",
		"mtime": "2026-05-02T16:03:29.478Z",
		"size": 66994,
		"path": "../public/assets/calls-ClZBHEHS.js.map"
	},
	"/assets/chat._id-BUMzbJcp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"87-uYqfr7Z6o4sBXguiVivUwXuGcIw\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 135,
		"path": "../public/assets/chat._id-BUMzbJcp.js"
	},
	"/assets/chat._id-DZ1-ETzU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2a89b-1bvJArCIHOveHOwiUspzn77UvnI\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 174235,
		"path": "../public/assets/chat._id-DZ1-ETzU.js"
	},
	"/assets/chat._id-BUMzbJcp.js.map": {
		"type": "application/json",
		"etag": "\"20b-GKEyD/kpY3C3bYENgRu2QYM2vQo\"",
		"mtime": "2026-05-02T16:03:29.479Z",
		"size": 523,
		"path": "../public/assets/chat._id-BUMzbJcp.js.map"
	},
	"/assets/chats-BVqIaE6C.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7173-9jeQWdBN9N75wctU3IPCwqt3IWs\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 29043,
		"path": "../public/assets/chats-BVqIaE6C.js"
	},
	"/assets/chats-Co7IKo2K.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"84-FAbKsToTGsndwedzROWbUrkdO5k\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 132,
		"path": "../public/assets/chats-Co7IKo2K.js"
	},
	"/assets/chats-BVqIaE6C.js.map": {
		"type": "application/json",
		"etag": "\"1df76-2nKrHS37TGPcgXXHiDCTLb03b6A\"",
		"mtime": "2026-05-02T16:03:29.479Z",
		"size": 122742,
		"path": "../public/assets/chats-BVqIaE6C.js.map"
	},
	"/assets/chats-Co7IKo2K.js.map": {
		"type": "application/json",
		"etag": "\"1fe-Iszd5u8EKVfubhzMzdqPSfGpkrY\"",
		"mtime": "2026-05-02T16:03:29.479Z",
		"size": 510,
		"path": "../public/assets/chats-Co7IKo2K.js.map"
	},
	"/assets/createClientRpc-BWhQ8r2W.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7bbb-rBPfB9e3/FpOplwu9y255U6N4EU\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 31675,
		"path": "../public/assets/createClientRpc-BWhQ8r2W.js"
	},
	"/assets/createClientRpc-BWhQ8r2W.js.map": {
		"type": "application/json",
		"etag": "\"2196a-QpcTOozG+3mL2mlA6wrGLFE25qU\"",
		"mtime": "2026-05-02T16:03:29.479Z",
		"size": 137578,
		"path": "../public/assets/createClientRpc-BWhQ8r2W.js.map"
	},
	"/assets/chat._id-DZ1-ETzU.js.map": {
		"type": "application/json",
		"etag": "\"a3324-xuRbthM1oYzNGnVutvep26xglww\"",
		"mtime": "2026-05-02T16:03:29.479Z",
		"size": 668452,
		"path": "../public/assets/chat._id-DZ1-ETzU.js.map"
	},
	"/assets/globals-BXDo2CS9.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"808-GvksAf8WQJbT2P7cs91oMvwvjgE\"",
		"mtime": "2026-05-02T16:03:29.483Z",
		"size": 2056,
		"path": "../public/assets/globals-BXDo2CS9.css"
	},
	"/assets/groups.invite._conversationId-CS79vk4t.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9c-fKl6xF6Enh+cPmEw9G+TtOD7llY\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 156,
		"path": "../public/assets/groups.invite._conversationId-CS79vk4t.js"
	},
	"/assets/groups.invite._conversationId-CS79vk4t.js.map": {
		"type": "application/json",
		"etag": "\"25f-p4Z1SZOLGj8d3d8QkceHtWczKzY\"",
		"mtime": "2026-05-02T16:03:29.479Z",
		"size": 607,
		"path": "../public/assets/groups.invite._conversationId-CS79vk4t.js.map"
	},
	"/assets/groups.invite._conversationId-DQ26l8TF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10c6-31N+cUBg4kS4Ki2EFqOCHxuooHs\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 4294,
		"path": "../public/assets/groups.invite._conversationId-DQ26l8TF.js"
	},
	"/assets/hash--ddU2RAt.js.map": {
		"type": "application/json",
		"etag": "\"517-gG6Y8yFIbYzc2Waw3MwsNzCgBtM\"",
		"mtime": "2026-05-02T16:03:29.480Z",
		"size": 1303,
		"path": "../public/assets/hash--ddU2RAt.js.map"
	},
	"/assets/hash--ddU2RAt.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"146-2zLcrM5TM9utj/4Og34+wPj9KzU\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 326,
		"path": "../public/assets/hash--ddU2RAt.js"
	},
	"/assets/groups.invite._conversationId-DQ26l8TF.js.map": {
		"type": "application/json",
		"etag": "\"3194-lUr21EDS+JR1++sVIWBNvHX5d3c\"",
		"mtime": "2026-05-02T16:03:29.479Z",
		"size": 12692,
		"path": "../public/assets/groups.invite._conversationId-DQ26l8TF.js.map"
	},
	"/assets/image-DI4i0xXC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12c-9XFytVkwT9Tag77yNBl7OQXmBQs\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 300,
		"path": "../public/assets/image-DI4i0xXC.js"
	},
	"/assets/AppShell-BfYhyLnZ.js.map": {
		"type": "application/json",
		"etag": "\"3f4871-Y/Okd4dKcFkdvL6nTuSgFBjx3O0\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 4147313,
		"path": "../public/assets/AppShell-BfYhyLnZ.js.map"
	},
	"/assets/image-DI4i0xXC.js.map": {
		"type": "application/json",
		"etag": "\"47f-S058np34zoHCPZKVOD8pbvt3UDk\"",
		"mtime": "2026-05-02T16:03:29.480Z",
		"size": 1151,
		"path": "../public/assets/image-DI4i0xXC.js.map"
	},
	"/assets/lock-BxAALgLe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"29170-Oe1h3L+lYoeNE9cqHZNIzwl2R3M\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 168304,
		"path": "../public/assets/lock-BxAALgLe.js"
	},
	"/assets/log-in-DShWSL0f.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"107-8hLewLlxvOGRi0ueRoyVOXVoZsM\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 263,
		"path": "../public/assets/log-in-DShWSL0f.js"
	},
	"/assets/log-in-DShWSL0f.js.map": {
		"type": "application/json",
		"etag": "\"3fc-FnqGJNMaW6uF38QJBlNp1iEM9d0\"",
		"mtime": "2026-05-02T16:03:29.481Z",
		"size": 1020,
		"path": "../public/assets/log-in-DShWSL0f.js.map"
	},
	"/assets/message-square-CsZZhGSX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"158-qCfdvRnLBlXPOrSTnHc94xi0Ifg\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 344,
		"path": "../public/assets/message-square-CsZZhGSX.js"
	},
	"/assets/message-square-CsZZhGSX.js.map": {
		"type": "application/json",
		"etag": "\"663-JRolwctzdCW+8y4hvLjqL3OoOPg\"",
		"mtime": "2026-05-02T16:03:29.481Z",
		"size": 1635,
		"path": "../public/assets/message-square-CsZZhGSX.js.map"
	},
	"/assets/post._id-CcNvTxC2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"87-KapM97Y/vO7EjVyfP3p8PM0MSc4\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 135,
		"path": "../public/assets/post._id-CcNvTxC2.js"
	},
	"/assets/post._id-5w1mQ4uc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8dce-fSOSCcRBc30U5rgZR7Ssg3V+KwI\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 36302,
		"path": "../public/assets/post._id-5w1mQ4uc.js"
	},
	"/assets/index-lo247mdV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"43600-urKWMnJFec1I5oe+K5Z38ISrGCQ\"",
		"mtime": "2026-05-02T16:03:29.469Z",
		"size": 275968,
		"path": "../public/assets/index-lo247mdV.js"
	},
	"/assets/post._id-CcNvTxC2.js.map": {
		"type": "application/json",
		"etag": "\"20b-48G3vJD3aaisIBYEvTmOMCvutb4\"",
		"mtime": "2026-05-02T16:03:29.481Z",
		"size": 523,
		"path": "../public/assets/post._id-CcNvTxC2.js.map"
	},
	"/assets/post._id-5w1mQ4uc.js.map": {
		"type": "application/json",
		"etag": "\"1f541-Mr59SrfvmNolP+pK+OCYhfQft18\"",
		"mtime": "2026-05-02T16:03:29.481Z",
		"size": 128321,
		"path": "../public/assets/post._id-5w1mQ4uc.js.map"
	},
	"/assets/preload-helper-4iCqYs30.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15328-SEUopxKwc6ICRWjlsK9MkPAZgYM\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 86824,
		"path": "../public/assets/preload-helper-4iCqYs30.js"
	},
	"/assets/lock-BxAALgLe.js.map": {
		"type": "application/json",
		"etag": "\"d0920-RDh39uY4pLq4hLjtV3CyhVy0N5c\"",
		"mtime": "2026-05-02T16:03:29.481Z",
		"size": 854304,
		"path": "../public/assets/lock-BxAALgLe.js.map"
	},
	"/assets/preload-helper-4iCqYs30.js.map": {
		"type": "application/json",
		"etag": "\"536df-azb39ei2twI4JdiDj5V94m5A+fQ\"",
		"mtime": "2026-05-02T16:03:29.481Z",
		"size": 341727,
		"path": "../public/assets/preload-helper-4iCqYs30.js.map"
	},
	"/assets/routes-76Coi8ga.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"11de3-KMaJbpByAKDVcQa51ShyLhgED4M\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 73187,
		"path": "../public/assets/routes-76Coi8ga.js"
	},
	"/assets/index-lo247mdV.js.map": {
		"type": "application/json",
		"etag": "\"12471d-4dkR3sllDHXKNfhAqu0D25ApT0M\"",
		"mtime": "2026-05-02T16:03:29.480Z",
		"size": 1197853,
		"path": "../public/assets/index-lo247mdV.js.map"
	},
	"/assets/routes-CSlIcUmH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"85-bTWmXfh9WRJqCQfYTlMBRd/qOV4\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 133,
		"path": "../public/assets/routes-CSlIcUmH.js"
	},
	"/assets/routes-CSlIcUmH.js.map": {
		"type": "application/json",
		"etag": "\"1f4-BwNopf8e3WfLwMKJmLvh7Yi7y0U\"",
		"mtime": "2026-05-02T16:03:29.482Z",
		"size": 500,
		"path": "../public/assets/routes-CSlIcUmH.js.map"
	},
	"/assets/security-72XP2G4f.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2883-Hkmj0mM3JDi3tbwN0wUlN2Wax4c\"",
		"mtime": "2026-05-02T16:03:29.472Z",
		"size": 10371,
		"path": "../public/assets/security-72XP2G4f.js"
	},
	"/assets/security-72XP2G4f.js.map": {
		"type": "application/json",
		"etag": "\"76b8-xhBg4AORajqkZ1GGarJAWabSxeQ\"",
		"mtime": "2026-05-02T16:03:29.482Z",
		"size": 30392,
		"path": "../public/assets/security-72XP2G4f.js.map"
	},
	"/assets/settings-BJHex1tK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"62fe-Z9uFDcwf+tykmcGebYc4ACmFCz8\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 25342,
		"path": "../public/assets/settings-BJHex1tK.js"
	},
	"/assets/routes-76Coi8ga.js.map": {
		"type": "application/json",
		"etag": "\"4212b-4hNWZirsZNSoF4OjECqIHaVDvj4\"",
		"mtime": "2026-05-02T16:03:29.482Z",
		"size": 270635,
		"path": "../public/assets/routes-76Coi8ga.js.map"
	},
	"/assets/settings-CPfuhZeb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"87-AjjKYmrczva0xvzmDMMxnn9VPb8\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 135,
		"path": "../public/assets/settings-CPfuhZeb.js"
	},
	"/assets/settings-CPfuhZeb.js.map": {
		"type": "application/json",
		"etag": "\"20a-uYRZWVaNSBjs6zvsk9hgDakjXC8\"",
		"mtime": "2026-05-02T16:03:29.482Z",
		"size": 522,
		"path": "../public/assets/settings-CPfuhZeb.js.map"
	},
	"/assets/settings-BJHex1tK.js.map": {
		"type": "application/json",
		"etag": "\"175d4-gWOWm7LZRj9vjmjQUpToM+l9RQs\"",
		"mtime": "2026-05-02T16:03:29.482Z",
		"size": 95700,
		"path": "../public/assets/settings-BJHex1tK.js.map"
	},
	"/assets/shield-alert-Dbk3M_sf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"187-H2Qe8tx8wEH4Ut7GJ3sInD9MJFk\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 391,
		"path": "../public/assets/shield-alert-Dbk3M_sf.js"
	},
	"/assets/shield-alert-Dbk3M_sf.js.map": {
		"type": "application/json",
		"etag": "\"4b4-8ByO4yMG5AMsrQFugvclXl5saNE\"",
		"mtime": "2026-05-02T16:03:29.482Z",
		"size": 1204,
		"path": "../public/assets/shield-alert-Dbk3M_sf.js.map"
	},
	"/assets/shield-check-aTSW68wB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"166-lVQ0Gm3o3f8co2DLDiDTRPy1LMw\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 358,
		"path": "../public/assets/shield-check-aTSW68wB.js"
	},
	"/assets/shield-check-aTSW68wB.js.map": {
		"type": "application/json",
		"etag": "\"457-GJauS2+3ppJx6LQPD0yb2ox0WEs\"",
		"mtime": "2026-05-02T16:03:29.482Z",
		"size": 1111,
		"path": "../public/assets/shield-check-aTSW68wB.js.map"
	},
	"/assets/smartphone-BC5X_Uzr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e9-5BigpiGj4WAxtJgBsyc/9Iq3KR8\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 233,
		"path": "../public/assets/smartphone-BC5X_Uzr.js"
	},
	"/assets/smartphone-BC5X_Uzr.js.map": {
		"type": "application/json",
		"etag": "\"3f5-UQhUEGFtVE9i3q9Tx3de0xvfJ8c\"",
		"mtime": "2026-05-02T16:03:29.482Z",
		"size": 1013,
		"path": "../public/assets/smartphone-BC5X_Uzr.js.map"
	},
	"/assets/square-DM7kQKvF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"169-iJ2vzZQ7Y0R9Xb3FFLWPg6pBfcE\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 361,
		"path": "../public/assets/square-DM7kQKvF.js"
	},
	"/assets/square-DM7kQKvF.js.map": {
		"type": "application/json",
		"etag": "\"71d-M7v8/pRX43T/u0gUGes6sjtXxbw\"",
		"mtime": "2026-05-02T16:03:29.482Z",
		"size": 1821,
		"path": "../public/assets/square-DM7kQKvF.js.map"
	},
	"/assets/time-Dpe0_iia.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99d-9rjJXTAfkq8RT1KfnNZmk4oWBh0\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 2461,
		"path": "../public/assets/time-Dpe0_iia.js"
	},
	"/assets/time-Dpe0_iia.js.map": {
		"type": "application/json",
		"etag": "\"4a54-CfQZh10OcDJdff1gztMqyiF+TzE\"",
		"mtime": "2026-05-02T16:03:29.482Z",
		"size": 19028,
		"path": "../public/assets/time-Dpe0_iia.js.map"
	},
	"/assets/u._username-BxXZal9D.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5181-xElZ5Zbn/k8/fE611p8XxKoWNdk\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 20865,
		"path": "../public/assets/u._username-BxXZal9D.js"
	},
	"/assets/u._username-BxXZal9D.js.map": {
		"type": "application/json",
		"etag": "\"12213-rIWkD8OLkYx58WpGH96eU/pmjvk\"",
		"mtime": "2026-05-02T16:03:29.482Z",
		"size": 74259,
		"path": "../public/assets/u._username-BxXZal9D.js.map"
	},
	"/assets/u._username-Dg2AIIHB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8a-uFy32q/FaJEsz/KmiCSnGZBgVN0\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 138,
		"path": "../public/assets/u._username-Dg2AIIHB.js"
	},
	"/assets/u._username-Dg2AIIHB.js.map": {
		"type": "application/json",
		"etag": "\"217-ELU9p33nfdORiZFIoMUAtcp3hpM\"",
		"mtime": "2026-05-02T16:03:29.483Z",
		"size": 535,
		"path": "../public/assets/u._username-Dg2AIIHB.js.map"
	},
	"/assets/upgrade-island-DSB77BlM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"678-G7yviMma5BrjussPew6U/vH0h+g\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 1656,
		"path": "../public/assets/upgrade-island-DSB77BlM.js"
	},
	"/assets/upgrade-island-DSB77BlM.js.map": {
		"type": "application/json",
		"etag": "\"14ee-Y0Tl7wZMN2dtYokbhAcc96Sr6fc\"",
		"mtime": "2026-05-02T16:03:29.483Z",
		"size": 5358,
		"path": "../public/assets/upgrade-island-DSB77BlM.js.map"
	},
	"/assets/user-5sTCdeW5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e2-7Oliq/U8n8oCa6isZpDmtjejpyo\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 226,
		"path": "../public/assets/user-5sTCdeW5.js"
	},
	"/assets/user-5sTCdeW5.js.map": {
		"type": "application/json",
		"etag": "\"3ad-F5IFh7g0f1rT8kg7hdmkyhd+Xi4\"",
		"mtime": "2026-05-02T16:03:29.483Z",
		"size": 941,
		"path": "../public/assets/user-5sTCdeW5.js.map"
	},
	"/assets/users-LE42QAc1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2c1a-qVSnO+yyxmFbnaLmXJjxHTherPA\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 11290,
		"path": "../public/assets/users-LE42QAc1.js"
	},
	"/assets/x-DZTZnTvy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dc9-uOOnGG6F60pfmJjaFcbHOxwTrz8\"",
		"mtime": "2026-05-02T16:03:29.473Z",
		"size": 7625,
		"path": "../public/assets/x-DZTZnTvy.js"
	},
	"/assets/x-DZTZnTvy.js.map": {
		"type": "application/json",
		"etag": "\"8523-ZJKMUP6T0UbjB0ogxB/LgC+D3Z8\"",
		"mtime": "2026-05-02T16:03:29.483Z",
		"size": 34083,
		"path": "../public/assets/x-DZTZnTvy.js.map"
	},
	"/assets/users-LE42QAc1.js.map": {
		"type": "application/json",
		"etag": "\"af2c-1Nod2Hy+ET/TXAbPuHHPGPfYwMA\"",
		"mtime": "2026-05-02T16:03:29.483Z",
		"size": 44844,
		"path": "../public/assets/users-LE42QAc1.js.map"
	}
};
//#endregion
//#region #nitro/virtual/public-assets-node
function readAsset(id) {
	const serverDir = dirname(fileURLToPath(globalThis.__nitro_main__));
	return promises.readFile(resolve(serverDir, public_assets_data_default[id].path));
}
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
function getAsset(id) {
	return public_assets_data_default[id];
}
//#endregion
//#region node_modules/.pnpm/nitro-nightly@3.0.1-20260417-125953-8c3f16b2_chokidar@4.0.3_dotenv@17.4.2_lru-cache@11._f702b2f75fa96247e2ff48d87c632d9d/node_modules/nitro-nightly/dist/runtime/internal/static.mjs
var METHODS = new Set(["HEAD", "GET"]);
var EncodingMap = {
	gzip: ".gz",
	br: ".br",
	zstd: ".zst"
};
var static_default = defineHandler((event) => {
	if (event.req.method && !METHODS.has(event.req.method)) return;
	let id = decodePath(withLeadingSlash(withoutTrailingSlash(event.url.pathname)));
	let asset;
	const encodings = [...(event.req.headers.get("accept-encoding") || "").split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(), ""];
	for (const encoding of encodings) for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
		const _asset = getAsset(_id);
		if (_asset) {
			asset = _asset;
			id = _id;
			break;
		}
	}
	if (!asset) {
		if (isPublicAssetURL(id)) {
			event.res.headers.delete("Cache-Control");
			throw new HTTPError({ status: 404 });
		}
		return;
	}
	if (encodings.length > 1) event.res.headers.append("Vary", "Accept-Encoding");
	if (event.req.headers.get("if-none-match") === asset.etag) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	const ifModifiedSinceH = event.req.headers.get("if-modified-since");
	const mtimeDate = new Date(asset.mtime);
	if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	if (asset.type) event.res.headers.set("Content-Type", asset.type);
	if (asset.etag && !event.res.headers.has("ETag")) event.res.headers.set("ETag", asset.etag);
	if (asset.mtime && !event.res.headers.has("Last-Modified")) event.res.headers.set("Last-Modified", mtimeDate.toUTCString());
	if (asset.encoding && !event.res.headers.has("Content-Encoding")) event.res.headers.set("Content-Encoding", asset.encoding);
	if (asset.size > 0 && !event.res.headers.has("Content-Length")) event.res.headers.set("Content-Length", asset.size.toString());
	return readAsset(id);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_yHovgl = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_yHovgl
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
var globalMiddleware = [toEventHandler(static_default)].filter(Boolean);
//#endregion
//#region node_modules/.pnpm/nitro-nightly@3.0.1-20260417-125953-8c3f16b2_chokidar@4.0.3_dotenv@17.4.2_lru-cache@11._f702b2f75fa96247e2ff48d87c632d9d/node_modules/nitro-nightly/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function createNitroApp() {
	const hooks = void 0;
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~middleware"].push(...globalMiddleware);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		{
			const routeRules = getRouteRules(method, pathname);
			event.context.routeRules = routeRules?.routeRules;
			if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		}
		middleware.push(...h3App["~middleware"]);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/.pnpm/nitro-nightly@3.0.1-20260417-125953-8c3f16b2_chokidar@4.0.3_dotenv@17.4.2_lru-cache@11._f702b2f75fa96247e2ff48d87c632d9d/node_modules/nitro-nightly/dist/runtime/internal/error/hooks.mjs
function _captureError(error, type) {
	console.error(`[${type}]`, error);
	useNitroApp().captureError?.(error, { tags: [type] });
}
function trapUnhandledErrors() {
	process.on("unhandledRejection", (error) => _captureError(error, "unhandledRejection"));
	process.on("uncaughtException", (error) => _captureError(error, "uncaughtException"));
}
//#endregion
//#region #nitro/virtual/tracing
var tracingSrvxPlugins = [];
//#endregion
//#region node_modules/.pnpm/nitro-nightly@3.0.1-20260417-125953-8c3f16b2_chokidar@4.0.3_dotenv@17.4.2_lru-cache@11._f702b2f75fa96247e2ff48d87c632d9d/node_modules/nitro-nightly/dist/presets/node/runtime/node-server.mjs
var _parsedPort = Number.parseInt(process.env.NITRO_PORT ?? process.env.PORT ?? "");
var port = Number.isNaN(_parsedPort) ? 3e3 : _parsedPort;
var host = process.env.NITRO_HOST || process.env.HOST;
var cert = process.env.NITRO_SSL_CERT;
var key = process.env.NITRO_SSL_KEY;
var nitroApp = useNitroApp();
serve({
	port,
	hostname: host,
	tls: cert && key ? {
		cert,
		key
	} : void 0,
	fetch: nitroApp.fetch,
	plugins: [...tracingSrvxPlugins]
});
trapUnhandledErrors();
var node_server_default = {};
//#endregion
export { node_server_default as default };
