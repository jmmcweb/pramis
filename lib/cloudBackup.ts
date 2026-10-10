

import { promises as fs, statSync, existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  BACKUP_FILE_EXT,
  BACKUP_ID_FILE_RE,
  BACKUP_MANIFEST_EXT,
  BACKUP_MIRROR_TO_DRIVE,
  GOOGLE_DRIVE_DIR,
  GOOGLE_DRIVE_SUBDIR,
  cloudBackupDir,
  cloudManifestPath,
  cloudSnapshotPath,
  type CloudBackupFile,
  type CloudManifest,
  type CloudMirrorSource,
  type CloudResult,
  type CloudStatus,
} from '@/lib/constants/backup'
import {
  deleteFiles,
  downloadSnapshot,
  gdriveAccountLabel,
  isGdriveApiConfigured,
  listSnapshots,
  resolveFolderId,
  testGdriveConnection,
  uploadSnapshot,
  type DriveFileRef,
} from '@/lib/gdriveApi'
import { importSnapshot, readSnapshotBytes } from '@/lib/backupStore'

function backupIdFromFileName(name: string): string | null {
  if (!name.endsWith(BACKUP_FILE_EXT)) return null
  const id = name.slice(0, -BACKUP_FILE_EXT.length)
  return BACKUP_ID_FILE_RE.test(id) ? id : null
}

function manifestFromDescription(description: string | null): CloudManifest | null {
  if (!description) return null
  try {
    return JSON.parse(description) as CloudManifest
  } catch {
    return null
  }
}

function toCloudFile(file: DriveFileRef): CloudBackupFile | null {
  const backupId = backupIdFromFileName(file.name)
  if (!backupId) return null

  const manifest = manifestFromDescription(file.description)
  return {
    backupId,
    label: manifest?.label ?? `Recovered ${backupId}`,
    sizeBytes: manifest?.sizeBytes ?? file.sizeBytes,
    modifiedAt: file.modifiedAt,
    createdAt: manifest?.createdAt ?? file.modifiedAt,
    rowCount:
      manifest?.rowCount ??
      Object.values(manifest?.tableCounts ?? {}).reduce((a, b) => a + b, 0),
    hasManifest: Boolean(manifest),
  }
}


let apiFolderId: string | null = null

async function apiFolder(): Promise<string> {
  if (apiFolderId) return apiFolderId
  apiFolderId = await resolveFolderId(GOOGLE_DRIVE_SUBDIR)
  return apiFolderId
}

const apiFileCache = new Map<string, Map<string, DriveFileRef>>()

async function apiFilesFor(
  backupId: string,
): Promise<{ snapshot: DriveFileRef | null; manifest: DriveFileRef | null }> {
  const folderId = await apiFolder()
  let cache = apiFileCache.get(folderId)
  if (!cache) {
    const files = await listSnapshots(folderId, BACKUP_FILE_EXT)
    cache = new Map(files.map((file) => [file.name, file]))
    apiFileCache.set(folderId, cache)
  }

  let snapshot = cache.get(`${backupId}${BACKUP_FILE_EXT}`) ?? null
  if (!snapshot) {
    const files = await listSnapshots(folderId, BACKUP_FILE_EXT)
    cache = new Map(files.map((file) => [file.name, file]))
    apiFileCache.set(folderId, cache)
    snapshot = cache.get(`${backupId}${BACKUP_FILE_EXT}`) ?? null
  }

  return {
    snapshot,
    manifest: cache.get(`${backupId}${BACKUP_MANIFEST_EXT}`) ?? null,
  }
}

async function apiStatus(): Promise<CloudStatus> {
  const folderId = await apiFolder()
  const files = await listSnapshots(folderId, BACKUP_FILE_EXT)
  apiFileCache.set(folderId, new Map(files.map((file) => [file.name, file])))

  const listed = files
    .map(toCloudFile)
    .filter((file): file is CloudBackupFile => file !== null)

  const totalBytes = listed.reduce((total, file) => total + file.sizeBytes, 0)

  return {
    enabled: BACKUP_MIRROR_TO_DRIVE,
    root: 'Google Drive API',
    directory: `${GOOGLE_DRIVE_SUBDIR} (folder ${folderId})`,
    source: 'api',
    available: true,
    fileCount: listed.length,
    totalBytes,
    message: `Mirroring to Google Drive over the Drive API as ${gdriveAccountLabel()}.`,
  }
}

