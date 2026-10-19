param(
  [ValidateSet('start','send','check','local','diagnose')][string]$Action = 'start',
  [string]$Recipient,
  [string]$Message
)
$ErrorActionPreference = 'Stop'
# The desktop app may predate user environment changes. Fill only missing
# process values; never write back to the User/Machine environment or log values.
$atlasNames = @('WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_BUSINESS_ACCOUNT_ID',
  'WHATSAPP_VERIFY_TOKEN','WHATSAPP_APP_SECRET','WHATSAPP_GRAPH_API_VERSION','WHATSAPP_ALLOWED_USER_UIDS',
  'GOOGLE_APPLICATION_CREDENTIALS','ATLAS_FIREBASE_PROJECT_ID','HOST','PORT')
foreach ($atlasName in $atlasNames) {
  if (-not [Environment]::GetEnvironmentVariable($atlasName,'Process')) {
    $atlasValue = [Environment]::GetEnvironmentVariable($atlasName,'User')
    if (-not $atlasValue) { $atlasValue = [Environment]::GetEnvironmentVariable($atlasName,'Machine') }
    if ($atlasValue) { [Environment]::SetEnvironmentVariable($atlasName,$atlasValue,'Process') }
  }
}
$atlasEntry = if ($Action -eq 'diagnose') { Join-Path $PSScriptRoot 'whatsapp-diagnose.mjs' }
else { Join-Path $PSScriptRoot "../server/$(@{start='index';send='send';check='check';local='local'}[$Action]).mjs" }
if ($Action -eq 'send') { & node $atlasEntry $Recipient $Message }
elseif ($Action -eq 'diagnose') {
  $atlasPromptedRecipient = -not [bool]$env:ATLAS_VERIFIED_TEST_RECIPIENT
  if ($atlasPromptedRecipient) {
    $atlasSecureRecipient = Read-Host 'Verified Meta test recipient' -AsSecureString
    $atlasPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($atlasSecureRecipient)
    try { $env:ATLAS_VERIFIED_TEST_RECIPIENT = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($atlasPointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($atlasPointer) }
  }
  try { & node $atlasEntry }
  finally { if ($atlasPromptedRecipient) { Remove-Item Env:ATLAS_VERIFIED_TEST_RECIPIENT -ErrorAction SilentlyContinue } }
}
else { & node $atlasEntry }
exit $LASTEXITCODE
