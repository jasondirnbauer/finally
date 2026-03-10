$ErrorActionPreference = "Stop"

$ContainerName = "finally"
$ImageName = "finally"
$VolumeName = "finally-data"
$Port = 8000

Set-Location (Split-Path $PSScriptRoot)

# Verify Docker is running
try {
    docker info 2>$null | Out-Null
} catch {
    Write-Host "Error: Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Build if image doesn't exist or --build flag passed
$shouldBuild = $args -contains "--build"
if (-not $shouldBuild) {
    try {
        docker image inspect $ImageName 2>$null | Out-Null
    } catch {
        $shouldBuild = $true
    }
}
if ($shouldBuild) {
    Write-Host "Building Docker image..."
    docker build -t $ImageName .
}

# Stop existing container if running
$running = docker ps -q -f "name=$ContainerName"
if ($running) {
    Write-Host "Stopping existing container..."
    docker stop $ContainerName | Out-Null
    docker rm $ContainerName | Out-Null
}

# Remove stopped container with same name
$stopped = docker ps -aq -f "name=$ContainerName"
if ($stopped) {
    docker rm $ContainerName | Out-Null
}

# Check for .env file
$envArgs = @()
if (Test-Path .env) {
    $envArgs = @("--env-file", ".env")
}

Write-Host "Starting FinAlly..."
docker run -d `
    --name $ContainerName `
    -p "${Port}:8000" `
    -v "${VolumeName}:/app/db" `
    @envArgs `
    $ImageName

Write-Host ""
Write-Host "FinAlly is running at http://localhost:$Port"
Write-Host ""

# Open browser
Start-Process "http://localhost:$Port"