async function apiPush(
  backupId: string,
  bytes: Buffer,
  manifestJson: string | null,
): Promise<CloudResult> {
  try {
    const folderId = await apiFolder()
    const { snapshot } = await apiFilesFor(backupId)

    await uploadSnapshot(
      folderId,
      `${backupId}${BACKUP_FILE_EXT}`,
      bytes,
      manifestJson,
      snapshot?.id,
    )

    apiFileCache.delete(folderId)

    return {
      success: true,
      message: `Uploaded ${backupId} to Google Drive.`,
      backupId,
    }
  } catch (error) {
    console.error('[cloudBackup | api push]:', error)
    return {
      success: false,
      message: `Failed to upload ${backupId} to Google Drive: ${error instanceof Error ? error.message : String(error)}`,
      backupId,
    }
  }
}

async function apiListFiles(): Promise<CloudBackupFile[]> {
  try {
    const folderId = await apiFolder()
    const files = await listSnapshots(folderId, BACKUP_FILE_EXT)
    apiFileCache.set(folderId, new Map(files.map((file) => [file.name, file])))

    const listed = files
      .map(toCloudFile)
      .filter((file): file is CloudBackupFile => file !== null)

    return listed.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  } catch (error) {
    console.error('[cloudBackup | api list]:', error)
    return []
  }
}

async function apiRemove(backupId: string): Promise<CloudResult> {
  try {
    const { snapshot, manifest } = await apiFilesFor(backupId)
    const toDelete = [snapshot?.id, manifest?.id].filter((id): id is string => Boolean(id))
    if (toDelete.length > 0) {
      await deleteFiles(toDelete)
      const folderId = await apiFolder()
      apiFileCache.delete(folderId)
    }
    return {
      success: true,
      message: `Removed ${backupId} from Google Drive.`,
      backupId,
    }
  } catch (error) {
    console.error('[cloudBackup | api remove]:', error)
    return {
      success: false,
      message: `Failed to remove ${backupId} from Google Drive: ${error instanceof Error ? error.message : String(error)}`,
      backupId,
    }
  }
}

async function apiPull(backupId: string): Promise<CloudResult> {
  try {
    const { snapshot } = await apiFilesFor(backupId)
    if (!snapshot) {
      return {
        success: false,
        message: `Backup ${backupId} was not found in Google Drive.`,
        backupId,
      }
    }

    const bytes = await downloadSnapshot(snapshot.id)
    const manifest = manifestFromDescription(snapshot.description)

    const imported = await importSnapshot(backupId, bytes, manifest as any)
    if (!imported) {
      return {
        success: false,
        message: `Backup ${backupId} was downloaded from Google Drive but could not be stored.`,
        backupId,
      }
    }

    return {
      success: true,
      message: `Fetched ${backupId} from Google Drive. It is now available to restore.`,
      backupId,
    }
  } catch (error) {
    console.error('[cloudBackup | api pull]:', error)
    return {
      success: false,
      message: `Failed to fetch ${backupId} from Google Drive: ${error instanceof Error ? error.message : String(error)}`,
      backupId,
    }
  }
}

/**
 * The manifest sidecar is uploaded as a plain-JSON Drive file. It is staged under
 * /tmp because the API layer takes a path-free payload and serverless has no
 * writable working directory.
 */
async function apiManifestStagingPath(backupId: string): Promise<string> {
  const dir = path.join(os.tmpdir(), 'meditrack-gdrive-manifests')
  await fs.mkdir(dir, { recursive: true })
  return path.join(dir, `${backupId}${BACKUP_MANIFEST_EXT}`)
}


function candidateRoots(): string[] {
  const home = os.homedir()
  const localAppData = process.env.LOCALAPPDATA ?? ''

  return [
    process.env.GOOGLE_DRIVE_ROOT?.trim() || '',
    'G:\\My Drive',
    'H:\\My Drive',
    localAppData ? path.join(localAppData, 'Google', 'DriveFileStream', 'root') : '',
    localAppData ? path.join(localAppData, 'Google', 'Drive') : '',
    home ? path.join(home, 'Google Drive') : '',
    home ? path.join(home, 'Google Drive for Desktop') : '',
    home ? path.join(home, 'My Drive') : '',
    home ? path.join(home, 'google-drive', 'My Drive') : '',
    home ? path.join(home, 'GoogleDrive') : '',
    home ? path.join(home, 'Library', 'CloudStorage', 'GoogleDrive') : '',
  ].filter(Boolean)
}

function isDirectory(candidate: string): boolean {
  try {
    if (!existsSync(candidate)) return false
    return statSync(candidate).isDirectory()
  } catch {
    return false
  }
}

