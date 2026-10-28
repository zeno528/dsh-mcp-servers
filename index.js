/**
 * Host half of the MCP servers bundle.
 *
 * The profile patch keeps exactly one durable row for this plugin, and that
 * row's `servers` field is the settings page's target. This plugin derives one
 * `@deepseek-ai/dsh-mcp-client` Loader entry per enabled server in the root
 * Loader tree, resolves each server's credential through the Host credentials
 * seam immediately before materializing the entry, and reconciles the derived
 * entries whenever the settings document or a credential changes.
 *
 * Derived entries are runtime-only: the root Loader tree is in-memory, so they
 * are never written to the profile patch. Every process start, HMR
 * recomposition, or plugin reload recreates them from the settings document.
 *
 * @module @local/dsh-mcp-servers
 */
import z from '@deepseek-ai/schemastery'
import { spawn } from 'node:child_process'

/** Package that owns one MCP connection per Loader entry. */
const MCP_CLIENT_PLUGIN = '@deepseek-ai/dsh-mcp-client'
/** Prefix of the root-tree Loader entry ids this plugin owns. */
const ENTRY_PREFIX = 'mcp-server-'
/** Exact HTTP route the Plugins page polls for live state. */
const STATUS_ROUTE = '/plugin-mcp-servers/status'
/** Maximum accepted status request body, in bytes. */
const STATUS_REQUEST_LIMIT = 4096
/** `serverName` grammar the MCP client accepts. */
const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/
/** Environment-variable spelling the credentials seam accepts as a reference. */
const CREDENTIAL_REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
/** Per-call timeout assumed when a server leaves it unspecified. */
const DEFAULT_TOOL_CALL_TIMEOUT_MS = 120000
/** How often the reconciler re-checks derived entries against the settings document. */
const RECONCILE_INTERVAL_MS = 5000
/** Cordis Fiber states, mirrored because the enum is package-internal. */
const FIBER_STATE = {
  PENDING: 0,
  LOADING: 1,
  ACTIVE: 2,
  FAILED: 3,
  DISPOSED: 4,
  UNLOADING: 5,
}
/** Public phase for a live Fiber state. */
const FIBER_PHASE = {
  [FIBER_STATE.PENDING]: 'pending',
  [FIBER_STATE.LOADING]: 'loading',
  [FIBER_STATE.ACTIVE]: 'active',
  [FIBER_STATE.FAILED]: 'failed',
  [FIBER_STATE.UNLOADING]: 'unloading',
}

/**
 * One MCP server as the settings page stores it.
 *
 * `credentialRef` names an environment-variable-shaped credential reference,
 * never a literal secret: the Host resolves it through `ctx.credentials` when
 * materializing the derived Loader entry, and the settings document never
 * carries the value.
 */
const Server = z.object({
  serverName: z
    .string()
    .required()
    .pattern(SERVER_NAME_PATTERN)
    .description('Namespace for the server tool names; unique across configured servers.'),
  transport: z
    .union([z.const('stdio'), z.const('streamable-http')])
    .default('streamable-http')
    .description('Connection transport: a local program or a Streamable HTTP endpoint.'),
  enabled: z.boolean().default(true).description('Whether this server should be connected.'),
  url: z.string().default('').description('Streamable HTTP endpoint URL.'),
  command: z.string().default('').description('stdio executable.'),
  args: z.array(z.string()).default([]).description('stdio arguments.'),
  cwd: z.string().default('').description('stdio working directory; empty uses the Host directory.'),
  credentialRef: z
    .string()
    .role('credential-ref')
    .default('')
    .description('Credential reference (environment-variable name) the connection authenticates with.'),
  credentialHeader: z
    .string()
    .default('Authorization')
    .description('HTTP header that carries the credential.'),
  credentialScheme: z
    .string()
    .default('Bearer')
    .description('Prefix before the credential value, usually "Bearer"; empty sends the raw value.'),
  toolCallTimeoutMs: z
    .number()
    .step(1)
    .min(1)
    .default(DEFAULT_TOOL_CALL_TIMEOUT_MS)
    .description('Timeout for one tool call or resource request, in milliseconds.'),
  failOnStartupError: z
    .boolean()
    .default(false)
    .description('Whether an initial connection failure should reject activation instead of retrying.'),
})

