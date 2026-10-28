window.__ModuleLoader__.load({
  id: '@local/dsh-mcp-servers',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    //#region constants
    /** Locale namespace owned by this page. */
    const NS = 'mcpServers'

    /** Plugin version; keep in sync with package.json. */
    const PLUGIN_VERSION = '0.1.0'
    /** Host entry id: the settings namespace this page edits. */
    const ENTRY_ID = 'mcp-servers'
    /** Sidebar panel id and `main` slot key of the top-level MCP page. */
    const PANEL_ID = 'mcp'
    /** Host HTTP route that answers live connection state. */
    const STATUS_ROUTE = '/plugin-mcp-servers/status'
    /** Page refresh interval for the live status projection. */
    const STATUS_POLL_MS = 5000
    /** `serverName` grammar the Host accepts. */
    const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/
    /** Environment-variable spelling the Host accepts as a credential reference. */
    const CREDENTIAL_REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
    /** Empty live projection before the first poll answers. */
    const IDLE_LIVE = { status: 'idle', servers: [], totalTools: 0, pending: false }
    //#endregion

    //#region locale dictionaries
    const en = {
      panel: 'MCP',
      title: 'MCP servers',
      description: 'Connect the agent to Model Context Protocol servers and manage the tools they expose.',
      addServer: 'Add server',
      edit: 'Edit',
      back: 'Back',
      refresh: 'Refresh',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Saved.',
      discard: 'Discard changes',
      reset: 'Reset to default',
      unsaved: 'Unsaved changes',
      customized: 'Customized',
      readOnly: 'This deployment stores settings read-only.',
      unavailable: 'This plugin is not loaded, so it cannot be configured right now.',
      loading: 'Loading configuration…',
      liveError: 'Could not read the live connection state.',
      retry: 'Retry',
      saveFailed: 'The deployment did not accept these values, so nothing was saved. Review the fields and try again.',
      noServers: 'No MCP servers configured',
      noServersHint: 'Add a server to make its tools available to the agent.',
      unnamed: 'unnamed',
      removeServer: 'Remove server',
      serverName: 'Name',
      serverNameHint: 'Prefix of the tool names: mcp__<name>__<tool>.',
      transport: 'Transport',
      transportStdio: 'stdio (local command)',
      transportHttp: 'Streamable HTTP',
      transportStdioShort: 'stdio',
      transportHttpShort: 'HTTP',
      enabled: 'Enabled',
      url: 'Endpoint URL',
      urlHint: 'Streamable HTTP endpoint, usually ending in /mcp.',
      command: 'Command',
      commandHint: 'Executable the Host starts for a stdio server.',
      args: 'Arguments',
      argsHint: 'One argument per line.',
      cwd: 'Working directory',
      cwdHint: 'Leave empty to use the Host working directory.',
      credentialRef: 'Credential reference',
      credentialRefHint: 'An environment variable name; the settings file never stores the secret itself.',
      credentialConfigured: 'Key configured',
      credentialMissing: 'Key missing',
      credentialNotRequired: 'No credential',
      credentialHeader: 'Credential header',
      credentialScheme: 'Value prefix',
      credentialSchemeHint: '"Bearer" sends "Bearer <token>"; leave empty to send the raw value.',
      setCredential: 'Save key',
      credentialPlaceholder: 'Paste the API key',
      credentialHint: 'Stored in the Host credential file, not in the settings document.',
      timeout: 'Tool timeout (ms)',
      timeoutHint: 'Timeout for one tool call or resource request.',
      failOnStartupError: 'Stop retrying on startup failure',
      failOnStartupErrorHint:
        'On: after a failed startup or tool sync the server is marked failed and stops retrying. Off (default): keep retrying in the background.',
      advanced: 'Advanced',
      phaseActive: 'Connected',
      phaseConnecting: 'Connecting…',
      phaseFailed: 'Connection failed',
      phaseMissing: 'Not started',
      phaseDisabled: 'Disabled',
      phaseConflict: 'Name conflict',
      phaseInvalid: 'Incomplete configuration',
      phaseUnknown: 'Unknown state',
      toolsCount: '{count} tools',
      statusSummary: '{active}/{count} connected · {tools} tools',
      serverCount: '{count} servers',
      invalidName: 'Enter a name of 1–32 letters, digits, "-" or "_".',
      invalidDuplicate: 'Two servers cannot share a name.',
      invalidUrl: 'Enter an absolute http(s) URL.',
      invalidCommand: 'A stdio server needs a command.',
      invalidTimeout: 'Enter a timeout of at least 1 ms.',
      keyInvalid: 'Environment variable names use letters, digits and "_", and must not start with a digit.',
      pending: 'Applying changes…',
    }
    const zh = {
      panel: 'MCP',
      title: 'MCP 服务器',
      description: '为 Agent 接入 Model Context Protocol 服务器，并管理它们提供的工具。',
      addServer: '添加服务器',
      edit: '编辑',
      back: '返回',
      refresh: '刷新',
      save: '保存',
      saving: '保存中…',
      saved: '已保存。',
      discard: '放弃修改',
      reset: '恢复默认',
      unsaved: '有未保存的修改',
      customized: '已自定义',
      readOnly: '本部署的设置为只读。',
      unavailable: '该插件当前未加载，暂时无法配置。',
      loading: '正在读取配置…',
      liveError: '无法读取实时连接状态。',
      retry: '重试',
      saveFailed: '本部署没有接受这些值，未保存任何修改。请检查字段后重试。',
      noServers: '还没有配置 MCP 服务器',
      noServersHint: '添加一个服务器，把它提供的工具交给 Agent 使用。',
      unnamed: '未命名',
      removeServer: '删除服务器',
      serverName: '名称',
      serverNameHint: '工具名前缀：mcp__<名称>__<工具>。',
      transport: '传输方式',
      transportStdio: 'stdio（本地命令）',
      transportHttp: 'Streamable HTTP',
      transportStdioShort: 'stdio',
      transportHttpShort: 'HTTP',
      enabled: '启用',
      url: '接口地址',
      urlHint: 'Streamable HTTP 端点，通常以 /mcp 结尾。',
      command: '命令',
      commandHint: 'stdio 服务器由 Host 启动的可执行文件。',
      args: '参数',
      argsHint: '每行一个参数。',
      cwd: '工作目录',
      cwdHint: '留空表示使用 Host 的工作目录。',
      credentialRef: '凭据引用',
      credentialRefHint: '填写环境变量名；设置文件不会保存密钥本身。',
      credentialConfigured: '已配置密钥',
      credentialMissing: '缺少密钥',
      credentialNotRequired: '无需凭据',
      credentialHeader: '凭据请求头',
      credentialScheme: '值前缀',
      credentialSchemeHint: '“Bearer” 发送 “Bearer <token>”；留空表示直接发送原值。',
      setCredential: '保存密钥',
      credentialPlaceholder: '粘贴 API Key',
      credentialHint: '保存在 Host 凭据文件中，不会写入设置文件。',
      timeout: '工具超时（毫秒）',
      timeoutHint: '单次工具调用或资源请求的超时时间。',
      failOnStartupError: '启动失败时停止重试',
      failOnStartupErrorHint:
        '开启：启动或同步工具失败后，该服务器标记为失败并不再重试；关闭（默认）：保持后台自动重试。',
      advanced: '高级',
      phaseActive: '已连接',
      phaseConnecting: '连接中…',
      phaseFailed: '连接失败',
      phaseMissing: '未启动',
      phaseDisabled: '已停用',
      phaseConflict: '名称冲突',
      phaseInvalid: '配置不完整',
      phaseUnknown: '未知状态',
      toolsCount: '{count} 个工具',
      statusSummary: '{active}/{count} 已连接 · {tools} 个工具',
      serverCount: '{count} 个服务器',
      invalidName: '名称须为 1–32 个字母、数字、"-" 或 "_"。',
      invalidDuplicate: '两个服务器不能同名。',
      invalidUrl: '请填写 http(s) 绝对地址。',
      invalidCommand: 'stdio 服务器必须填写命令。',
      invalidTimeout: '超时须为不小于 1 的整数毫秒。',
      keyInvalid: '环境变量名只能包含字母、数字和 "_"，且不能以数字开头。',
      pending: '正在应用变更…',
    }
    //#endregion

    //#region styles
    const STYLES = `
      .mcp-page{display:flex;flex-direction:column;width:100%;min-width:0;height:100%;min-height:0;overflow:hidden;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}
      .mcp-detail{flex:1;min-width:0;overflow:auto;padding:20px clamp(24px,4vw,48px) 48px;display:flex;flex-direction:column;gap:16px}
      .mcp-detailHead{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .mcp-detailTitle{font-size:16px;font-weight:500;line-height:24px;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
      .mcp-spacer{flex:1 1 auto;min-width:0}
      .mcp-chip{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 8px;font-size:11px;line-height:17px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
      .mcp-chip[data-tone=ok]{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 45%,transparent)}
      .mcp-chip[data-tone=warn]{color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 45%,transparent)}
      .mcp-chip[data-tone=error]{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent)}
      .mcp-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}
      .mcp-dot[data-phase=active]{background:var(--dsw-alias-state-success-primary)}
      .mcp-dot[data-phase=connecting]{background:var(--dsw-alias-state-warn-primary)}
      .mcp-dot[data-phase=failed],.mcp-dot[data-phase=invalid],.mcp-dot[data-phase=conflict]{background:var(--dsw-alias-state-error-primary)}
      .mcp-button{box-sizing:border-box;height:32px;padding:0 12px;border-radius:var(--dsw-radius-md,8px);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;flex:none}
      .mcp-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
      .mcp-button:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}
      .mcp-button:disabled{opacity:.5;cursor:default}
      .mcp-button-primary{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground,#fff)}
      .mcp-button-primary:hover:not(:disabled){background:var(--dsw-alias-brand-primary);filter:brightness(1.06)}
      .mcp-button-ghost{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary)}
      .mcp-button-ghost:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .mcp-button-danger{border-color:transparent;background:transparent;color:var(--dsw-alias-state-error-primary)}
      .mcp-button-danger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}
      .mcp-button-sm{height:28px;padding:0 10px;font-size:12px;line-height:18px}
      .mcp-notice{margin:0;padding:8px 10px;border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;overflow-wrap:anywhere}
      .mcp-notice[data-tone=error]{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent)}
      .mcp-notice[data-tone=success]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,transparent)}
      .mcp-panel{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,12px);background:var(--dsw-alias-bg-layer-1);padding:14px 16px;display:flex;flex-direction:column;gap:12px;min-width:0}
      .mcp-statusRow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);min-width:0}
      .mcp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px}
      .mcp-wide{grid-column:1 / -1}
      .mcp-field{display:flex;flex-direction:column;gap:4px;min-width:0}
      .mcp-label{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:17px}
      .mcp-hint{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:15px;opacity:.85;overflow-wrap:anywhere}
      .mcp-error{margin:0;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;overflow-wrap:anywhere}
      .mcp-input,.mcp-select,.mcp-textarea{box-sizing:border-box;width:100%;padding:0 10px;border-radius:var(--dsw-radius-md,8px);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;outline:none;min-width:0}
      .mcp-input,.mcp-select{height:32px}
      .mcp-textarea{padding:6px 10px;resize:vertical;min-height:60px;font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px}
      .mcp-select{cursor:pointer;padding-right:6px}
      .mcp-input:focus,.mcp-select:focus,.mcp-textarea:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent)}
      .mcp-input:disabled,.mcp-select:disabled,.mcp-textarea:disabled{opacity:.6;cursor:default}
      .mcp-input[aria-invalid=true],.mcp-textarea[aria-invalid=true]{border-color:var(--dsw-alias-state-error-primary);box-shadow:none}
      .mcp-toggleRow{display:flex;align-items:center;justify-content:space-between;gap:12px;box-sizing:border-box;min-height:32px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md,8px);padding:4px 10px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:12px}
      .mcp-toggle{position:relative;flex:none;width:34px;height:20px;border:.5px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0;background:var(--dsw-alias-bg-layer-2);cursor:pointer;transition:background .15s ease}
      .mcp-toggle:disabled{opacity:.5;cursor:default}
      .mcp-toggle[data-on=true]{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
      .mcp-toggle:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:2px}
      .mcp-toggleThumb{position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s ease}
      .mcp-toggle[data-on=true] .mcp-toggleThumb{transform:translateX(14px)}
      .mcp-dd{position:relative;min-width:0}
      .mcp-ddTrigger{display:flex;align-items:center;gap:6px;text-align:left;cursor:pointer;padding-right:8px}
      .mcp-ddTrigger:disabled{cursor:default}
      .mcp-ddValue{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .mcp-ddChevron{flex:none;opacity:.7}
      .mcp-ddMenu{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:40;display:flex;flex-direction:column;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-1);box-shadow:0 10px 28px rgba(0,0,0,.18);overflow:hidden;min-width:0}
      .mcp-ddItem{display:flex;align-items:center;gap:8px;padding:7px 10px;border:0;background:transparent;color:inherit;font:inherit;font-size:13px;line-height:20px;text-align:left;cursor:pointer}
      .mcp-ddItem:hover{background:var(--dsw-alias-interactive-bg-hover)}
      .mcp-ddItem[aria-selected=true]{color:var(--dsw-alias-brand-primary)}
      .mcp-ddCheck{width:14px;flex:none;text-align:center}
      .mcp-credentialRow{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .mcp-credentialRow .mcp-input{flex:1 1 220px;width:auto}
      .mcp-empty{border:.5px dashed var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,12px);padding:36px 24px;text-align:center;color:var(--dsw-alias-label-secondary);display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;flex:1;min-height:200px}
      .mcp-emptyTitle{margin:0;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:20px}
      .mcp-emptyHint{margin:0;font-size:12px;line-height:18px}
      .mcp-foot{flex:none;display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;padding:12px clamp(24px,4vw,48px);border-top:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base)}
      .mcp-footStatus{flex:1 1 auto;min-width:0;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
      .mcp-advanced{border-top:.5px solid var(--dsw-alias-border-l2);padding-top:12px;display:flex;flex-direction:column;gap:10px}
      .mcp-advancedTitle{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:17px}
      .mcp-compactHead{flex:none;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:14px 20px 0}
      .mcp-compactTitle{margin:0;font-size:15px;font-weight:500;line-height:22px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .mcp-version{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:11px;line-height:22px;font-weight:400;white-space:nowrap}
      .mcp-compactBody{flex:1;min-height:0;overflow:auto;padding:12px 20px 16px;display:flex;flex-direction:column;gap:10px}
      .mcp-table{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,12px);background:var(--dsw-alias-bg-layer-1);overflow:hidden;display:flex;flex-direction:column}
      .mcp-tableRow{box-sizing:border-box;display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:4px 14px;border:0;border-bottom:.5px solid var(--dsw-alias-border-l2);background:transparent;color:inherit;font:inherit;font-size:13px;line-height:20px;text-align:left;cursor:pointer}
      .mcp-tableRow:last-child{border-bottom:0}
      .mcp-tableRow:hover{background:var(--dsw-alias-interactive-bg-hover)}
      .mcp-tableRow:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:-2px}
      .mcp-tableName{font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .mcp-tableMeta{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:17px;white-space:nowrap}
      .mcp-tableEdit{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:17px;flex:none}
      .mcp-page[data-compact=true] .mcp-detail{padding:12px 20px 20px}
      .mcp-page[data-compact=true] .mcp-foot{padding:10px 20px}
      @media (max-width:820px){.mcp-grid{grid-template-columns:minmax(0,1fr)}}
    `
    /** Attach this page's stylesheet once; returns its remover. */
    function attachStyles() {
      if (typeof document === 'undefined') return () => {}
      const existing = document.querySelector('style[data-mcp-servers-style]')
      if (existing !== null) existing.remove()
      const tag = document.createElement('style')
      tag.setAttribute('data-mcp-servers-style', '')
      tag.textContent = STYLES
      document.head.appendChild(tag)
      return () => {
        tag.remove()
      }
    }
    //#endregion

    //#region data helpers
    /** Deep copy JSON-shaped page data. */
    function cloneJson(value) {
      return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
    }

    /** One server row with every editable field present, in the Host schema's order. */
    function normalizeServer(raw) {
      const source = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
      return {
        serverName: typeof source.serverName === 'string' ? source.serverName : '',
        transport: source.transport === 'stdio' ? 'stdio' : 'streamable-http',
        enabled: source.enabled !== false,
        url: typeof source.url === 'string' ? source.url : '',
        command: typeof source.command === 'string' ? source.command : '',
        args: Array.isArray(source.args) ? source.args.filter((arg) => typeof arg === 'string') : [],
        cwd: typeof source.cwd === 'string' ? source.cwd : '',
        credentialRef: typeof source.credentialRef === 'string' ? source.credentialRef : '',
        credentialHeader:
          typeof source.credentialHeader === 'string' && source.credentialHeader !== '' ? source.credentialHeader : 'Authorization',
        credentialScheme: typeof source.credentialScheme === 'string' ? source.credentialScheme : 'Bearer',
        toolCallTimeoutMs:
          typeof source.toolCallTimeoutMs === 'number' && Number.isFinite(source.toolCallTimeoutMs) && source.toolCallTimeoutMs >= 1
            ? Math.floor(source.toolCallTimeoutMs)
            : 120000,
        failOnStartupError: source.failOnStartupError === true,
      }
    }

    /** Normalize a whole server list. */
    function normalizeServers(value) {
      return Array.isArray(value) ? value.map(normalizeServer) : []
    }

    /** A new, valid-enough row so the editor opens on an actionable state. */
    function newServer(rows) {
      const used = new Set(rows.map((row) => row.serverName))
      let index = rows.length + 1
      while (used.has(`server${index}`)) index += 1
      return { ...normalizeServer({ serverName: `server${index}`, transport: 'streamable-http' }), _saved: false }
    }

    /** The page's own validation, mirroring the Host's derivation rules. */
    function validateServers(rows) {
      const names = new Set()
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index]
        if (!SERVER_NAME_PATTERN.test(row.serverName)) return { ok: false, error: 'invalidName', index }
        if (names.has(row.serverName)) return { ok: false, error: 'invalidDuplicate', index }
        names.add(row.serverName)
        if (row.transport === 'stdio') {
          if (row.command.trim() === '') return { ok: false, error: 'invalidCommand', index }
        } else if (!/^https?:\/\//i.test(row.url.trim())) {
          return { ok: false, error: 'invalidUrl', index }
        }
        const timeout = Number(row.toolCallTimeoutMs)
        if (!Number.isFinite(timeout) || timeout < 1) return { ok: false, error: 'invalidTimeout', index }
        if (row.credentialRef !== '' && !CREDENTIAL_REF_PATTERN.test(row.credentialRef)) {
          return { ok: false, error: 'keyInvalid', index }
        }
      }
      return { ok: true }
    }

    /** Normalized lamp phase: grey when off, red when unreachable or unusable, green only when serving tools. */
    function serverPhase(server, status) {
      if (server.enabled === false) return 'disabled'
      if (status === undefined) return 'missing'
      if (status.phase === 'active') {
        const credMissing = status.credential?.required === true && status.credential?.configured !== true
        if (credMissing || (status.toolCount ?? 0) === 0) return 'failed'
        return 'active'
      }
      return status.phase
    }

    /** A localized phase label. */
    function phaseLabel(t, phase) {
      switch (phase) {
        case 'active':
          return t('phaseActive')
        case 'connecting':
          return t('phaseConnecting')
        case 'failed':
          return t('phaseFailed')
        case 'missing':
          return t('phaseMissing')
        case 'disabled':
          return t('phaseDisabled')
        case 'conflict':
          return t('phaseConflict')
        case 'invalid':
          return t('phaseInvalid')
        default:
          return t('phaseUnknown')
      }
    }
    //#endregion

    //#region controller
    /** Minimal snapshot store the slot renderer can bind as a Hook source. */
    function createStore(initial) {
      let state = initial
      const listeners = new Set()
      return {
        getSnapshot: () => state,
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        set(next) {
          if (Object.is(state, next)) return
          state = next
          for (const listener of [...listeners]) listener()
        },
      }
    }

    /** Live connection state, the settings form, and credential writes. */
    class McpServersController {
      constructor(ctx) {
        this.ctx = ctx
        /** The Host-owned settings form for this plugin's namespace. */
        this.form = ctx.configForms.get(ENTRY_ID)
        this.live = createStore({
          status: 'idle',
          error: undefined,
          servers: [],
          totalTools: 0,
          pending: false,
          checkedAt: 0,
          credentialBusy: undefined,
          credentialError: undefined,
        })
        this.config = createStore(this.form.getSnapshot())
        this.formUnsubscribe = this.form.subscribe(() => {
          this.config.set(this.form.getSnapshot())
        })
        this.inFlight = undefined
        this.timer = undefined
      }

      /** Apply one partial patch to the published live snapshot. */
      publish(patch) {
        this.live.set({ ...this.live.getSnapshot(), ...patch })
      }

      /** Begin polling the Host status projection. */
      start() {
        void this.refresh()
        this.timer = setInterval(() => {
          void this.refresh()
        }, STATUS_POLL_MS)
      }

      /** Stop polling and release the settings form subscription. */
      dispose() {
        if (this.timer !== undefined) clearInterval(this.timer)
        this.timer = undefined
        this.formUnsubscribe()
      }

      /** Read one status snapshot from the Host. */
      async refresh() {
        if (this.inFlight !== undefined) return this.inFlight
        const previous = this.live.getSnapshot()
        if (previous.status === 'idle') this.publish({ status: 'loading' })
        this.inFlight = (async () => {
          try {
            const response = await globalThis.fetch(STATUS_ROUTE, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ action: 'status' }),
              cache: 'no-store',
            })
            if (!response.ok) throw new Error(`status request failed: HTTP ${response.status}`)
            const envelope = await response.json()
            if (envelope === null || envelope.ok !== true) {
              throw new Error(envelope?.error?.message ?? 'status request was refused')
            }
            const value = envelope.value ?? {}
            this.publish({
              status: 'ready',
              error: undefined,
              servers: Array.isArray(value.servers) ? value.servers : [],
              totalTools: typeof value.totalTools === 'number' ? value.totalTools : 0,
              pending: value.pending === true,
              checkedAt: typeof value.checkedAt === 'number' ? value.checkedAt : Date.now(),
            })
          } catch (error) {
            this.publish({ status: 'error', error: String(error?.message ?? error) })
          } finally {
            this.inFlight = undefined
          }
        })()
        return this.inFlight
      }

      /** Write one credential reference's secret through the credentials domain. */
      async setCredential(ref, value) {
        this.publish({ credentialBusy: ref, credentialError: undefined })
        try {
          const response = await this.ctx.remote.credentials.set(ref, value)
          if (response === undefined || response.ok !== true) {
            throw new Error(response?.error?.message ?? 'credential write was refused')
          }
          await new Promise((resolve) => {
            setTimeout(resolve, 150)
          })
          await this.refresh()
          return true
        } catch (error) {
          this.publish({
            credentialError: { ref, message: String(error?.message ?? error) },
          })
          return false
        } finally {
          this.publish({ credentialBusy: undefined })
        }
      }
    }
    //#endregion

    //#region primitive controls
    /** One labelled field. */
    function Field(props) {
      const { label, hint, wide, children } = props
      return h(
        'div',
        { className: wide ? 'mcp-field mcp-wide' : 'mcp-field' },
        h('span', { className: 'mcp-label' }, label),
        children,
        hint === undefined ? null : h('span', { className: 'mcp-hint' }, hint),
      )
    }

    /** A text input bound to the draft. */
    function TextInput(props) {
      const { wide, invalid, ...rest } = props
      return h('input', {
        type: 'text',
        className: 'mcp-input',
        'aria-invalid': invalid === true ? 'true' : undefined,
        ...rest,
      })
    }

    /** A multi-line text input bound to the draft. */
    function TextArea(props) {
      const { invalid, ...rest } = props
      return h('textarea', {
        className: 'mcp-textarea',
        spellCheck: false,
        'aria-invalid': invalid === true ? 'true' : undefined,
        ...rest,
      })
    }

    /** A button with this page's shapes. */
    function Button(props) {
      const { variant, size, ...rest } = props
      const classes = ['mcp-button']
      if (variant !== undefined) classes.push(`mcp-button-${variant}`)
      if (size === 'sm') classes.push('mcp-button-sm')
      return h('button', { type: 'button', className: classes.join(' '), ...rest })
    }

    /** An accessible switch. */
    function Toggle(props) {
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': props.checked === true,
          'aria-label': props.label,
          'data-on': props.checked === true ? 'true' : 'false',
          className: 'mcp-toggle',
          disabled: props.disabled === true,
          onClick: () => props.onChange(props.checked !== true),
        },
        h('span', { className: 'mcp-toggleThumb' }),
      )
    }

    /** A custom select: the popup always opens below the trigger. */
    function Dropdown(props) {
      const { value, options, disabled, label, onChange } = props
      const [open, setOpen] = React.useState(false)
      const rootRef = React.useRef(null)
      React.useEffect(() => {
        if (!open) return undefined
        const onPointer = (event) => {
          if (rootRef.current !== null && !rootRef.current.contains(event.target)) setOpen(false)
        }
        const onKey = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', onPointer)
        document.addEventListener('keydown', onKey)
        return () => {
          document.removeEventListener('mousedown', onPointer)
          document.removeEventListener('keydown', onKey)
        }
      }, [open])
      const current = options.find((option) => option.value === value)
      return h(
        'div',
        { className: 'mcp-dd', ref: rootRef },
        h(
          'button',
          {
            type: 'button',
            className: 'mcp-input mcp-ddTrigger',
            disabled,
            'aria-label': label,
            'aria-haspopup': 'listbox',
            'aria-expanded': open === true ? 'true' : 'false',
            onClick: () => setOpen((visible) => !visible),
          },
          h('span', { className: 'mcp-ddValue' }, current === undefined ? '' : current.label),
          h(
            'svg',
            {
              className: 'mcp-ddChevron',
              width: 14,
              height: 14,
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              'aria-hidden': true,
            },
            h('path', { d: 'm6 9 6 6 6-6' }),
          ),
        ),
        open
          ? h(
              'div',
              { className: 'mcp-ddMenu', role: 'listbox', 'aria-label': label },
              options.map((option) =>
                h(
                  'button',
                  {
                    key: option.value,
                    type: 'button',
                    role: 'option',
                    'aria-selected': option.value === value ? 'true' : 'false',
                    className: 'mcp-ddItem',
                    onClick: () => {
                      onChange(option.value)
                      setOpen(false)
                    },
                  },
                  h('span', { className: 'mcp-ddCheck' }, option.value === value ? '✓' : ''),
                  option.label,
                ),
              ),
            )
          : null,
      )
    }

    /** A labelled switch row; pass showLabel:false to keep only the switch (label stays for aria). */
    function ToggleRow(props) {
      return h(
        'div',
        { className: 'mcp-toggleRow' },
        props.showLabel === false ? null : h('span', { className: 'mcp-label', style: { color: 'inherit' } }, props.label),
        h(Toggle, {
          checked: props.checked,
          label: props.label,
          disabled: props.disabled,
          onChange: props.onChange,
        }),
      )
    }

    //#endregion

    //#region page
    /** The edit form for the selected server. */
    function ServerForm(props) {
      const { t, server, status, disabled, live, keyDraft, onChange, onRemove, onKeyDraft, onSetKey, phase: livePhase } = props
      const phase = livePhase ?? serverPhase(server, status)
      const credential = status?.credential
      const credentialRef = server.credentialRef
      const credentialRequired = credentialRef !== ''
      const credentialConfigured = credentialRequired ? credential?.configured === true : false
      const busyKey = live?.credentialBusy === credentialRef && credentialRef !== ''
      const credentialError = live?.credentialError?.ref === credentialRef ? live.credentialError.message : undefined
      const isHttp = server.transport === 'streamable-http'
      const invalid = props.invalid
      const invalidField = (name) => {
        if (invalid === 'invalidUrl' && name === 'url') return true
        if (invalid === 'invalidCommand' && name === 'command') return true
        if (invalid === 'invalidTimeout' && name === 'toolCallTimeoutMs') return true
        if (invalid === 'keyInvalid' && name === 'credentialRef') return true
        if ((invalid === 'invalidName' || invalid === 'invalidDuplicate') && name === 'serverName') return true
        return false
      }

      return h(
        'div',
        { className: 'mcp-panel' },
        h(
          'div',
          { className: 'mcp-detailHead' },
          h('span', { className: 'mcp-dot', 'data-phase': phase }),
          h('h2', { className: 'mcp-detailTitle' }, server.serverName === '' ? t('unnamed') : server.serverName),
          h('span', { className: 'mcp-chip' }, server.transport === 'stdio' ? t('transportStdioShort') : t('transportHttpShort')),
          status !== undefined && status.phase === 'active'
            ? h('span', { className: 'mcp-chip', 'data-tone': 'ok' }, t('toolsCount', { count: String(status.toolCount ?? 0) }))
            : null,
          h('span', { className: 'mcp-spacer' }),
          h(
            'span',
            { className: 'mcp-toggleRow', style: { minHeight: '28px', padding: '2px 8px' } },
            h('span', { className: 'mcp-label', style: { color: 'inherit' } }, server.enabled !== false ? t('enabled') : t('phaseDisabled')),
            h(Toggle, {
              checked: server.enabled !== false,
              label: t('enabled'),
              disabled,
              onChange: (checked) => onChange({ enabled: checked }),
            }),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'mcp-button mcp-button-danger mcp-button-sm',
              disabled,
              title: t('removeServer'),
              'aria-label': t('removeServer'),
              onClick: onRemove,
            },
            h(
              'svg',
              {
                width: 14,
                height: 14,
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 2,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                'aria-hidden': true,
              },
              h('path', { d: 'M3 6h18' }),
              h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }),
              h('path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }),
              h('path', { d: 'M10 11v6' }),
              h('path', { d: 'M14 11v6' }),
            ),
          ),
        ),
        h(
          'div',
          { className: 'mcp-statusRow' },
          h('span', null, phaseLabel(t, phase)),
          credentialRequired
            ? h(
                'span',
                { className: 'mcp-chip', 'data-tone': credentialConfigured ? 'ok' : 'warn' },
                credentialConfigured ? t('credentialConfigured') : t('credentialMissing'),
              )
            : h('span', { className: 'mcp-chip' }, t('credentialNotRequired')),
          status?.error === undefined ? null : h('span', { className: 'mcp-error' }, status.error),
        ),
        h(
          'div',
          { className: 'mcp-grid' },
          h(
            Field,
            { label: t('serverName'), hint: disabled || server._saved === true ? undefined : t('serverNameHint') },
            h(TextInput, {
              value: server.serverName,
              disabled: disabled || server._saved === true,
              invalid: invalidField('serverName'),
              'aria-label': t('serverName'),
              spellCheck: false,
              onChange: (event) => onChange({ serverName: event.target.value }),
            }),
          ),
          h(
            Field,
            { label: t('transport') },
            h(Dropdown, {
              value: server.transport,
              disabled,
              label: t('transport'),
              options: [
                { value: 'streamable-http', label: t('transportHttp') },
                { value: 'stdio', label: t('transportStdio') },
              ],
              onChange: (next) => onChange({ transport: next }),
            }),
          ),
          isHttp
            ? h(
                Field,
                { label: t('url'), hint: t('urlHint'), wide: true },
                h(TextInput, {
                  value: server.url,
                  disabled,
                  invalid: invalidField('url'),
                  spellCheck: false,
                  placeholder: 'https://example.com/mcp',
                  onChange: (event) => onChange({ url: event.target.value }),
                }),
              )
            : h(
                Field,
                { label: t('command'), hint: t('commandHint'), wide: true },
                h(TextInput, {
                  value: server.command,
                  disabled,
                  invalid: invalidField('command'),
                  spellCheck: false,
                  placeholder: '/usr/local/bin/my-mcp-server',
                  onChange: (event) => onChange({ command: event.target.value }),
                }),
              ),
          isHttp
            ? null
            : h(
                Field,
                { label: t('args'), hint: t('argsHint'), wide: true },
                h(TextArea, {
                  value: server.args.join('\n'),
                  disabled,
                  rows: 3,
                  onChange: (event) =>
                    onChange({
                      args: event.target.value
                        .split('\n')
                        .map((part) => part.replace(/\r$/, ''))
                        .filter((part) => part.trim().length > 0),
                    }),
                }),
              ),
          isHttp
            ? null
            : h(
                Field,
                { label: t('cwd'), hint: t('cwdHint') },
                h(TextInput, {
                  value: server.cwd,
                  disabled,
                  spellCheck: false,
                  placeholder: '/path/to/workdir',
                  onChange: (event) => onChange({ cwd: event.target.value }),
                }),
              ),
          h(
            Field,
            { label: t('credentialRef'), hint: t('credentialRefHint') },
            h(TextInput, {
              value: server.credentialRef,
              disabled,
              invalid: invalidField('credentialRef'),
              spellCheck: false,
              placeholder: 'TAVILY_API_KEY',
              onChange: (event) => onChange({ credentialRef: event.target.value.trim() }),
            }),
          ),
          h(
            Field,
            { label: t('timeout'), hint: t('timeoutHint') },
            h(TextInput, {
              value: String(server.toolCallTimeoutMs),
              disabled,
              inputMode: 'numeric',
              invalid: invalidField('toolCallTimeoutMs'),
              onChange: (event) => {
                const value = Number(event.target.value)
                onChange({ toolCallTimeoutMs: Number.isFinite(value) ? value : 0 })
              },
            }),
          ),
        ),
        credentialRequired
          ? h(
              'div',
              { className: 'mcp-credentialRow' },
              h('input', {
                type: 'password',
                className: 'mcp-input',
                'aria-label': t('setCredential'),
                placeholder: t('credentialPlaceholder'),
                autoComplete: 'off',
                spellCheck: false,
                value: keyDraft ?? '',
                disabled,
                onChange: (event) => onKeyDraft(event.target.value),
              }),
              h(
                Button,
                {
                  variant: 'outline',
                  disabled: disabled || busyKey || (keyDraft ?? '').length === 0,
                  onClick: () => onSetKey(keyDraft ?? ''),
                },
                busyKey ? t('saving') : t('setCredential'),
              ),
              h('span', { className: 'mcp-hint' }, t('credentialHint')),
            )
          : null,
        h(
          'div',
          { className: 'mcp-advanced' },
          h('p', { className: 'mcp-advancedTitle' }, t('advanced')),
          h(
            'div',
            { className: 'mcp-grid' },
            h(
              Field,
              { label: t('credentialHeader') },
              h(TextInput, {
                value: server.credentialHeader,
                disabled,
                spellCheck: false,
                onChange: (event) => onChange({ credentialHeader: event.target.value.trim() }),
              }),
            ),
            h(
              Field,
              { label: t('credentialScheme'), hint: t('credentialSchemeHint') },
              h(TextInput, {
                value: server.credentialScheme,
                disabled,
                spellCheck: false,
                onChange: (event) => onChange({ credentialScheme: event.target.value }),
              }),
            ),
            h(
              Field,
              { label: t('failOnStartupError'), hint: t('failOnStartupErrorHint'), wide: true },
              h(ToggleRow, {
                label: t('failOnStartupError'),
                showLabel: false,
                checked: server.failOnStartupError === true,
                disabled,
                onChange: (checked) => onChange({ failOnStartupError: checked }),
              }),
            ),
          ),
        ),
        credentialError === undefined ? null : h('p', { className: 'mcp-error' }, credentialError),
        invalid === undefined ? null : h('p', { className: 'mcp-error' }, t(invalid)),
      )
    }

    /** The top-level MCP page: a server list beside the selected server's editor. */
    function McpServersPage(props) {
      const { t } = props
      const live = props.useMcpLive((snapshot) => snapshot)
      const config = props.useMcpConfig((snapshot) => snapshot)
      const controller = props.mcpController

      const acceptedServers = React.useMemo(
        () => normalizeServers(config?.value?.servers ?? config?.base?.servers ?? []).map((server) => ({ ...server, _saved: true })),
        [config?.value, config?.base],
      )
      const acceptedJson = JSON.stringify(acceptedServers)
      const customized = Array.isArray(config?.user?.servers)
      const [draft, setDraft] = React.useState(acceptedServers)
      const [baseline, setBaseline] = React.useState(acceptedJson)
      const [selected, setSelected] = React.useState(0)
      const [drill, setDrill] = React.useState(false)
      const [notice, setNotice] = React.useState(null)
      const noticeTimer = React.useRef(undefined)
      /** Success feedback flashes once; errors stay until replaced. */
      const showNotice = (next) => {
        clearTimeout(noticeTimer.current)
        setNotice(next)
        if (next?.tone === 'success') noticeTimer.current = setTimeout(() => setNotice(null), 2500)
      }
      React.useEffect(() => () => clearTimeout(noticeTimer.current), [])
      const [busy, setBusy] = React.useState(undefined)
      const [keyDrafts, setKeyDrafts] = React.useState({})
      const [validation, setValidation] = React.useState(undefined)
      const previousAccepted = React.useRef(acceptedJson)

      React.useEffect(() => {
        const previous = previousAccepted.current
        previousAccepted.current = acceptedJson
        setBaseline(acceptedJson)
        setDraft((current) => (JSON.stringify(current) === previous ? cloneJson(acceptedServers) : current))
      }, [acceptedJson, acceptedServers])

      const configReady = config !== undefined && config.status === 'ready'
      const writable = config?.writable !== false
      const editable = configReady && writable && busy === undefined
      const dirty = JSON.stringify(draft) !== baseline
      const activeIndex = draft.length === 0 ? -1 : Math.min(Math.max(selected, 0), draft.length - 1)
      const activeServer = activeIndex >= 0 ? draft[activeIndex] : undefined
      const invalid = validation !== undefined && validation.index === activeIndex ? validation.error : undefined

      const statusByServer = React.useMemo(() => {
        const map = new Map()
        for (const row of live?.servers ?? []) map.set(row.serverName, row)
        return map
      }, [live?.servers])

      const acceptedByServer = React.useMemo(
        () => new Map(acceptedServers.map((server) => [server.serverName, server])),
        [acceptedServers],
      )
      /** The saved row a draft row corresponds to: lamps must only reflect applied config. */
      const savedServer = (server) => acceptedByServer.get(server.serverName) ?? server
      const savedPhase = (server) => serverPhase(savedServer(server), statusByServer.get(server.serverName))

      const activeCount = acceptedServers.filter((row) => serverPhase(row, statusByServer.get(row.serverName)) === 'active').length
      const configuredCount = (live?.servers ?? []).length

      /** Stage one patch on the selected server row. */
      function patchServer(patch) {
        setNotice(null)
        setValidation(undefined)
        setDraft((rows) => rows.map((row, position) => (position === activeIndex ? { ...row, ...patch } : row)))
      }

      /** Remove the selected server row from the draft. */
      function removeServer() {
        if (activeIndex < 0) return
        setNotice(null)
        setValidation(undefined)
        setDraft((rows) => rows.filter((_, position) => position !== activeIndex))
        setSelected((current) => Math.max(0, Math.min(current, draft.length - 2)))
        setDrill(false)
      }

      /** Append one empty server row to the draft and select it. */
      function addServer() {
        setNotice(null)
        setValidation(undefined)
        const row = newServer(draft)
        setDraft((rows) => [...rows, row])
        setSelected(draft.length)
      }

      /** Discard the draft and return to the accepted Host values. */
      function discardDraft() {
        setDraft(cloneJson(acceptedServers))
        setNotice(null)
        setValidation(undefined)
      }

      /** Persist the whole staged list as one settings mutation. */
      async function save() {
        if (controller === undefined) return
        const result = validateServers(draft)
        if (!result.ok) {
          setValidation(result)
          setSelected(result.index)
          showNotice({ tone: 'error', text: t(result.error) })
          return
        }
        setValidation(undefined)
        setBusy('save')
        let accepted = false
        let failure
        try {
          accepted = await controller.form.mutate([{ op: 'set', path: ['servers'], value: draft.map(({ _saved: _ignored, ...rest }) => rest) }], config?.revision)
        } catch (error) {
          failure = String(error?.message ?? error)
        }
        setBusy(undefined)
        if (accepted) {
          showNotice({ tone: 'success', text: t('saved') })
          void controller.refresh()
        } else {
          showNotice({ tone: 'error', text: failure ?? t('saveFailed') })
        }
      }

      /** Restore the bundle's inherited defaults by clearing the profile override. */
      async function resetDefaults() {
        if (controller === undefined) return
        setBusy('reset')
        let accepted = false
        try {
          accepted = await controller.form.mutate([{ op: 'unset', path: ['servers'] }], config?.revision)
        } catch {
          accepted = false
        }
        setBusy(undefined)
        if (accepted) {
          setDraft(normalizeServers(config?.base?.servers ?? []))
          showNotice({ tone: 'success', text: t('saved') })
          void controller.refresh()
        } else {
          showNotice({ tone: 'error', text: t('saveFailed') })
        }
      }

      /** Write one credential reference's secret. */
      async function setKey(server, value) {
        if (controller === undefined) return
        const stored = await controller.setCredential(server.credentialRef, value)
        if (stored) {
          setKeyDrafts((current) => ({ ...current, [server.serverName]: '' }))
        }
      }

      if (!configReady) {
        return h(
          'div',
          { className: 'mcp-page' },
          h('div', { className: 'mcp-head' }, h('h1', { className: 'mcp-title' }, t('title'))),
          h(
            'div',
            { className: 'mcp-detail' },
            h('p', { className: 'mcp-notice' }, config?.status === 'unavailable' ? t('unavailable') : t('loading')),
          ),
        )
      }

      const statistics = [
        t('serverCount', { count: String(draft.length) }),
        t('statusSummary', {
          active: String(activeCount),
          count: String(configuredCount === 0 ? draft.length : configuredCount),
          tools: String(live?.totalTools ?? 0),
        }),
      ]

      const statusLine = (() => {
        if (live === undefined || live.status === 'idle' || live.status === 'loading') return t('loading')
        if (live.status === 'error') return t('liveError')
        if (live.pending === true) return t('pending')
        return undefined
      })()

      const detailEl = h(
        'section',
        { className: 'mcp-detail' },
        notice === null ? null : h('p', { className: 'mcp-notice', 'data-tone': notice.tone }, notice.text),
        writable === false ? h('p', { className: 'mcp-notice' }, t('readOnly')) : null,
        live?.status === 'error'
          ? h(
              'p',
              { className: 'mcp-notice', 'data-tone': 'error' },
              live.error,
              ' ',
              h(Button, { size: 'sm', variant: 'ghost', onClick: () => void controller?.refresh() }, t('retry')),
            )
          : null,
        activeServer === undefined
          ? h(
              'div',
              { className: 'mcp-empty' },
              h('p', { className: 'mcp-emptyTitle' }, t('noServers')),
              h('p', { className: 'mcp-emptyHint' }, t('noServersHint')),
            )
          : h(ServerForm, {
              t,
              server: activeServer,
              status: statusByServer.get(activeServer.serverName),
              phase: savedPhase(activeServer),
              disabled: !editable,
              invalid,
              live,
              keyDraft: keyDrafts[activeServer.serverName],
              onChange: patchServer,
              onRemove: removeServer,
              onKeyDraft: (value) => setKeyDrafts((current) => ({ ...current, [activeServer.serverName]: value })),
              onSetKey: (value) => void setKey(activeServer, value),
            }),
      )
      const footEl = h(
        'div',
        { className: 'mcp-foot' },
        h(
          'div',
          { className: 'mcp-footStatus' },
          customized ? h('span', { className: 'mcp-chip', 'data-tone': 'ok' }, t('customized')) : null,
          dirty ? h('span', { className: 'mcp-chip', 'data-tone': 'warn' }, t('unsaved')) : null,
          statusLine === undefined ? null : h('span', { className: 'mcp-hint' }, statusLine),
        ),
        customized
          ? h(
              Button,
              { variant: 'ghost', disabled: !editable, onClick: () => void resetDefaults() },
              busy === 'reset' ? t('saving') : t('reset'),
            )
          : null,
        h(Button, { variant: 'ghost', disabled: !editable || !dirty, onClick: discardDraft }, t('discard')),
        h(
          Button,
          { variant: 'primary', disabled: !editable || !dirty, onClick: () => void save() },
          busy === 'save' ? t('saving') : t('save'),
        ),
      )

      /** The page: a compact table first, the full editor as a second level. */
      return h(
          'div',
          { className: 'mcp-page', 'data-compact': 'true' },
          drill
            ? h(
                'div',
                { className: 'mcp-compactHead' },
                h(Button, { size: 'sm', variant: 'ghost', onClick: () => setDrill(false) }, '← ', t('back')),
                h(
                  'span',
                  { className: 'mcp-compactTitle' },
                  activeServer === undefined ? t('title') : activeServer.serverName === '' ? t('unnamed') : activeServer.serverName,
                ),
              )
            : h(
                'div',
                { className: 'mcp-compactHead' },
                h('h1', { className: 'mcp-compactTitle' }, t('title')),
                h('span', { className: 'mcp-version' }, `v${PLUGIN_VERSION}`),
                statistics.map((text, index) => h('span', { key: `stat-${index}`, className: 'mcp-chip' }, text)),
                h('span', { className: 'mcp-spacer' }),
                h(Button, { size: 'sm', variant: 'ghost', onClick: () => void controller?.refresh() }, t('refresh')),
                h(
                  Button,
                  { size: 'sm', disabled: !editable, onClick: () => { addServer(); setDrill(true) } },
                  t('addServer'),
                ),
              ),
          drill
            ? detailEl
            : h(
                'div',
                { className: 'mcp-compactBody' },
                draft.length === 0
                  ? h(
                      'div',
                      { className: 'mcp-empty' },
                      h('p', { className: 'mcp-emptyTitle' }, t('noServers')),
                      h('p', { className: 'mcp-emptyHint' }, t('noServersHint')),
                    )
                  : h(
                      'div',
                      { className: 'mcp-table' },
                      draft.map((server, index) => {
                        const status = statusByServer.get(server.serverName)
                        const phase = savedPhase(server)
                        const savedRow = savedServer(server)
                        const meta = [
                          server.transport === 'stdio' ? t('transportStdioShort') : t('transportHttpShort'),
                          status !== undefined && typeof status.version === 'string' ? `v${status.version}` : null,
                          savedRow.enabled !== false && status !== undefined && status.phase === 'active'
                            ? t('toolsCount', { count: String(status.toolCount ?? 0) })
                            : null,
                          savedRow.enabled === false ? t('phaseDisabled') : null,
                        ].filter(Boolean).join(' · ')
                        return h(
                          'button',
                          {
                            key: `server-${index}`,
                            type: 'button',
                            className: 'mcp-tableRow',
                            'data-active': index === activeIndex ? 'true' : 'false',
                            onClick: () => { setSelected(index); setDrill(true) },
                          },
                          h('span', { className: 'mcp-dot', 'data-phase': phase }),
                          h('span', { className: 'mcp-tableName' }, server.serverName === '' ? t('unnamed') : server.serverName),
                          h('span', { className: 'mcp-tableMeta' }, meta),
                          h('span', { className: 'mcp-spacer' }),
                          h('span', { className: 'mcp-tableEdit' }, t('edit')),
                        )
                      }),
                    ),
              ),
        footEl,
      )
    }
    //#endregion

    /** Required browser services. */
    const inject = ['slots', 'locale', 'configForms', 'remote.credentials']

    /** Mount the MCP page while the Host serves this plugin's settings namespace. */
    function apply(ctx) {
      const t = ctx.locale.bind(NS)
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'mcp-servers-page: dictionaries')
      ctx.effect(() => attachStyles(), 'mcp-servers-page: styles')
      ctx.effect(
        () =>
          ctx.configForms.whileServed([ENTRY_ID], () => {
            const controller = new McpServersController(ctx)
            controller.start()

            const disposers = [
              ctx.slots.inject('settings.section', () =>
                ctx.slots.register(
                  {
                    name: 'settings.section',
                    id: PANEL_ID,
                    order: 16,
                    locale: NS,
                    label: () => t('panel'),
                    inject: () => ({
                      hooks: { mcpLive: controller.live, mcpConfig: controller.config },
                      mcpController: controller,
                    }),
                  },
                  McpServersPage,
                ),
              ),
            ]

            return () => {
              for (const dispose of disposers) {
                try {
                  dispose()
                } catch (error) {
                  ctx.logger.warn('mcp-servers: disposing a slot failed: %s', String(error?.message ?? error))
                }
              }
              controller.dispose()
            }
          }),
        'mcp-servers-page: page',
      )
    }

    return { inject, apply }
  },
})