export function resolveDriveRoot(): {
  root: string | null
  source: CloudMirrorSource
} {
  if (GOOGLE_DRIVE_DIR) {
    return { root: GOOGLE_DRIVE_DIR, source: 'env' }
  }

  for (const candidate of candidateRoots()) {
    if (isDirectory(candidate)) {
      return { root: candidate, source: 'detected' }
    }
  }

  return { root: null, source: 'none' }
}

export function getDriveDirectory(): string | null {
  const { root } = resolveDriveRoot()
  return root ? cloudBackupDir(root) : null
}

export async function ensureDriveDir(): Promise<string> {
  const dir = getDriveDirectory()
  if (!dir) {
    throw new Error(
      'No Google Drive folder found. Set GOOGLE_DRIVE_DIR to your Drive folder ' +
        '(e.g. "G:\\My Drive") or install Google Drive for Desktop.',
    )
  }
  await fs.mkdir(dir, { recursive: true })
  return dir
}

async function readManifest(
  dir: string,
  backupId: string,
): Promise<CloudManifest | null> {
  try {
    return JSON.parse(
      await fs.readFile(cloudManifestPath(dir, backupId), 'utf8'),
    ) as CloudManifest
  } catch {
    return null
  }
}

async function readDriveUsage(dir: string): Promise<{
  fileCount: number
  totalBytes: number
}> {
  try {
    const entries = await fs.readdir(dir)
    let fileCount = 0
    let totalBytes = 0
    for (const entry of entries) {
      if (!entry.endsWith(BACKUP_FILE_EXT)) continue
      const stat = await fs.stat(path.join(dir, entry)).catch(() => null)
      if (!stat) continue
      fileCount += 1
      totalBytes += stat.size
    }
    return { fileCount, totalBytes }
  } catch {
    return { fileCount: 0, totalBytes: 0 }
  }
}