/** Live-form configuration: only the server list, so the whole list is one editable field. */
export const Config = z.object({
  servers: z.array(Server).default([]).volatile().description('Configured MCP servers.'),
})

/** Loader diagnostics name for this plugin. */
export const name = '@local/dsh-mcp-servers'
/** This plugin only reads the config tree it derives entries into. */
export const inject = ['loader']

/** Render one thrown value as a diagnostic line. */
function messageOf(error) {
  if (error instanceof Error) return error.message
  return String(error)
}

/** The settings document's current server list. */
function readServers(serversRef) {
  if (serversRef === undefined || typeof serversRef.get !== 'function') return []
  const value = serversRef.get()
  return Array.isArray(value) ? value : []
}

/** Normalize one stored server and report the first reason it cannot be derived. */
function normalizeServer(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'server entry is not an object' }
  }
  const serverName = typeof raw.serverName === 'string' ? raw.serverName : ''
  if (!SERVER_NAME_PATTERN.test(serverName)) {
    return { error: `serverName ${JSON.stringify(serverName)} must match ${String(SERVER_NAME_PATTERN)}` }
  }
  const transport = raw.transport === 'stdio' || raw.transport === 'streamable-http' ? raw.transport : undefined
  if (transport === undefined) {
    return { error: `server "${serverName}": transport must be "stdio" or "streamable-http"` }
  }
  const toolCallTimeoutMs =
    typeof raw.toolCallTimeoutMs === 'number' && Number.isFinite(raw.toolCallTimeoutMs) && raw.toolCallTimeoutMs >= 1
      ? Math.floor(raw.toolCallTimeoutMs)
      : DEFAULT_TOOL_CALL_TIMEOUT_MS
  const credentialRef = typeof raw.credentialRef === 'string' ? raw.credentialRef : ''
  if (credentialRef !== '' && !CREDENTIAL_REF_PATTERN.test(credentialRef)) {
    return { error: `server "${serverName}": credentialRef must be an environment-variable name` }
  }
  const server = {
    serverName,
    transport,
    enabled: raw.enabled !== false,
    url: typeof raw.url === 'string' ? raw.url : '',
    command: typeof raw.command === 'string' ? raw.command : '',
    args: Array.isArray(raw.args) ? raw.args.filter((arg) => typeof arg === 'string') : [],
    cwd: typeof raw.cwd === 'string' ? raw.cwd : '',
    credentialRef,
    credentialHeader: typeof raw.credentialHeader === 'string' && raw.credentialHeader !== '' ? raw.credentialHeader : 'Authorization',
    credentialScheme: typeof raw.credentialScheme === 'string' ? raw.credentialScheme : 'Bearer',
    toolCallTimeoutMs,
    failOnStartupError: raw.failOnStartupError === true,
  }
  if (transport === 'stdio') {
    if (server.command.trim() === '') return { error: `server "${serverName}": stdio transport requires a command` }
  } else {
    let parsed
    try {
      parsed = new URL(server.url)
    } catch {
      return { error: `server "${serverName}": url is not a valid absolute URL` }
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { error: `server "${serverName}": url must use http or https` }
    }
  }
  return { server }
}

/** Build the `dsh-mcp-client` Loader config for one normalized server and its resolved credential. */
function clientConfigOf(server, credentialValue) {
  const base = {
    serverName: server.serverName,
    toolCallTimeoutMs: server.toolCallTimeoutMs,
    failOnStartupError: server.failOnStartupError,
  }
  if (server.transport === 'stdio') {
    return {
      ...base,
      transport: 'stdio',
      command: server.command,
      args: [...server.args],
      cwd: server.cwd,
      env:
        server.credentialRef !== '' && credentialValue !== undefined
          ? { [server.credentialRef]: credentialValue }
          : {},
    }
  }
  const headerValue =
    credentialValue === undefined
      ? undefined
      : server.credentialScheme.trim() === ''
        ? credentialValue
        : `${server.credentialScheme.trim()} ${credentialValue}`
  return {
    ...base,
    transport: 'streamable-http',
    url: server.url,
    headers:
      server.credentialRef !== '' && headerValue !== undefined
        ? { [server.credentialHeader]: headerValue }
        : {},
  }
}

