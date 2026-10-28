#requires -RunAsAdministrator
<#
  MOM TV CITY - GPU broadcaster bootstrap
  ===============================================================================
  Configures a Windows GPU VM (e.g. the Vultr A16 "momtv-cam" instance) as a
  24/7 FiveM city-cam broadcaster:

    FiveM client -> OBS (Game Capture + NVENC) -> Twitch ("MOM TV CITY")
    -> MOM TV's  CITY CAM button plays it at momtv.fameshire.com/tv.html

  What this script does (everything except game/Steam login, which is
  interactive by design - one RDP session, once):
    * tunes Windows for an always-on headless broadcast box
    * installs OBS Studio (winget) and downloads the FiveM installer
    * writes the full OBS config: Twitch profile, NVENC 1080p60 encoder,
      "MOM TV CITY" scene with Game Capture (+ Display Capture fallback)
    * creates a FiveM auto-connect shortcut + a "start everything" script
    * creates ONLOGON scheduled tasks so OBS auto-streams and FiveM auto-joins

  Usage (elevated PowerShell over RDP):
    .\setup-city-cam.ps1 -TwitchStreamKey "live_xxxxx" -CityServer "city.fameshire.com:30120"
    .\setup-city-cam.ps1 -TwitchStreamKey "live_xxxxx" -CityServer "..." -AutoLogonPassword "TheVmPassword" -InstallAudioCable

  Notes:
    * -TwitchStreamKey: Dashboard -> Settings -> Stream -> Primary Stream Key
    * -AutoLogonPassword enables Windows auto-login so the broadcast
      survives a reboot unattended (password stored in the registry -
      standard Windows tradeoff for kiosk boxes).
    * -InstallAudioCable installs VB-CABLE so OBS always has an audio device
      even when no RDP session is connected (RDP disconnects mute the box).
      Requires one click + a reboot.
#>
param(
  [Parameter(Mandatory = $true)][string]$TwitchStreamKey,
  [string]$CityServer = "",                # FiveM city server, e.g. "host:30120"
  [string]$AutoLogonPassword = "",         # optional: enable auto-login
  [switch]$InstallAudioCable,              # optional: VB-CABLE virtual audio
  [int]$Bitrate = 6000                     # Twitch allows up to 6000 kbps
)

$ErrorActionPreference = 'Stop'
$obsAppData = "$env:APPDATA\obs-studio"
function Step($m) { Write-Host "`n=== $m ===" -ForegroundColor Green }

# -- 1. Windows: tuned for an always-on broadcast box -------------------------
Step 'Windows configuration (never sleep, no nag dialogs)'
powercfg /setactive SCHEME_MIN 2>$null                    # High performance
powercfg /change monitor-timeout-ac 10                    # screen may blank
powercfg /change standby-timeout-ac 0                     # never sleep
powercfg /change hibernate-timeout-ac 0                   # never hibernate
Set-ItemProperty 'HKLM:\SOFTWARE\Microsoft\ServerManager' -Name DoNotOpenAtLogon -Value 1 -ErrorAction SilentlyContinue
if ($AutoLogonPassword) {
  Step 'Enabling Windows auto-login (broadcast survives reboots)'
  $wl = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
  Set-ItemProperty $wl -Name AutoAdminLogon -Value '1'
  Set-ItemProperty $wl -Name DefaultUserName -Value $env:USERNAME
  Set-ItemProperty $wl -Name DefaultPassword -Value $AutoLogonPassword
}

# -- 2. Software: OBS + FiveM -------------------------------------------------
Step 'Installing OBS Studio via winget'
winget install --id OBSProject.OBSStudio -e --accept-source-agreements --accept-package-agreements --silent 2>&1 | Out-Host
$obsExe = "$env:ProgramFiles\obs-studio\bin\64bit\obs64.exe"
if (-not (Test-Path $obsExe)) { throw "OBS not found at $obsExe - install manually from https://obsproject.com and re-run." }

Step 'Downloading the FiveM installer (the few installer clicks are interactive)'
try {
  $fivemSetup = "$env:TEMP\FiveM-installer.exe"
  Invoke-WebRequest -Uri 'https://download.fivem.net/downloads/FiveM.exe' -OutFile $fivemSetup -UseBasicParsing
  Start-Process $fivemSetup
  Write-Host 'FiveM installer launched - complete it, log into the dedicated' -ForegroundColor Yellow
  Write-Host 'MOM TV Steam/Rockstar account, then come back. (Steam + GTA V must' -ForegroundColor Yellow
  Write-Host 'be installed and launched once.)' -ForegroundColor Yellow
} catch {
  Write-Host "Could not auto-download FiveM - get it from https://fivem.net" -ForegroundColor Yellow
}

