import { createSign } from 'node:crypto'



const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files'

const SCOPE = 'https://www.googleapis.com/auth/drive'

const FOLDER_MIME = 'application/vnd.google-apps.folder'
const GZIP_MIME = 'application/gzip'
const JSON_MIME = 'application/json'

type Config =
  | { kind: 'service-account'; clientEmail: string; privateKey: string }
  | { kind: 'oauth'; clientId: string; clientSecret: string; refreshToken: string }

function normalizePrivateKey(key: string): string {
  let cleaned = key.trim()
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1)
  }
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1)
  }
  return cleaned.includes('\\n') ? cleaned.replace(/\\n/g, '\n') : cleaned
}

function readServiceAccount(): { clientEmail: string; privateKey: string } | null {
  let raw = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON?.trim()
  if (raw) {
    if (!raw.startsWith('{')) {
      try {
        const decoded = Buffer.from(raw, 'base64').toString('utf8')
        if (decoded.trim().startsWith('{')) {
          raw = decoded.trim()
        }
      } catch {}
    }
    try {
      const parsed = JSON.parse(raw) as {
        client_email?: string
        private_key?: string
      }
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: normalizePrivateKey(parsed.private_key),
        }
      }
      console.error(
        '[gdrive | config]: GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON is missing client_email/private_key.',
      )
    } catch (error) {
      console.error('[gdrive | config]: GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON is not valid JSON.', error)
    }
    return null
  }

  const clientEmail = (
    process.env.GOOGLE_DRIVE_SA_CLIENT_EMAIL ||
    process.env.GOOGLE_DRIVE_CLIENT_EMAIL
  )?.trim()
  const privateKey = (
    process.env.GOOGLE_DRIVE_SA_PRIVATE_KEY ||
    process.env.GOOGLE_DRIVE_PRIVATE_KEY
  )?.trim()
  if (clientEmail && privateKey) {
    return { clientEmail, privateKey: normalizePrivateKey(privateKey) }
  }

  return null
}

function readConfig(): Config | null {
  const serviceAccount = readServiceAccount()
  if (serviceAccount) return { kind: 'service-account', ...serviceAccount }

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim()
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim()
  if (clientId && clientSecret && refreshToken) {
    return { kind: 'oauth', clientId, clientSecret, refreshToken }
  }

  return null
}

export function isGdriveApiConfigured(): boolean {
  return readConfig() !== null
}

export function gdriveFolderId(): string | null {
  const raw = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim()
  if (!raw) return null
  const match = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  return raw
}

export function gdriveAccountLabel(): string {
  const config = readConfig()
  if (!config) return 'Not configured'
  if (config.kind === 'service-account') return `service account ${config.clientEmail}`
  return 'OAuth user credentials'
}

type AccessToken = { token: string; expiresAt: number }

let cachedToken: AccessToken | null = null

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function signServiceAccountJwt(
  clientEmail: string,
  privateKey: string,
): string {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  )

  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  signer.end()
  const signature = signer.sign(privateKey).toString('base64url')

  return `${header}.${claims}.${signature}`
}

async function requestToken(
  body: Record<string, string>,
): Promise<AccessToken> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(
      `Google OAuth rejected the credentials (${response.status}): ${text.slice(0, 400)}`,
    )
  }

  const parsed = JSON.parse(text) as { access_token: string; expires_in?: number }
  if (!parsed.access_token) {
    throw new Error('Google OAuth response did not include an access token.')
  }

  return {
    token: parsed.access_token,
    // Refresh a minute early so an in-flight upload never sees an expired token.
    expiresAt: Date.now() + Math.max(60, (parsed.expires_in ?? 3600) - 60) * 1000,
  }
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token

  const config = readConfig()
  if (!config) {
    throw new Error(
      'Google Drive credentials are not configured. Set GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON ' +
        'or GOOGLE_DRIVE_CLIENT_ID/GOOGLE_DRIVE_CLIENT_SECRET/GOOGLE_DRIVE_REFRESH_TOKEN.',
    )
  }

  cachedToken =
    config.kind === 'service-account'
      ? await requestToken({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: signServiceAccountJwt(config.clientEmail, config.privateKey),
        })
      : await requestToken({
          grant_type: 'refresh_token',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: config.refreshToken,
        })

  return cachedToken.token
}

export function resetGdriveToken(): void {
  cachedToken = null
}

async function driveError(action: string, response: Response): Promise<Error> {
  let detail = ''
  try {
    const parsed = (await response.json()) as {
      error?: { message?: string; errors?: Array<{ reason?: string }> }
    }
    detail =
      parsed.error?.message ??
      parsed.error?.errors?.[0]?.reason ??
      ''
  } catch {
    detail = await response.text().catch(() => '')
  }

  let hint = ''
  const lower = detail.toLowerCase()
  if (lower.includes('quota') || lower.includes('storagequotaexceeded')) {
    hint = ' (Tip: Service accounts have no personal Google Drive quota. Create a folder in your personal Google Drive, share it with the service account email as Editor, and set GOOGLE_DRIVE_FOLDER_ID).'
  } else if (lower.includes('file not found') || response.status === 404) {
    hint = ' (Tip: Ensure the target Google Drive folder exists and is shared with the service account email as Editor).'
  }

  return new Error(
    `Google Drive ${action} failed (${response.status})${detail ? `: ${detail.slice(0, 400)}` : ''}${hint}`,
  )
}

