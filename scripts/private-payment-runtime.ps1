param([Parameter(Mandatory=$true)][string]$Directory)
$ErrorActionPreference = 'Stop'
$atlasPaymentRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\.payment-private'))
$atlasPaymentTarget = [IO.Path]::GetFullPath($Directory).TrimEnd([char[]]'\/')
if (-not $atlasPaymentTarget.Equals($atlasPaymentRoot,[StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid private payment directory' }
$atlasPaymentItem = Get-Item -LiteralPath $atlasPaymentTarget
if ($atlasPaymentItem.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Payment directory cannot be a reparse point' }
$atlasPaymentAcl = [Security.AccessControl.DirectorySecurity]::new()
$atlasPaymentAcl.SetAccessRuleProtection($true,$false)
$atlasPaymentOwner = [Security.Principal.WindowsIdentity]::GetCurrent().User
foreach ($atlasPaymentPrincipal in @($atlasPaymentOwner,([Security.Principal.SecurityIdentifier]::new('S-1-5-18')))) {
  $atlasPaymentRule = [Security.AccessControl.FileSystemAccessRule]::new($atlasPaymentPrincipal,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
  $atlasPaymentAcl.AddAccessRule($atlasPaymentRule)
}
[IO.Directory]::SetAccessControl($atlasPaymentTarget,$atlasPaymentAcl)
