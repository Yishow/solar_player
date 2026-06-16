param(
  [string]$HostName = "192.168.31.40",
  [string]$User = "kz",
  [string]$Password = "",
  [switch]$NoLaunch,
  [switch]$DeleteCredential
)

$ErrorActionPreference = "Stop"

if ($DeleteCredential) {
  cmdkey.exe /delete:"TERMSRV/$HostName" | Out-Host
  exit 0
}

if ([string]::IsNullOrWhiteSpace($Password)) {
  $secure = Read-Host "RDP password for $User@$HostName" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

cmdkey.exe /generic:"TERMSRV/$HostName" /user:$User /pass:$Password | Out-Host

$rdpPath = Join-Path $env:TEMP "solar-player-$HostName.rdp"
@"
full address:s:$HostName
username:s:$User
prompt for credentials:i:0
authentication level:i:0
enablecredsspsupport:i:0
"@ | Set-Content -Path $rdpPath -Encoding ASCII

Write-Host "Stored Windows RDP credential: TERMSRV/$HostName"
Write-Host "RDP file: $rdpPath"

if (-not $NoLaunch) {
  Start-Process mstsc.exe -ArgumentList "`"$rdpPath`""
}