if ($InstallAudioCable) {
  Step 'Installing VB-CABLE (click "Install Driver", then reboot once)'
  $zip = "$env:TEMP\VBCABLE.zip"
  Invoke-WebRequest -Uri 'https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack43.zip' -OutFile $zip -UseBasicParsing
  Expand-Archive $zip "$env:TEMP\VBCABLE" -Force
  Start-Process "$env:TEMP\VBCABLE\VBCABLE_Setup_x64.exe" -Verb RunAs
  Write-Host 'After the reboot set Windows default playback to "CABLE Input".' -ForegroundColor Yellow
}
# -- 3. OBS config: Twitch profile + NVENC + city-cam scene ------------------
Step 'Writing the OBS configuration (Twitch, NVENC 1080p60, MOM TV CITY scene)'
$profileDir = "$obsAppData\basic\profiles\MOM TV CITY"
$scenesDir  = "$obsAppData\basic\scenes"
New-Item -ItemType Directory -Force -Path $profileDir, $scenesDir | Out-Null

# Profile - simple mode, NVENC encoders (A16 supports NVENC), Twitch bitrate.
$basicIni = @"
[Output]
Mode=Simple
FilenameFormatting=%CCYY-%MM-%DD %hh-%mm-%ss

[SimpleOutput]
FilePath=C:/VODs
RecFormat2=mp4
VBitrate=$Bitrate
ABitrate=160
StreamEncoder=jim_nvenc
RecEncoder=jim_nvenc
"@
[IO.File]::WriteAllText("$profileDir\basic.ini", $basicIni)

# Stream service - Twitch with the provided stream key (secret stays on this box).
@{
  type     = 'rtmp_common'
  settings = @{
    service          = 'Twitch'
    server           = 'auto'
    key              = $TwitchStreamKey
    bwtest           = $false
    protocol_version = 2
  }
} | ConvertTo-Json | ForEach-Object { [IO.File]::WriteAllText("$profileDir\service.json", $_) }

