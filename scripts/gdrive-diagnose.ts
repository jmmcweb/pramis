import {
  isGdriveApiConfigured,
  gdriveAccountLabel,
  gdriveFolderId,
  testGdriveConnection,
  listSnapshots,
} from '../lib/gdriveApi'
import {
  GOOGLE_DRIVE_SUBDIR,
  BACKUP_FILE_EXT,
  formatBytes,
} from '../lib/constants/backup'

async function diagnose() {
  console.log(' Google Drive Diagnostic Check')

  const configured = isGdriveApiConfigured()
  console.log(`1. Configuration check:`)
  console.log(`   Configured: ${configured ? 'YES' : 'NO'}`)
  console.log(`   Account label: ${gdriveAccountLabel()}`)
  console.log(`   Explicit Folder ID: ${gdriveFolderId() ?? '(none - will auto-create or find "' + GOOGLE_DRIVE_SUBDIR + '")'}`)

  if (!configured) {
    console.log('\n[!] Missing Google Drive Credentials in environment variables.')
    console.log('    Provide either:')
    console.log('    Option A (Service Account):')
    console.log('      - GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON (or GOOGLE_DRIVE_SA_CLIENT_EMAIL + GOOGLE_DRIVE_SA_PRIVATE_KEY)')
    console.log('      - GOOGLE_DRIVE_FOLDER_ID (folder shared with the service account as Editor)')
    console.log('    Option B (OAuth User):')
    console.log('      - GOOGLE_DRIVE_CLIENT_ID')
    console.log('      - GOOGLE_DRIVE_CLIENT_SECRET')
    console.log('      - GOOGLE_DRIVE_REFRESH_TOKEN')
    console.log('      - GOOGLE_DRIVE_FOLDER_ID (optional)')
    process.exit(1)
  }

  console.log('\n2. Testing Google Drive API connection & folder access...')
  try {
    const result = await testGdriveConnection(GOOGLE_DRIVE_SUBDIR)
    console.log(`   [PASS] Connection successful!`)
    console.log(`   Folder ID: ${result.folderId}`)
    console.log(`   Authenticated as: ${result.account}`)

    console.log('\n3. Listing existing snapshots in Google Drive folder...')
    const files = await listSnapshots(result.folderId, BACKUP_FILE_EXT)
    console.log(`   Found ${files.length} backup snapshot(s):`)
    for (const f of files) {
      console.log(`   - ${f.name} (${formatBytes(f.sizeBytes)}) [ID: ${f.id}]`)
    }

    console.log('\n[PASS] Google Drive is properly configured and accessible.')
  } catch (error: any) {
    console.error('\n[FAIL] Connection failed:')
    console.error(`   ${error?.message || error}`)

    if (error?.message?.includes('403') || error?.message?.includes('quota')) {
      console.log('\n[!] TROUBLESHOOTING TIP:')
      console.log('   Google Service Accounts have no personal Drive storage quota.')
      console.log('   Create a folder in your personal Google Drive, share it with your')
      console.log('   Service Account email as Editor, and set GOOGLE_DRIVE_FOLDER_ID')
      console.log('   to that folder ID in your environment variables.')
    } else if (error?.message?.includes('404')) {
      console.log('\n[!] TROUBLESHOOTING TIP:')
      console.log('   The specified GOOGLE_DRIVE_FOLDER_ID was not found or is not accessible.')
      console.log('   Ensure the folder is shared with your Service Account email as Editor.')
    }
    process.exit(1)
  }
}

diagnose().catch((err) => {
  console.error('Fatal error during diagnostic:', err)
  process.exit(1)
})

