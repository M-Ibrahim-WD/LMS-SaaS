param(
    [Parameter(Mandatory = $true)]
    [string]$summaryText,

    [string]$branch = "",

    [switch]$SkipBackendTests,
    [switch]$SkipFrontendBuild
)

$currentPolicy = Get-ExecutionPolicy
if ($currentPolicy -eq "Restricted" -or $currentPolicy -eq "AllSigned") {
    $argList = @(
        "-NoProfile"
        "-ExecutionPolicy"
        "Bypass"
        "-File"
        $PSCommandPath
        "-summaryText"
        $summaryText
    )

    if ($branch) {
        $argList += @("-branch", $branch)
    }
    if ($SkipBackendTests) {
        $argList += "-SkipBackendTests"
    }
    if ($SkipFrontendBuild) {
        $argList += "-SkipFrontendBuild"
    }

    & powershell @argList
    exit $LASTEXITCODE
}

$ErrorActionPreference = "Stop"

$projectPath = $PSScriptRoot
$backendPath = Join-Path $projectPath "apps\backend"
$frontendPath = Join-Path $projectPath "apps\frontend"
$logFolder = Join-Path $projectPath "project_backups"
$pnpmStorePath = Join-Path $projectPath "node_modules\.pnpm"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logFile = Join-Path $logFolder "sync_$timestamp.log"
$nodeExe = Join-Path "C:\Program Files\nodejs" "node.exe"

if (!(Test-Path $logFolder)) {
    New-Item -ItemType Directory -Path $logFolder -Force | Out-Null
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

function Resolve-PnpmEntryScript {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PackagePattern,
        [Parameter(Mandatory = $true)]
        [string]$RelativeEntry
    )

    $packageDirs = Get-ChildItem -Path $pnpmStorePath -Directory -Filter $PackagePattern -ErrorAction Stop |
        Sort-Object Name -Descending

    if (-not $packageDirs) {
        throw "Unable to find package '$PackagePattern' under $pnpmStorePath."
    }

    foreach ($packageDir in $packageDirs) {
        $entryPath = Join-Path $packageDir.FullName $RelativeEntry
        if (Test-Path $entryPath) {
            return $entryPath
        }
    }

    throw "Unable to find entry script '$RelativeEntry' under any package matching '$PackagePattern'."
}

function Resolve-PreferredScriptPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PreferredPath,
        [Parameter(Mandatory = $true)]
        [string]$PackagePattern,
        [Parameter(Mandatory = $true)]
        [string]$RelativeEntry
    )

    if (Test-Path $PreferredPath) {
        return $PreferredPath
    }

    return Resolve-PnpmEntryScript -PackagePattern $PackagePattern -RelativeEntry $RelativeEntry
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
        }
        catch {
        }
    }

    return $null
}

function Resolve-TargetBranch {
    param([string]$RequestedBranch)

    if ($RequestedBranch -and $RequestedBranch.Trim()) {
        return $RequestedBranch.Trim()
    }

    $currentBranch = git rev-parse --abbrev-ref HEAD
    if ($LASTEXITCODE -ne 0 -or -not $currentBranch) {
        throw "Unable to determine the current git branch."
    }

    return $currentBranch.Trim()
}

Set-Location $projectPath
$targetBranch = Resolve-TargetBranch -RequestedBranch $branch

Invoke-Step "Backup and summary" {
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $projectPath "backup_and_summary.ps1") -summaryText $summaryText
    if ($LASTEXITCODE -ne 0) {
        throw "Backup and summary step failed."
    }
}

$frontendTscScript = Resolve-PreferredScriptPath `
    -PreferredPath (Join-Path $frontendPath "node_modules\typescript\lib\tsc.js") `
    -PackagePattern "typescript@*" `
    -RelativeEntry "node_modules\typescript\lib\tsc.js"
$nextBuildScript = Resolve-PreferredScriptPath `
    -PreferredPath (Join-Path $frontendPath "node_modules\next\dist\bin\next") `
    -PackagePattern "next@*" `
    -RelativeEntry "node_modules\next\dist\bin\next"
$nestCliScript = Resolve-PreferredScriptPath `
    -PreferredPath (Join-Path $backendPath "node_modules\@nestjs\cli\bin\nest.js") `
    -PackagePattern "@nestjs+cli@*" `
    -RelativeEntry "node_modules\@nestjs\cli\bin\nest.js"
$backendBuildCommand = 'Remove-Item -Recurse -Force ''dist'' -ErrorAction SilentlyContinue; Remove-Item -Force ''tsconfig.build.tsbuildinfo'' -ErrorAction SilentlyContinue; & ''{0}'' ''{1}'' build' -f $nodeExe, $nestCliScript
$frontendBuildCommand = '$env:NEXT_DIST_DIR=''.next-build''; & ''{0}'' ''{1}'' build' -f $nodeExe, $nextBuildScript

Invoke-Step "Frontend lint" {
    Invoke-ProjectCommand `
        -WorkingDirectory $frontendPath `
        -Command "& '$nodeExe' '$frontendTscScript' --noEmit -p 'tsconfig.lint.json'" `
        -FailureMessage "Frontend lint failed."
}

Invoke-Step "Backend build" {
    Invoke-ProjectCommand `
        -WorkingDirectory $backendPath `
        -Command $backendBuildCommand `
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
            -Command $frontendBuildCommand `
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
}
else {
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
    git push origin $targetBranch
    if ($LASTEXITCODE -ne 0) {
        throw "Git push failed."
    }
}

Write-Log "Safe sync completed successfully."
