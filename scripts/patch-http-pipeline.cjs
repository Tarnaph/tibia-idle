/**
 * Idempotent patch for Vinext and srvx HTTP pipeline
 * Fixes: "Response body object should not be disturbed or locked"
 */
const fs = require('fs');
const path = require('path');

function patchFile(filePath, transforms) {
  if (!fs.existsSync(filePath)) {
    console.log(`[patch-http-pipeline] File not found: ${filePath}`);
    return false;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const { name, search, replace } of transforms) {
    if (content.includes(search)) {
      content = content.replace(search, replace);
      changed = true;
      console.log(`[patch-http-pipeline] Applied ${name} to ${path.basename(filePath)}`);
    } else {
      console.log(`[patch-http-pipeline] Skipped (already applied or pattern missing) ${name} in ${path.basename(filePath)}`);
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  return changed;
}

const root = path.resolve(__dirname, '..');

// 1. Patch vinext request-pipeline.js
const requestPipelinePath = path.join(root, 'node_modules/vinext/dist/server/request-pipeline.js');
patchFile(requestPipelinePath, [
  {
    name: 'safe cloneRequestWithUrl and cloneRequestWithHeaders',
    search: `function cloneRequestWithHeaders(request, headers) {
	let cloned;
	try {
		cloned = new Request(request, { headers });
	} catch {
		const init = {
			method: request.method,
			headers,
			body: request.body ?? void 0,
			redirect: request.redirect,
			signal: request.signal,
			integrity: request.integrity,
			cache: request.cache,
			mode: request.mode,
			credentials: request.credentials,
			referrer: request.referrer,
			referrerPolicy: request.referrerPolicy
		};
		if (request.body) init.duplex = "half";
		cloned = new Request(request.url, init);
	}
	const cf = getRequestCf(request);
	if (cf !== void 0) Object.defineProperty(cloned, "cf", {
		value: cf,
		enumerable: true,
		configurable: true
	});
	return cloned;
}
/**
* Clone a Request while overriding the URL, preserving headers and metadata
* when possible.
*
* Mirrors \`cloneRequestWithHeaders\`, but rewrites the URL instead of the
* headers. Workers support \`new Request(url, request)\` to copy method/headers/
* body onto a new URL; Node/undici can throw on a foreign Request instance, so
* we fall back to a manual RequestInit. \`new Request()\` does not copy the
* Workers-specific \`cf\` property and omits \`duplex\` for streaming bodies, so
* both are handled explicitly — the same reasons \`cloneRequestWithHeaders\`
* exists.
*/
function cloneRequestWithUrl(request, url) {
	let cloned;
	try {
		cloned = new Request(url, request);
	} catch {
		const init = {
			method: request.method,
			headers: request.headers,
			body: request.body ?? void 0,
			redirect: request.redirect,
			signal: request.signal,
			integrity: request.integrity,
			cache: request.cache,
			mode: request.mode,
			credentials: request.credentials,
			referrer: request.referrer,
			referrerPolicy: request.referrerPolicy
		};
		if (request.body) init.duplex = "half";
		cloned = new Request(url, init);
	}
	const cf = getRequestCf(request);
	if (cf !== void 0) Object.defineProperty(cloned, "cf", {
		value: cf,
		enumerable: true,
		configurable: true
	});
	return cloned;
}`,
    replace: `function cloneRequestWithHeaders(request, headers) {
	let cloned;
	try {
		cloned = new Request(request, { headers });
	} catch {
		const isNoBodyMethod = request.method === "GET" || request.method === "HEAD";
		let body = void 0;
		if (!isNoBodyMethod && request.body) {
			try {
				if (!request.bodyUsed && !request.body.locked) {
					body = request.body;
				}
			} catch {}
		}
		let redirect, signal, integrity, cache, mode, credentials, referrer, referrerPolicy;
		try { redirect = request.redirect; } catch {}
		try { signal = request.signal; } catch {}
		try { integrity = request.integrity; } catch {}
		try { cache = request.cache; } catch {}
		try { mode = request.mode; } catch {}
		try { credentials = request.credentials; } catch {}
		try { referrer = request.referrer; } catch {}
		try { referrerPolicy = request.referrerPolicy; } catch {}
		const init = {
			method: request.method,
			headers,
			body,
			redirect,
			signal,
			integrity,
			cache,
			mode,
			credentials,
			referrer,
			referrerPolicy
		};
		if (body) init.duplex = "half";
		try {
			cloned = new Request(request.url, init);
		} catch {
			delete init.body;
			delete init.duplex;
			cloned = new Request(request.url, init);
		}
	}
	const cf = getRequestCf(request);
	if (cf !== void 0) Object.defineProperty(cloned, "cf", {
		value: cf,
		enumerable: true,
		configurable: true
	});
	return cloned;
}
/**
* Clone a Request while overriding the URL, preserving headers and metadata
* when possible.
*/
function cloneRequestWithUrl(request, url) {
	if (!url || request.url === url) return request;
	let cloned;
	try {
		cloned = new Request(url, request);
	} catch {
		const isNoBodyMethod = request.method === "GET" || request.method === "HEAD";
		let body = void 0;
		if (!isNoBodyMethod && request.body) {
			try {
				if (!request.bodyUsed && !request.body.locked) {
					body = request.body;
				}
			} catch {}
		}
		let redirect, signal, integrity, cache, mode, credentials, referrer, referrerPolicy;
		try { redirect = request.redirect; } catch {}
		try { signal = request.signal; } catch {}
		try { integrity = request.integrity; } catch {}
		try { cache = request.cache; } catch {}
		try { mode = request.mode; } catch {}
		try { credentials = request.credentials; } catch {}
		try { referrer = request.referrer; } catch {}
		try { referrerPolicy = request.referrerPolicy; } catch {}
		const init = {
			method: request.method,
			headers: request.headers,
			body,
			redirect,
			signal,
			integrity,
			cache,
			mode,
			credentials,
			referrer,
			referrerPolicy
		};
		if (body) init.duplex = "half";
		try {
			cloned = new Request(url, init);
		} catch {
			delete init.body;
			delete init.duplex;
			cloned = new Request(url, init);
		}
	}
	const cf = getRequestCf(request);
	if (cf !== void 0) Object.defineProperty(cloned, "cf", {
		value: cf,
		enumerable: true,
		configurable: true
	});
	return cloned;
}`
  }
]);

// 2. Patch vinext app-rsc-handler.js
const appRscHandlerPath = path.join(root, 'node_modules/vinext/dist/server/app-rsc-handler.js');
patchFile(appRscHandlerPath, [
  {
    name: 'safe pagesDataCandidate conditional cloning',
    search: `const pagesDataCandidate = pagesDataInScope ? cloneRequestWithUrl(rawRequest, pagesDataUrl.toString()) : null;`,
    replace: `const pagesDataCandidate = (options.renderPagesFallback && pagesDataInScope)
			? (pagesDataUrl.toString() === rawRequest.url ? rawRequest : cloneRequestWithUrl(rawRequest, pagesDataUrl.toString()))
			: null;`
  }
]);

// 3. Patch srvx node adapter
const srvxNodePath = path.join(root, 'node_modules/srvx/dist/adapters/node.mjs');
patchFile(srvxNodePath, [
  {
    name: 'safe _request native Request instantiation',
    search: `		get _request() {
			if (!this.#request) {
				const body = this.body;
				this.#request = new NativeRequest(this.url, {
					method: this.method,
					headers: this.headers,
					signal: this._abortController.signal,
					body,
					duplex: body ? "half" : void 0
				});
				this.#headers = void 0;
				this.#bodyStream = void 0;
			}
			return this.#request;
		}`,
    replace: `		get _request() {
			if (!this.#request) {
				const body = this.body;
				try {
					this.#request = new NativeRequest(this.url, {
						method: this.method,
						headers: this.headers,
						signal: this._abortController.signal,
						body,
						duplex: body ? "half" : void 0
					});
				} catch (err) {
					this.#request = new NativeRequest(this.url, {
						method: this.method,
						headers: this.headers,
						signal: this._abortController.signal
					});
				}
				this.#headers = void 0;
				this.#bodyStream = void 0;
			}
			return this.#request;
		}`
  }
]);

console.log('[patch-http-pipeline] Done.');
