import { del, get, head, list, put } from '@vercel/blob'
import { BLOB_BACKUP_PREFIX, isBlobConfigured } from '../lib/vercelBlob'
import { BACKUP_FILE_EXT, formatBytes } from '../lib/constants/backup'

async function readStream(stream: unknown): Promise<string> {
  const reader = (stream as ReadableStream<Uint8Array>).getReader()
  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8')
}

async function diagnose() {
  console.log('Vercel Blob Diagnostic Check')

  const configured = isBlobConfigured()
  console.log('1. Configuration check:')
  console.log(`   Configured: ${configured ? 'YES' : 'NO'}`)
  console.log(`   Prefix: ${BLOB_BACKUP_PREFIX}/`)
  console.log(
    `   BLOB_READ_WRITE_TOKEN: ${process.env.BLOB_READ_WRITE_TOKEN ? 'set' : 'missing'}`,
  )
  console.log(
    `   VERCEL_OIDC_TOKEN + BLOB_STORE_ID: ${process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID ? 'set' : 'missing'}`,
  )

  if (!configured) {
    console.log('\n[!] Vercel Blob is not configured.')
    console.log('    Locally : add BLOB_READ_WRITE_TOKEN to .env.local (via `vercel env pull`).')
    console.log('    On Vercel: add BLOB_READ_WRITE_TOKEN to the project environment variables')
    console.log('               (Vercel dashboard → Storage → Blob → Connect → Environment Variables).')
    process.exit(1)
  }

  console.log('\n2. Listing existing snapshots...')
  try {
    const result = await list({ prefix: `${BLOB_BACKUP_PREFIX}/`, limit: 200 })
    const snapshots = result.blobs.filter((blob) =>
      blob.pathname.endsWith(BACKUP_FILE_EXT),
    )
    console.log(`   Found ${snapshots.length} snapshot(s):`)
    for (const blob of snapshots) {
      console.log(`   - ${blob.pathname} (${formatBytes(blob.size)})`)
    }
  } catch (error: any) {
    console.error('\n[FAIL] Could not list blobs:')
    console.error(`   ${error?.message || error}`)
    process.exit(1)
  }

  console.log('\n3. Write / read / delete round-trip test...')
  const probePath = `${BLOB_BACKUP_PREFIX}/.diagnose-check.txt`
  try {
    const uploaded = await put(
      probePath,
      `meditrack diagnose ${new Date().toISOString()}`,
      {
        access: 'private',
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: 'text/plain',
      },
    )
    console.log(`   Uploaded: ${uploaded.pathname}`)

    await head(probePath)

    const fetched = await get(probePath, { access: 'private' })
    const body = await readStream((fetched as any).stream)
    console.log(`   Read back: "${body.slice(0, 40)}..."`)

    await del(probePath)
    console.log('   Cleaned up the probe object.')
  } catch (error: any) {
    console.error('\n[FAIL] Round-trip test failed:')
    console.error(`   ${error?.message || error}`)
    process.exit(1)
  }

  console.log('\n[PASS] Vercel Blob is properly configured and accessible.')
}

diagnose().catch((err) => {
  console.error('Fatal error during diagnostic:', err)
  process.exit(1)
})