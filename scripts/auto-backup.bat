@echo off
REM ShramSathi Automatic Backup Script
REM This script automatically commits and pushes changes to GitHub

echo ================================
echo ShramSathi Auto Backup Starting
echo ================================

REM Check if there are any changes
git status --porcelain > temp_status.txt
set /p changes=<temp_status.txt
del temp_status.txt

if "%changes%"=="" (
    echo No changes detected. Backup not needed.
    echo ================================
    pause
    exit /b
)

echo Changes detected. Starting backup...

REM Add all changes
echo Adding files to git...
git add .

if %errorlevel% neq 0 (
    echo ERROR: Failed to add files to git
    pause
    exit /b 1
)

REM Create commit with timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"

set "timestamp=%YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%"

echo Creating commit...
git commit -m "auto-backup: ShramSathi updates %timestamp%"

if %errorlevel% neq 0 (
    echo ERROR: Failed to create commit
    pause
    exit /b 1
)

REM Push to GitHub
echo Pushing to GitHub...
git push origin main

if %errorlevel% neq 0 (
    echo ERROR: Failed to push to GitHub
    pause
    exit /b 1
)

echo ================================
echo ✅ Backup completed successfully!
echo ✅ Changes pushed to GitHub
echo ✅ Your code is now safe in the cloud
echo ================================
pause