export async function getCloudStatus(): Promise<CloudStatus> {
  if (isGdriveApiConfigured()) {
    try {
      return await apiStatus()
    } catch (error) {
      console.error('[getCloudStatus | api error]:', error)
      return {
        enabled: BACKUP_MIRROR_TO_DRIVE,
        root: 'Google Drive API',
        directory: `${GOOGLE_DRIVE_SUBDIR}`,
        source: 'api',
        available: false,
        fileCount: 0,
        totalBytes: 0,
        message: `Google Drive API connection failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  const { root, source } = resolveDriveRoot()
  const directory = root ? cloudBackupDir(root) : null

  if (!root || !directory) {
    return {
      enabled: BACKUP_MIRROR_TO_DRIVE,
      root: null,
      directory: null,
      source: 'none',
      available: false,
      fileCount: 0,
      totalBytes: 0,
      message:
        'No Google Drive folder detected. Install Google Drive for Desktop, or set GOOGLE_DRIVE_DIR to your Drive folder.',
    }
  }

  try {
    await fs.mkdir(directory, { recursive: true })
    const usage = await readDriveUsage(directory)

    return {
      enabled: BACKUP_MIRROR_TO_DRIVE,
      root,
      directory,
      source,
      available: true,
      fileCount: usage.fileCount,
      totalBytes: usage.totalBytes,
      message: `Mirroring to ${directory} (${
        source === 'env' ? 'configured via GOOGLE_DRIVE_DIR' : 'Google Drive detected automatically'
      }).`,
    }
  } catch (error) {
    console.error('[getCloudStatus | Error]:', error)
    return {
      enabled: BACKUP_MIRROR_TO_DRIVE,
      root,
      directory,
      source,
      available: false,
      fileCount: 0,
      totalBytes: 0,
      message: `Google Drive folder "${directory}" is not writable. Check that Drive for Desktop is running.`,
    }
  }
}

export async function pushSnapshotToDrive(
  localDir: string,
  backupId: string,
  bytes?: Buffer,
  manifestJson?: unknown,
): Promise<CloudResult> {
  if (isGdriveApiConfigured()) {
    let payload = bytes
    if (!payload) {
      try {
        payload = await readSnapshotBytes(backupId)
      } catch {
        const source = path.join(localDir, `${backupId}${BACKUP_FILE_EXT}`)
        if (existsSync(source)) {
          payload = await fs.readFile(source)
        }
      }
    }

    if (!payload) {
      return {
        success: false,
        message: `Snapshot file for ${backupId} is missing.`,
        backupId,
      }
    }

    const manifestStr =
      manifestJson !== undefined
        ? (typeof manifestJson === 'string'
            ? manifestJson
            : JSON.stringify(manifestJson))
        : null

    return apiPush(backupId, payload, manifestStr)
  }

  let dir: string
  try {
    dir = await ensureDriveDir()
  } catch (error: any) {
    return { success: false, message: error.message, backupId }
  }

  if (path.resolve(dir) === path.resolve(localDir)) {
    return {
      success: true,
      message: `${backupId} is already stored in Google Drive.`,
      backupId,
    }
  }

  let payload = bytes
  if (!payload) {
    const source = path.join(localDir, `${backupId}${BACKUP_FILE_EXT}`)
    if (!existsSync(source)) {
      return {
        success: false,
        message: `Snapshot file for ${backupId} is missing from the local backup folder.`,
        backupId,
      }
    }
    payload = await fs.readFile(source)
  }

  const target = cloudSnapshotPath(dir, backupId)
  const temp = `${target}.uploading`

  try {
    await fs.writeFile(temp, payload)
    await fs.rename(temp, target)

    const manifestPath = cloudManifestPath(dir, backupId)
    try {
      if (manifestJson !== undefined) {
        await fs.writeFile(manifestPath, JSON.stringify(manifestJson, null, 2), 'utf8')
      } else {
        const manifestSource = path.join(localDir, `${backupId}.json`)
        if (existsSync(manifestSource)) {
          await fs.copyFile(manifestSource, manifestPath)
        }
      }
    } catch (error) {
      console.error('[pushSnapshotToDrive | manifest]:', error)
    }

    return {
      success: true,
      message: `Copied ${backupId} to Google Drive.`,
      backupId,
    }
  } catch (error) {
    console.error('[pushSnapshotToDrive | Error]:', error)
    await fs.unlink(temp).catch(() => {})
    return {
      success: false,
      message: `Failed to copy ${backupId} to Google Drive.`,
      backupId,
    }
  }
}

export async function listDriveFiles(): Promise<CloudBackupFile[]> {
  if (isGdriveApiConfigured()) {
    return apiListFiles()
  }

  const dir = getDriveDirectory()
  if (!dir) return []

  let entries: string[]
  try {
    await fs.mkdir(dir, { recursive: true })
    entries = await fs.readdir(dir)
  } catch (error) {
    console.error('[listDriveFiles | Error]:', error)
    return []
  }

  const files: CloudBackupFile[] = []

  for (const entry of entries) {
    if (!entry.endsWith(BACKUP_FILE_EXT)) continue
    const backupId = entry.slice(0, -BACKUP_FILE_EXT.length)
    if (!BACKUP_ID_FILE_RE.test(backupId)) continue

    const stat = await fs
      .stat(cloudSnapshotPath(dir, backupId))
      .catch(() => null)
    if (!stat) continue

    const manifest = await readManifest(dir, backupId)

    files.push({
      backupId,
      label: manifest?.label ?? `Recovered ${backupId}`,
      sizeBytes: manifest?.sizeBytes ?? stat.size,
      modifiedAt: stat.mtime.toISOString(),
      createdAt: manifest?.createdAt ?? stat.mtime.toISOString(),
      rowCount:
        manifest?.rowCount ??
        Object.values(manifest?.tableCounts ?? {}).reduce((a, b) => a + b, 0),
      hasManifest: Boolean(manifest),
    })
  }

  return files.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function removeFromDrive(backupId: string): Promise<CloudResult> {
  if (isGdriveApiConfigured()) {
    return apiRemove(backupId)
  }

  const dir = getDriveDirectory()
  if (!dir) {
    return { success: false, message: 'No Google Drive folder is configured.', backupId }
  }

  try {
    await Promise.all([
      fs.unlink(cloudSnapshotPath(dir, backupId)).catch(() => {}),
      fs.unlink(cloudManifestPath(dir, backupId)).catch(() => {}),
    ])
    return {
      success: true,
      message: `Removed ${backupId} from Google Drive.`,
      backupId,
    }
  } catch (error) {
    console.error('[removeFromDrive | Error]:', error)
    return {
      success: false,
      message: `Failed to remove ${backupId} from Google Drive.`,
      backupId,
    }
  }
}

export async function getDriveSnapshotPath(
  backupId: string,
): Promise<string | null> {
  const dir = getDriveDirectory()
  if (!dir) return null
  const file = cloudSnapshotPath(dir, backupId)
  return existsSync(file) ? file : null
}

type FetchHook = (backupId: string, driveDir: string) => Promise<CloudResult>

let fetchHook: FetchHook | null = null

export function registerFetchHook(hook: FetchHook): void {
  fetchHook = hook
}

export async function pullFromDrive(backupId: string): Promise<CloudResult> {
  if (isGdriveApiConfigured()) {
    return apiPull(backupId)
  }

  if (!fetchHook) {
    return {
      success: false,
      message: 'Google Drive fetching is not available in this context.',
      backupId,
    }
  }
  return fetchHook(backupId, getDriveDirectory() ?? '')
}

