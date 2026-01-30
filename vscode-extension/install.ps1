# Pulse VSCode Extension Installer (Windows)
# Run: powershell -ExecutionPolicy Bypass -File install.ps1

$ExtensionName = "pulse-language"
$VSCodeExtPath = "$env:USERPROFILE\.vscode\extensions\$ExtensionName"
$SourcePath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Installing Pulse Language extension..." -ForegroundColor Cyan

# Remove existing installation
if (Test-Path $VSCodeExtPath) {
    Write-Host "Removing existing installation..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $VSCodeExtPath
}

# Copy extension files
Write-Host "Copying extension files to $VSCodeExtPath..." -ForegroundColor Green
Copy-Item -Recurse $SourcePath $VSCodeExtPath

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host "Please restart VSCode to activate the extension." -ForegroundColor Cyan