# Point OBS at the new profile + scene collection on next launch.
$globalIni = @"
[Basic]
Profile=MOM TV CITY
ProfileDir=MOM TV CITY
SceneCollection=MOM TV CITY
SceneCollectionFile=MOM TV CITY
ConfigOnNewProfile=true
"@
[IO.File]::WriteAllText("$obsAppData\global.ini", $globalIni)
# Scene collection - Game Capture (primary) + Display Capture (fallback if the
# game hook misses), scaled to 1920x1080, plus desktop audio for game sound.
$sceneJson = @'
{
  "current_scene": "MOM TV CITY",
  "current_program_scene": "MOM TV CITY",
  "current_transition": "Cut",
  "scene_order": [ { "name": "MOM TV CITY" } ],
  "sources": [
    {
      "prev_ver": 503316480, "name": "MOM TV CITY",
      "uuid": "a1b2c3d4-0001-4000-8000-000000000001", "id": "scene",
      "settings": {
        "id_counter": 3,
        "items": [
          { "name": "FiveM (Game Capture)", "source_uuid": "a1b2c3d4-0002-4000-8000-000000000002",
            "visible": true, "locked": false, "rot": 0.0,
            "pos": {"x": 0.0, "y": 0.0}, "scale": {"x": 1.0, "y": 1.0}, "align": 5,
            "bounds_type": 2, "bounds_align": 0, "bounds": {"x": 1920.0, "y": 1080.0},
            "crop_left": 0, "crop_top": 0, "crop_right": 0, "crop_bottom": 0 },
          { "name": "Fallback (Display Capture)", "source_uuid": "a1b2c3d4-0003-4000-8000-000000000003",
            "visible": false, "locked": false, "rot": 0.0,
            "pos": {"x": 0.0, "y": 0.0}, "scale": {"x": 1.0, "y": 1.0}, "align": 5,
            "bounds_type": 2, "bounds_align": 0, "bounds": {"x": 1920.0, "y": 1080.0},
            "crop_left": 0, "crop_top": 0, "crop_right": 0, "crop_bottom": 0 },
          { "name": "Desktop Audio", "source_uuid": "a1b2c3d4-0004-4000-8000-000000000004",
            "visible": true, "locked": false, "rot": 0.0,
            "pos": {"x": 0.0, "y": 0.0}, "scale": {"x": 1.0, "y": 1.0}, "align": 5,
            "bounds_type": 0, "bounds_align": 0, "bounds": {"x": 0.0, "y": 0.0},
            "crop_left": 0, "crop_top": 0, "crop_right": 0, "crop_bottom": 0 }
        ]
      },
      "mixers": 0, "sync": 0, "flags": 0, "volume": 1.0, "balance": 0.5,
      "enabled": true, "muted": false, "hotkeys": {}, "private_settings": {}
    },
    {
      "prev_ver": 503316480, "name": "FiveM (Game Capture)",
      "uuid": "a1b2c3d4-0002-4000-8000-000000000002", "id": "game_capture",
      "settings": {
        "capture_mode": "any_fullscreen",
        "priority": 0,
        "capture_cursor": true,
        "allow_transparency": false,
        "limit_framerate": false
      },
      "mixers": 0, "sync": 0, "flags": 0, "volume": 1.0, "balance": 0.5,
      "enabled": true, "muted": false, "hotkeys": {}, "render": true
    },
    {
      "prev_ver": 503316480, "name": "Fallback (Display Capture)",
      "uuid": "a1b2c3d4-0003-4000-8000-000000000003", "id": "monitor_capture",
      "settings": { "method": 0, "output": 0, "capture_cursor": true },
      "mixers": 0, "sync": 0, "flags": 0, "volume": 1.0, "balance": 0.5,
      "enabled": true, "muted": false, "hotkeys": {}, "render": true
    },
    {
      "prev_ver": 503316480, "name": "Desktop Audio",
      "uuid": "a1b2c3d4-0004-4000-8000-000000000004", "id": "wasapi_output_capture",
      "settings": {},
      "mixers": 1, "sync": 0, "flags": 0, "volume": 1.0, "balance": 0.5,
      "enabled": true, "muted": false, "hotkeys": {}
    }
  ]
}
'@
try { $null = $sceneJson | ConvertFrom-Json } catch { throw "Scene JSON template invalid: $_" }
[IO.File]::WriteAllText("$scenesDir\MOM TV CITY.json", $sceneJson)
# -- 4. Auto-start: FiveM join + OBS stream on login -------------------------
Step 'Creating auto-start tasks + shortcuts'
$fivemExe = "$env:LOCALAPPDATA\FiveM\FiveM.app\FiveM.exe"
$obsTr = '"' + $obsExe + '" --startstreaming --minimize-to-tray --disable-shutdown-check'
schtasks /Create /TN 'MOMTV-CityCam-OBS' /TR $obsTr /SC ONLOGON /DELAY 0000:30 /RL HIGHEST /F | Out-Null
Write-Host '  ONLOGON task: OBS starts streaming 30s after login.'

if ($CityServer) {
  if (Test-Path $fivemExe) {
    $fivemTr = '"' + $fivemExe + '" fivem://connect/' + $CityServer
    schtasks /Create /TN 'MOMTV-CityCam-FiveM' /TR $fivemTr /SC ONLOGON /DELAY 0001:00 /RL HIGHEST /F | Out-Null
    $ws  = New-Object -ComObject WScript.Shell
    $lnk = $ws.CreateShortcut("$env:USERPROFILE\Desktop\MOM TV CITY.lnk")
    $lnk.TargetPath = $fivemExe
    $lnk.Arguments  = "fivem://connect/$CityServer"
    $lnk.Save()
    Write-Host "  Desktop shortcut + ONLOGON task: FiveM auto-joins $CityServer."
  } else {
    Write-Host "  FiveM not installed yet at $fivemExe - install it, then re-run this script to wire auto-join." -ForegroundColor Yellow
  }
}

# One-click "start the broadcast now" script on the desktop.
@"
`$fivem = "$fivemExe"
`$obs   = "$obsExe"
if (Test-Path `$fivem) { Start-Process `$fivem -ArgumentList "fivem://connect/$CityServer" }
Start-Process `$obs   -ArgumentList '--startstreaming','--minimize-to-tray'
"@ | Set-Content "$env:USERPROFILE\Desktop\Start-CityCam.ps1" -Encoding UTF8

Step 'Done - next steps'
Write-Host @'
  1. Finish the FiveM install (if it was just launched) + Steam/GTA V login.
  2. Launch OBS once and check: Settings -> Stream shows your key,
     Output encoder = NVIDIA NVENC H.264, canvas 1920x1080 @ 60fps.
  3. Join the city once in FiveM, park the character on the broadcast view,
     then disconnect RDP (audio survives thanks to VB-CABLE, if installed).
  4. On MOM TV the CITY CAM button plays twitch.tv/momtvcity 24/7.
'@