/** Identity of one applied derivation; a change means the derived entry must reload. */
function fingerprintOf(server, credentialValue) {
  return JSON.stringify([server, credentialValue === undefined ? null : credentialValue])
}

/** The root-tree entry id one server derives into. */
function entryIdOf(serverName) {
  return ENTRY_PREFIX + serverName
}

/** Register the Host body. */
export function apply(ctx, config) {
  const serversRef = config.servers
  /** Derived ids whose entry currently exists (or was attempted) with this fingerprint. */
  const applied = new Map()
  /** Latest derivation failure per server name, for the status projection. */
  const failures = new Map()
  let serial = Promise.resolve()
  let pendingWork = 0
  let disposed = false

  /** Resolve one server's credential through the Host credentials seam, if it needs one. */
  async function credentialFor(server) {
    if (server.credentialRef === '') return undefined
    const credentials = ctx.get('credentials')
    if (credentials === undefined) {
      const fromEnvironment = process.env[server.credentialRef]
      return typeof fromEnvironment === 'string' && fromEnvironment.length > 0 ? fromEnvironment : undefined
    }
    try {
      const resolved = await credentials.resolve(server.credentialRef)
      return resolved !== undefined && typeof resolved.value === 'string' && resolved.value.length > 0
        ? resolved.value
        : undefined
    } catch (error) {
      ctx.logger.warn('mcp-servers: resolving credential %s failed: %s', server.credentialRef, messageOf(error))
      return undefined
    }
  }

  /** Every non-derived Loader entry that already serves one of these server names. */
  function foreignServerNames() {
    const conflicts = new Map()
    for (const entry of ctx.loader.entries()) {
      const id = entry.options?.id
      if (typeof id !== 'string' || id.startsWith(ENTRY_PREFIX)) continue
      if (entry.options?.name !== MCP_CLIENT_PLUGIN) continue
      const serverName = entry.options?.config?.serverName
      if (typeof serverName === 'string' && serverName.length > 0 && !conflicts.has(serverName)) {
        conflicts.set(serverName, entry.id)
      }
    }
    return conflicts
  }

  /** Live root-tree entries this plugin derives. */
  function derivedEntries() {
    const entries = []
    for (const entry of ctx.loader.entries()) {
      if (entry.parent !== ctx.loader.root) continue
      const id = entry.options?.id
      if (typeof id === 'string' && id.startsWith(ENTRY_PREFIX) && entry.options?.name === MCP_CLIENT_PLUGIN) {
        entries.push(entry)
      }
    }
    return entries
  }

  /** Resolve one derived entry, or undefined when it is absent. */
  function derivedEntry(id) {
    try {
      const entry = ctx.loader.resolve(id)
      return entry.parent === ctx.loader.root ? entry : undefined
    } catch {
      return undefined
    }
  }

  /** Stop and delete one derived entry without letting a stale handle throw. */
  async function removeDerived(id) {
    try {
      if (derivedEntry(id) === undefined) return
      await ctx.loader.remove(id)
      ctx.logger.info('mcp-servers: stopped %s', id)
    } catch (error) {
      ctx.logger.warn('mcp-servers: stopping %s failed: %s', id, messageOf(error))
    }
  }

  /** Reconcile the derived Loader entries with the settings document. */
  async function reconcileOnce() {
    if (disposed) return
    const servers = readServers(serversRef)
    const conflicts = foreignServerNames()
    const desired = new Map()
    const reserved = new Set()
    for (const raw of servers) {
      const normalized = normalizeServer(raw)
      if (normalized.error !== undefined) continue
      const server = normalized.server
      if (!server.enabled) continue
      if (reserved.has(server.serverName)) {
        failures.set(server.serverName, `serverName "${server.serverName}" is declared more than once`)
        continue
      }
      reserved.add(server.serverName)
      if (conflicts.has(server.serverName)) {
        failures.set(
          server.serverName,
          `serverName "${server.serverName}" is already served by Loader entry "${conflicts.get(server.serverName)}"; remove that row and this page takes over automatically`,
        )
        continue
      }
      const credentialValue = await credentialFor(server)
      const id = entryIdOf(server.serverName)
      desired.set(id, {
        server,
        config: clientConfigOf(server, credentialValue),
        fingerprint: fingerprintOf(server, credentialValue),
      })
      failures.delete(server.serverName)
    }

    for (const [id] of applied) {
      if (desired.has(id)) continue
      await removeDerived(id)
      applied.delete(id)
    }
    for (const entry of derivedEntries()) {
      const id = entry.options.id
      if (desired.has(id)) continue
      await removeDerived(id)
      applied.delete(id)
    }

    for (const [id, want] of desired) {
      const existing = derivedEntry(id)
      try {
        if (existing === undefined) {
          await ctx.loader.create({ id, name: MCP_CLIENT_PLUGIN, config: want.config })
          ctx.logger.info('mcp-servers: started %s (%s)', want.server.serverName, want.server.transport)
        } else if (applied.get(id) !== want.fingerprint) {
          await ctx.loader.update(id, { config: want.config })
          ctx.logger.info('mcp-servers: reloaded %s', want.server.serverName)
        }
        applied.set(id, want.fingerprint)
        failures.delete(want.server.serverName)
      } catch (error) {
        // Keep the fingerprint: a credential or config change is what retries.
        applied.set(id, want.fingerprint)
        failures.set(want.server.serverName, messageOf(error))
        ctx.logger.warn('mcp-servers: starting %s failed: %s', want.server.serverName, messageOf(error))
      }
    }
  }

  /** Queue one reconcile; concurrent callers share the serial chain. */
  function reconcile() {
    if (disposed) return Promise.resolve()
    pendingWork += 1
    const run = serial.then(() => reconcileOnce()).catch((error) => {
      ctx.logger.warn('mcp-servers: reconcile failed: %s', messageOf(error))
    })
    serial = run.then(() => {
      pendingWork -= 1
    })
    return run
  }

  /** Tool schemas currently visible to the Host tool registry. */
  function toolSchemas() {
    const tools = ctx.get('tools')
    if (tools === undefined) return []
    try {
      const schemas = tools.schemas()
      return Array.isArray(schemas) ? schemas : []
    } catch {
      return []
    }
  }

  /** Tools a live MCP client entry registered under one server namespace. */
  function toolCountOf(serverName, schemas) {
    const prefix = `mcp__${serverName}__`
    let count = 0
    for (const schema of schemas) {
      if (typeof schema?.name === 'string' && schema.name.startsWith(prefix)) count += 1
    }
    return count
  }

  /** Credential presence and provenance for one server. */
  async function credentialInfo(raw) {    const ref = typeof raw?.credentialRef === 'string' ? raw.credentialRef : ''
    if (ref === '') return { ref: '', required: false, configured: true, writable: false }
    const credentials = ctx.get('credentials')
    if (credentials === undefined) {
      const value = process.env[ref]
      return {
        ref,
        required: true,
        configured: typeof value === 'string' && value.length > 0,
        writable: false,
      }
    }
    try {
      const info = await credentials.describe(ref)
      return {
        ref,
        required: true,
        configured: info?.configured === true,
        writable: info?.writable === true,
        ...(typeof info?.source === 'string' ? { source: info.source } : {}),
      }
    } catch (error) {
      return { ref, required: true, configured: false, writable: false, error: messageOf(error) }
    }
  }

  /** Cached server versions; a miss is retried sooner than a hit. */
  const versionCache = new Map()
  const VERSION_HIT_TTL_MS = 10 * 60_000
  const VERSION_MISS_TTL_MS = 60_000
  const VERSION_TIMEOUT_MS = 8000
  const INITIALIZE_REQUEST = {
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'dsh-mcp-servers-probe', version: '0.0.0' },
    },
  }

  /** The `data:` payload of a single-frame SSE response, if any. */
  function sseDataPayload(text) {
    for (const line of text.split('\n')) {
      if (line.startsWith('data:')) return line.slice(5).trim()
    }
    return undefined
  }

  /** serverInfo.version from an initialize response body, or undefined. */
  function versionOfResponse(text) {
    try {
      const payload = sseDataPayload(text)
      const message = JSON.parse(payload === undefined ? text : payload)
      const version = message?.result?.serverInfo?.version
      return typeof version === 'string' && version !== '' ? version : undefined
    } catch {
      return undefined
    }
  }

  /** Negotiate one streamable-http server's version with a single initialize call. */
  async function probeHttpVersion(server) {
    const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }
    if (server.credentialRef !== '') {
      const value = await credentialFor(server)
      if (value !== undefined) {
        headers[server.credentialHeader] = server.credentialScheme === '' ? value : `${server.credentialScheme} ${value}`
      }
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), VERSION_TIMEOUT_MS)
    try {
      const response = await fetch(server.url, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify(INITIALIZE_REQUEST),
      })
      return versionOfResponse(await response.text())
    } finally {
      clearTimeout(timer)
    }
  }

  /** Negotiate one stdio server's version by spawning it and reading one initialize reply. */
  function probeStdioVersion(server) {
    return new Promise((resolve) => {
      let child
      let pending = ''
      let settled = false
      const finish = (value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        try {
          child?.kill('SIGKILL')
        } catch {}
        resolve(value)
      }
      const timer = setTimeout(() => finish(undefined), VERSION_TIMEOUT_MS)
      try {
        child = spawn(server.command, server.args, {
          cwd: server.cwd === '' ? undefined : server.cwd,
          stdio: ['pipe', 'pipe', 'ignore'],
        })
      } catch {
        finish(undefined)
        return
      }
      child.on('error', () => finish(undefined))
      child.stdout.on('data', (chunk) => {
        pending += chunk
        for (const line of pending.split('\n')) {
          const version = versionOfResponse(line)
          if (version !== undefined) finish(version)
        }
      })
      child.stdin.write(`${JSON.stringify(INITIALIZE_REQUEST)}\n`)
    })
  }

  /** One server's advertised version, probed on cache miss. */
  async function probeVersion(raw) {
    const serverName = typeof raw?.serverName === 'string' ? raw.serverName : ''
    if (serverName === '') return undefined
    const cached = versionCache.get(serverName)
    if (cached !== undefined) {
      const ttl = cached.version === undefined ? VERSION_MISS_TTL_MS : VERSION_HIT_TTL_MS
      if (Date.now() - cached.checkedAt < ttl) return cached.version
    }
    const normalized = normalizeServer(raw)
    if (normalized.error !== undefined) return undefined
    let version
    try {
      version =
        normalized.server.transport === 'stdio'
          ? await probeStdioVersion(normalized.server)
          : await probeHttpVersion(normalized.server)
    } catch (error) {
      ctx.logger.warn('mcp-servers: probing %s version failed: %s', serverName, messageOf(error))
      version = undefined
    }
    versionCache.set(serverName, { version, checkedAt: Date.now() })
    return version
  }

  /** The live status projection the settings page polls. */
  async function statusSnapshot() {
    const servers = readServers(serversRef)
    const conflicts = foreignServerNames()
    const schemas = toolSchemas()
    const rows = []
    for (const raw of servers) {
      const normalized = normalizeServer(raw)
      const serverName = typeof raw?.serverName === 'string' ? raw.serverName : ''
      const transport = raw?.transport === 'stdio' ? 'stdio' : 'streamable-http'
      const enabled = raw?.enabled !== false
      const id = serverName === '' ? '' : entryIdOf(serverName)
      const entry = id === '' ? undefined : derivedEntry(id)
      let phase
      let error
      if (normalized.error !== undefined) {
        phase = 'invalid'
        error = normalized.error
      } else if (!enabled) {
        phase = 'disabled'
      } else if (conflicts.has(serverName)) {
        phase = 'conflict'
        error = failures.get(serverName)
      } else if (entry === undefined) {
        phase = 'missing'
        error = failures.get(serverName)
      } else if (entry.disabled) {
        phase = 'disabled'
      } else {
        const fiberState = entry.fiber?.state
        if (fiberState === FIBER_STATE.ACTIVE) phase = 'active'
        else if (fiberState === FIBER_STATE.FAILED) {
          phase = 'failed'
          error = messageOf(entry.fiber?._error ?? failures.get(serverName) ?? 'connection failed')
        } else if (
          fiberState === FIBER_STATE.PENDING ||
          fiberState === FIBER_STATE.LOADING ||
          fiberState === FIBER_STATE.UNLOADING
        ) {
          phase = 'connecting'
        } else {
          phase = 'missing'
          error = failures.get(serverName)
        }
      }
      rows.push({
        serverName,
        entryId: id,
        transport,
        enabled,
        phase,
        toolCount: phase === 'active' ? toolCountOf(serverName, schemas) : 0,
        ...(error === undefined ? {} : { error }),
        credential: await credentialInfo(raw),
      })
    }
    await Promise.all(
      rows.map(async (row) => {
        if (row.enabled === false || row.phase === 'invalid') return
        const raw = servers.find((candidate) => candidate?.serverName === row.serverName)
        if (raw === undefined) return
        const version = await probeVersion(raw)
        if (version !== undefined) row.version = version
      }),
    )
    return {
      servers: rows,
      totalTools: rows.reduce((total, row) => total + row.toolCount, 0),
      pending: pendingWork > 0,
      checkedAt: Date.now(),
    }
  }

  ctx.effect(() => {
    const timer = setInterval(() => {
      void reconcile()
    }, RECONCILE_INTERVAL_MS)
    const onVolatile = () => {
      void reconcile()
    }
    const onCredential = () => {
      void reconcile()
    }
    ctx.on('loader/volatile-update', onVolatile)
    ctx.on('credentials/reference-updated', onCredential, { global: true })
    void reconcile()
    return () => {
      disposed = true
      clearInterval(timer)
      for (const [id] of applied) {
        try {
          if (derivedEntry(id) !== undefined) ctx.loader.remove(id)
        } catch (error) {
          ctx.logger.warn('mcp-servers: disposing %s failed: %s', id, messageOf(error))
        }
      }
      applied.clear()
    }
  }, 'mcp-servers: derived entries')

  // The live-state endpoint exists only where a browser carrier supplies both
  // the connection trust fence and an HTTP server to claim a route on.
  ctx.inject(['connection', 'webServer'], (webCtx) => {
    webCtx.effect(() => {
      const route = {
        kind: 'exact',
        path: STATUS_ROUTE,
        handler: async (request, response) => {
          const rejection = webCtx.connection.requestRejection(request)
          if (rejection !== undefined) {
            response.writeHead(rejection, { 'content-type': 'text/plain; charset=utf-8' })
            response.end(rejection === 401 ? 'unauthorized' : 'forbidden')
            return
          }
          if (request.method !== 'POST') {
            response.writeHead(405, { allow: 'POST', 'content-type': 'text/plain; charset=utf-8' })
            response.end('method not allowed')
            return
          }
          let body = ''
          try {
            for await (const chunk of request) {
              body += chunk
              if (body.length > STATUS_REQUEST_LIMIT) throw new Error('request body too large')
            }
          } catch (error) {
            response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
            response.end(messageOf(error))
            return
          }
          let action
          try {
            action = (body === '' ? {} : JSON.parse(body))?.action
          } catch {
            response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
            response.end('request body is not JSON')
            return
          }
          if (action !== 'status') {
            response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
            response.end('unknown action')
            return
          }
          try {
            const value = await statusSnapshot()
            response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(JSON.stringify({ ok: true, value }))
          } catch (error) {
            response.writeHead(500, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(JSON.stringify({ ok: false, error: { message: messageOf(error) } }))
          }
        },
      }
      const dispose = webCtx.webServer.register(route)
      return dispose
    }, 'mcp-servers: status route')
  })
}