async function driveFetch(
  action: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  let token = await getAccessToken()
  let response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })
  if (response.status === 401) {
    resetGdriveToken()
    token = await getAccessToken()
    response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    })
  }
  if (!response.ok) throw await driveError(action, response)
  return response
}

export type DriveFileRef = {
  id: string
  name: string
  sizeBytes: number
  modifiedAt: string
  description: string | null
}

const DRIVE_QUERY_FLAGS = '&supportsAllDrives=true&includeItemsFromAllDrives=true'

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

async function findFiles(query: string): Promise<DriveFileRef[]> {
  const url =
    `${FILES_URL}?q=${encodeURIComponent(query)}` +
    '&fields=files(id,name,size,modifiedTime,description,trashed)' +
    '&pageSize=1000' +
    DRIVE_QUERY_FLAGS

  const response = await driveFetch('list', url)
  const parsed = (await response.json()) as {
    files?: Array<{
      id: string
      name: string
      size?: string
      modifiedTime?: string
      description?: string
      trashed?: boolean
    }>
  }

  return (parsed.files ?? [])
    .filter((file) => !file.trashed)
    .map((file) => ({
      id: file.id,
      name: file.name,
      sizeBytes: Number.parseInt(file.size ?? '0', 10) || 0,
      modifiedAt: file.modifiedTime ?? new Date(0).toISOString(),
      description: file.description ?? null,
    }))
}

export async function resolveFolderId(folderName: string): Promise<string> {
  const explicit = gdriveFolderId()
  if (explicit) return explicit

  const existing = await findFiles(
    `name = '${escapeQueryValue(folderName)}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
  )
  if (existing.length > 0) return existing[0].id

  const response = await driveFetch(
    'create folder',
    `${FILES_URL}?${DRIVE_QUERY_FLAGS.slice(1)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: folderName, mimeType: FOLDER_MIME }),
    },
  )

  const created = (await response.json()) as { id?: string }
  if (!created.id) throw new Error('Google Drive did not return a folder id.')
  return created.id
}

export async function uploadSnapshot(
  folderId: string,
  fileName: string,
  bytes: Buffer,
  manifestJson: string | null,
  overwriteFileId?: string,
): Promise<{ id: string }> {
  const metadata: Record<string, unknown> = {
    name: fileName,
    ...(overwriteFileId ? {} : { parents: [folderId] }),
    ...(manifestJson ? { description: manifestJson } : {}),
  }

  const boundary = `meditrack_${Date.now().toString(16)}`
  const preamble = Buffer.from(
    `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${GZIP_MIME}\r\n\r\n`,
    'utf8',
  )
  const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
  const body = Buffer.concat([preamble, bytes, epilogue])

  const url = overwriteFileId
    ? `${UPLOAD_URL}/${overwriteFileId}?uploadType=multipart`
    : `${UPLOAD_URL}?uploadType=multipart`

  const response = await driveFetch(
    overwriteFileId ? 'update' : 'upload',
    `${url}${DRIVE_QUERY_FLAGS}`,
    {
      method: overwriteFileId ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(body.byteLength),
      },
      body,
    },
  )

  const parsed = (await response.json()) as { id?: string }
  if (!parsed.id) throw new Error('Google Drive did not return a file id.')
  return { id: parsed.id }
}

export async function listSnapshots(
  folderId: string,
  extension: string,
): Promise<DriveFileRef[]> {
  return findFiles(
    `'${folderId}' in parents and name contains '${escapeQueryValue(extension)}' and trashed = false`,
  )
}

export async function downloadSnapshot(fileId: string): Promise<Buffer> {
  const response = await driveFetch(
    'download',
    `${FILES_URL}/${fileId}?alt=media${DRIVE_QUERY_FLAGS}`,
  )
  return Buffer.from(await response.arrayBuffer())
}

export async function deleteFiles(fileIds: string[]): Promise<void> {
  if (fileIds.length === 0) return
  await Promise.all(
    fileIds.map((id) =>
      driveFetch('delete', `${FILES_URL}/${id}${DRIVE_QUERY_FLAGS}`, {
        method: 'DELETE',
      }).catch(() => undefined), // an already-gone file must not fail a whole prune
    ),
  )
}

export async function testGdriveConnection(
  folderName: string,
): Promise<{ account: string; folderId: string }> {
  const folderId = await resolveFolderId(folderName)
  await driveFetch(
    'read',
    `${FILES_URL}/${folderId}?fields=id,name${DRIVE_QUERY_FLAGS}`,
  )
  return { account: gdriveAccountLabel(), folderId }
}
