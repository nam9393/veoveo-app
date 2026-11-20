$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$rootDir = $PSScriptRoot
$publicDir = Join-Path $rootDir "public"
$docsDir = Join-Path $rootDir "docs"

if (-not (Test-Path $publicDir)) {
    New-Item -ItemType Directory -Path $publicDir -Force | Out-Null
}

$sourceZip = Join-Path $publicDir "veoveo-app-source.zip"
$webZip = Join-Path $publicDir "veoveo-app-web-dist.zip"

Write-Host "Creating $sourceZip..."
$tempSourceDir = Join-Path $env:TEMP ("veo_source_" + [System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempSourceDir -Force | Out-Null

$exclude = @('node_modules', '.git', '.cache', 'dist', 'coverage', '.aistudio', 'repo.zip', 'download.ps1')

Get-ChildItem -Path $rootDir | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $tempSourceDir -Recurse -Force
}

# Clean any existing zips from the temp public folder
Get-ChildItem -Path (Join-Path $tempSourceDir "public") -Filter "*.zip" -ErrorAction SilentlyContinue | Remove-Item -Force

if (Test-Path $sourceZip) { Remove-Item $sourceZip -Force }
Compress-Archive -Path "$tempSourceDir\*" -DestinationPath $sourceZip -CompressionLevel Optimal
Remove-Item -Path $tempSourceDir -Recurse -Force
Write-Host "Source package created successfully at $sourceZip ($( [math]::Round((Get-Item $sourceZip).Length / 1KB, 1) ) KB)"

# 2. Package Web Dist
if (Test-Path $docsDir) {
    Write-Host "Creating $webZip from $docsDir..."
    if (Test-Path $webZip) { Remove-Item $webZip -Force }
    Compress-Archive -Path "$docsDir\*" -DestinationPath $webZip -CompressionLevel Optimal
    Write-Host "Web dist package created successfully at $webZip ($( [math]::Round((Get-Item $webZip).Length / 1KB, 1) ) KB)"
}

# 3. Copy both zips to docs
if (Test-Path $docsDir) {
    Copy-Item $sourceZip $docsDir -Force
    Copy-Item $webZip $docsDir -Force
    Write-Host "Copied packages to $docsDir successfully."
}
