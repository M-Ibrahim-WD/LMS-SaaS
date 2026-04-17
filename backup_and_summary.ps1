param(
    [string]$summaryText = "No summary provided"
)

$currentPolicy = Get-ExecutionPolicy
if ($currentPolicy -eq "Restricted" -or $currentPolicy -eq "AllSigned") {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath -summaryText $summaryText
    exit $LASTEXITCODE
}

$ErrorActionPreference = "Stop"

$projectPath = $PSScriptRoot
$backupFolder = Join-Path $projectPath "project_backups"

if (!(Test-Path $backupFolder)) {
    New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = Join-Path $backupFolder "backup_$timestamp.zip"
$summaryFile = Join-Path $backupFolder "summary_$timestamp.txt"
$stagingDir = Join-Path $env:TEMP "codex_backup_stage_$timestamp"
$branchName = (git -C $projectPath rev-parse --abbrev-ref HEAD) 2>$null

try {
    if (Test-Path $stagingDir) {
        Remove-Item $stagingDir -Recurse -Force
    }

    New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null

    robocopy $projectPath $stagingDir /E /XD project_backups node_modules .corepack-cache .next .next-dev .next-build dist .git uploads /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
    $robocopyExitCode = $LASTEXITCODE
    if ($robocopyExitCode -ge 8) {
        throw "Backup staging failed with robocopy exit code $robocopyExitCode."
    }

    if (Test-Path $backupFile) {
        Remove-Item $backupFile -Force
    }

    Compress-Archive -Path (Join-Path $stagingDir '*') -DestinationPath $backupFile -Force

    @(
        "Timestamp: $timestamp"
        "Branch: $branchName"
        ""
        $summaryText
    ) | Out-File $summaryFile -Encoding utf8
}
finally {
    if (Test-Path $stagingDir) {
        Remove-Item $stagingDir -Recurse -Force
    }
}

Write-Output "Backup created: $backupFile"
Write-Output "Summary file created: $summaryFile"
