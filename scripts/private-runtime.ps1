param([Parameter(Mandatory=$true)][string]$Directory)
$ErrorActionPreference = 'Stop'
$atlasRoot = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'AtlasCRM/runtime')) + [IO.Path]::DirectorySeparatorChar
$atlasTarget = [IO.Path]::GetFullPath($Directory)
if (-not $atlasTarget.StartsWith($atlasRoot,[StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid private runtime directory' }
$atlasAcl = [Security.AccessControl.DirectorySecurity]::new()
$atlasAcl.SetAccessRuleProtection($true,$false)
$atlasOwner = [Security.Principal.WindowsIdentity]::GetCurrent().User
foreach ($atlasPrincipal in @($atlasOwner,([Security.Principal.SecurityIdentifier]::new('S-1-5-18')))) {
  $atlasRule = [Security.AccessControl.FileSystemAccessRule]::new($atlasPrincipal,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
  $atlasAcl.AddAccessRule($atlasRule)
}
[IO.Directory]::SetAccessControl($atlasTarget,$atlasAcl)
