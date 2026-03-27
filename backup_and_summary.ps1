param(
    [string]$summaryText = "No summary provided"
)

$projectPath = $PSScriptRoot
$backupFolder = Join-Path $projectPath "project_backups"

if (!(Test-Path $backupFolder)) {
    New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = Join-Path $backupFolder "backup_$timestamp.zip"
$summaryFile = Join-Path $backupFolder "summary_$timestamp.txt"
$stagingDir = Join-Path $env:TEMP "codex_backup_stage_$timestamp"

if (Test-Path $stagingDir) {
    Remove-Item $stagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null

robocopy $projectPath $stagingDir /E /XD project_backups node_modules .next dist .git /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null

if (Test-Path $backupFile) {
    Remove-Item $backupFile -Force
}

Compress-Archive -Path (Join-Path $stagingDir '*') -DestinationPath $backupFile -Force
Remove-Item $stagingDir -Recurse -Force

$summaryText | Out-File $summaryFile -Encoding utf8

Write-Output "Backup created: $backupFile"
Write-Output "Summary file created: $summaryFile"
