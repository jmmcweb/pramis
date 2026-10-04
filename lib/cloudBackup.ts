

import { promises as fs, statSync, existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  BACKUP_FILE_EXT,
  BACKUP_ID_FILE_RE,
  BACKUP_MIRROR_TO_DRIVE,
  GOOGLE_DRIVE_DIR,
  cloudBackupDir,
  cloudManifestPath,
  cloudSnapshotPath,
  type CloudBackupFile,
  type CloudManifest,
  type CloudMirrorSource,
  type CloudResult,
  type CloudStatus,
} from '@/lib/constants/backup'

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
  if (!fetchHook) {
    return {
      success: false,
      message: 'Google Drive fetching is not available in this context.',
      backupId,
    }
  }
  return fetchHook(backupId, getDriveDirectory() ?? '')
}

