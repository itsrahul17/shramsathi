# ShramSathi Automatic Backup Script (PowerShell)
# This script automatically commits and pushes changes to GitHub

Write-Host "================================" -ForegroundColor Cyan
Write-Host "ShramSathi Auto Backup Starting" -ForegroundColor Cyan  
Write-Host "================================" -ForegroundColor Cyan

# Check if there are any changes
$changes = git status --porcelain

if (-not $changes) {
    Write-Host "No changes detected. Backup not needed." -ForegroundColor Yellow
    Write-Host "================================" -ForegroundColor Cyan
    Read-Host "Press Enter to continue"
    exit
}

Write-Host "Changes detected. Starting backup..." -ForegroundColor Green

# Add all changes
Write-Host "Adding files to git..." -ForegroundColor Yellow
git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to add files to git" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

# Create commit with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = "auto-backup: ShramSathi updates $timestamp"

Write-Host "Creating commit..." -ForegroundColor Yellow
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create commit" -ForegroundColor Red
    Read-Host "Press Enter to continue" 
    exit 1
}

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to push to GitHub" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
Write-Host "✅ Changes pushed to GitHub" -ForegroundColor Green  
Write-Host "✅ Your code is now safe in the cloud" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan

# Also deploy to Firebase if requested
$deploy = Read-Host "Deploy to Firebase? (y/n)"
if ($deploy -eq "y" -or $deploy -eq "Y") {
    Write-Host "Building and deploying to Firebase..." -ForegroundColor Yellow
    npm run export
    if ($LASTEXITCODE -eq 0) {
        firebase deploy --only hosting
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Successfully deployed to Firebase!" -ForegroundColor Green
            Write-Host "🌐 Live at: https://shramsathi-ea4b0.web.app" -ForegroundColor Cyan
        }
    }
}

Read-Host "Press Enter to continue"