@echo off
REM Local build script - injects environment variable into config.js
REM Set IMAGE_UPLOAD_TOKEN environment variable before running this

if "%IMAGE_UPLOAD_TOKEN%"=="" (
    echo ERROR: IMAGE_UPLOAD_TOKEN environment variable is not set
    echo Please set it with: set IMAGE_UPLOAD_TOKEN=your_token_here
    pause
    exit /b 1
)

echo Injecting token into config.js...
powershell -Command "(Get-Content config.js) -replace '{{IMAGE_UPLOAD_TOKEN}}', '%IMAGE_UPLOAD_TOKEN%' | Set-Content config.js"

echo Build complete! You can now open index.html locally.
echo To reset: run git checkout config.js
pause