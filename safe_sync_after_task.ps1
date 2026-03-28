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
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logFile = Join-Path $logFolder "sync_$timestamp.log"
$nodePath = "C:\Program Files\nodejs"
$corepackCmd = Join-Path $nodePath "corepack.cmd"
$pnpmCmd = Join-Path $nodePath "pnpm.cmd"
$corepackHome = Join-Path $projectPath ".corepack-cache"

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

function Invoke-FrontendBuildValidation {
    param(
        [string]$frontendPath,
        [string]$timestamp
    )

    $originalDistDir = $env:NEXT_DIST_DIR
    $validationDistDir = ".next-build-sync-$timestamp"
    $tsconfigPath = Join-Path $frontendPath "tsconfig.json"
    $nextEnvPath = Join-Path $frontendPath "next-env.d.ts"
    $originalTsconfig = if (Test-Path $tsconfigPath) { Get-Content -Raw $tsconfigPath } else { $null }
    $originalNextEnv = if (Test-Path $nextEnvPath) { Get-Content -Raw $nextEnvPath } else { $null }

    try {
        Set-Location $frontendPath
        $env:NEXT_DIST_DIR = $validationDistDir
        if (Test-Path $validationDistDir) {
            Remove-Item $validationDistDir -Recurse -Force -ErrorAction SilentlyContinue
        }

        $command = "`$env:PATH='$nodePath;' + `$env:PATH; `$env:COREPACK_HOME='$corepackHome'; `$env:NEXT_DIST_DIR='$validationDistDir'; Set-Location '$frontendPath'; & '$corepackCmd' pnpm exec next build"
        powershell -NoProfile -Command $command
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend build failed."
        }
    } finally {
        if ($null -ne $originalTsconfig) {
            Set-Content -Path $tsconfigPath -Value $originalTsconfig -NoNewline
        }

        if ($null -ne $originalNextEnv) {
            Set-Content -Path $nextEnvPath -Value $originalNextEnv -NoNewline
        }

        if ($null -ne $originalDistDir) {
            $env:NEXT_DIST_DIR = $originalDistDir
        } else {
            Remove-Item Env:NEXT_DIST_DIR -ErrorAction SilentlyContinue
        }

        if (Test-Path (Join-Path $frontendPath $validationDistDir)) {
            Remove-Item (Join-Path $frontendPath $validationDistDir) -Recurse -Force -ErrorAction SilentlyContinue
        }

        Set-Location $projectPath
    }
}

function Invoke-Pnpm {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $escapedArguments = $Arguments | ForEach-Object {
        if ($_ -match '\s') {
            "'$_'"
        } else {
            $_
        }
    }
    $argumentString = [string]::Join(" ", $escapedArguments)
    $command = "`$env:PATH='$nodePath;' + `$env:PATH; `$env:COREPACK_HOME='$corepackHome'; & '$corepackCmd' $argumentString"
    powershell -NoProfile -Command $command
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
    Invoke-Pnpm -Arguments @("pnpm", "--filter", "@lms/frontend", "lint")
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend lint failed."
    }
}

Invoke-Step "Backend build" {
    Invoke-Pnpm -Arguments @("pnpm", "--filter", "@lms/backend", "build")
    if ($LASTEXITCODE -ne 0) {
        throw "Backend build failed."
    }
}

if (-not $SkipBackendTests) {
    Invoke-Step "Backend tests" {
        Invoke-Pnpm -Arguments @("pnpm", "--filter", "@lms/backend", "test")
        if ($LASTEXITCODE -ne 0) {
            throw "Backend tests failed."
        }
    }
}

if (-not $SkipFrontendBuild) {
    Invoke-Step "Frontend build" {
        Invoke-FrontendBuildValidation -frontendPath $frontendPath -timestamp $timestamp
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
