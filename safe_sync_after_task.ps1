param(
    [Parameter(Mandatory = $true)]
    [string]$summaryText,

    [string]$branch = "main",

    [switch]$SkipBackendTests,
    [switch]$SkipFrontendBuild
)

$ErrorActionPreference = "Stop"

$projectPath = $PSScriptRoot
$backendPath = Join-Path $projectPath "apps\backend"
$frontendPath = Join-Path $projectPath "apps\frontend"
$logFolder = Join-Path $projectPath "project_backups"
$corepackHome = Join-Path $projectPath ".corepack-cache"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logFile = Join-Path $logFolder "sync_$timestamp.log"
$nodePath = "C:\Program Files\nodejs"
$nodeExe = Join-Path $nodePath "node.exe"

if (!(Test-Path $logFolder)) {
    New-Item -ItemType Directory -Path $logFolder -Force | Out-Null
}

if (!(Test-Path $corepackHome)) {
    New-Item -ItemType Directory -Path $corepackHome -Force | Out-Null
}

function Write-Log {
    param([string]$message)
    $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $message
    $line | Tee-Object -FilePath $logFile -Append
}

function Invoke-Step {
    param(
        [string]$label,
        [scriptblock]$action
    )

    Write-Log "START: $label"
    & $action
    Write-Log "DONE:  $label"
}

function Invoke-ProjectCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    $commandText = @(
        '$ErrorActionPreference = ''Stop'''
        '$env:PATH=''C:\Program Files\nodejs;'' + $env:PATH'
        '$env:COREPACK_HOME=''' + $corepackHome + ''''
        "Set-Location '$WorkingDirectory'"
        $Command
        'exit $LASTEXITCODE'
    ) -join '; '

    Write-Log ("CMD: {0}" -f $Command)
    & powershell -NoProfile -ExecutionPolicy Bypass -Command $commandText
    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

function Get-GhCommand {
    $candidates = @(
        "gh",
        "C:\Program Files\GitHub CLI\gh.exe"
    )

    foreach ($candidate in $candidates) {
        try {
            if ($candidate -eq "gh") {
                $command = Get-Command gh -ErrorAction Stop
                return $command.Source
            }

            if (Test-Path $candidate) {
                return $candidate
            }
        } catch {
        }
    }

    return $null
}

Set-Location $projectPath

Invoke-Step "Backup and summary" {
    & (Join-Path $projectPath "backup_and_summary.ps1") -summaryText $summaryText
}

Invoke-Step "Frontend lint" {
    Invoke-ProjectCommand `
        -WorkingDirectory $frontendPath `
        -Command "& 'C:\Program Files\nodejs\corepack.cmd' pnpm lint" `
        -FailureMessage "Frontend lint failed."
}

Invoke-Step "Backend build" {
    Invoke-ProjectCommand `
        -WorkingDirectory $backendPath `
        -Command "& '$nodeExe' -e ""const fs=require('fs');['dist','tsconfig.build.tsbuildinfo'].forEach((p)=>fs.rmSync(p,{recursive:true,force:true}));""; & '.\node_modules\.bin\nest.cmd' build" `
        -FailureMessage "Backend build failed."
}

if (-not $SkipBackendTests) {
    Invoke-Step "Backend tests" {
        Invoke-ProjectCommand `
            -WorkingDirectory $backendPath `
            -Command "& '$nodeExe' --test test/run-specs.cjs" `
            -FailureMessage "Backend tests failed."
    }
}

if (-not $SkipFrontendBuild) {
    Invoke-Step "Frontend build" {
        Invoke-ProjectCommand `
            -WorkingDirectory $frontendPath `
            -Command "& 'C:\Program Files\nodejs\corepack.cmd' pnpm build" `
            -FailureMessage "Frontend build failed."
    }
}

$ghCommand = Get-GhCommand
if ($ghCommand) {
    Invoke-Step "GitHub CLI auth setup" {
        & $ghCommand auth setup-git
        if ($LASTEXITCODE -ne 0) {
            throw "GitHub CLI auth setup failed."
        }
    }
} else {
    Write-Log "GitHub CLI not found. Continuing with existing Git credentials."
}

$statusOutput = git status --short
if ($LASTEXITCODE -ne 0) {
    throw "Failed to read git status."
}

if (-not $statusOutput) {
    Write-Log "No git changes detected after validation. Nothing to commit or push."
    exit 0
}

Invoke-Step "Git add" {
    git add -A
    if ($LASTEXITCODE -ne 0) {
        throw "Git add failed."
    }
}

$postAddStatus = git status --short
if ($LASTEXITCODE -ne 0) {
    throw "Failed to read git status after git add."
}

if (-not $postAddStatus) {
    Write-Log "Nothing staged after git add. Exiting."
    exit 0
}

$commitMessage = "auto-sync: $timestamp"
Invoke-Step "Git commit" {
    git commit -m $commitMessage
    if ($LASTEXITCODE -ne 0) {
        throw "Git commit failed."
    }
}

Invoke-Step "Git push" {
    git push origin $branch
    if ($LASTEXITCODE -ne 0) {
        throw "Git push failed."
    }
}

Write-Log "Safe sync completed successfully."
