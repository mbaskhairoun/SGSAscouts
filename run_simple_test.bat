@echo off
echo ===================================================
echo MailerSend Simple Email Test
echo ===================================================
echo.
echo INSTRUCTIONS:
echo 1. Replace YOUR_API_TOKEN_HERE with your actual MailerSend API token
echo 2. Save this file
echo 3. Double-click to run the test
echo.
echo Your API token should start with "mlsn." and can be found at:
echo https://app.mailersend.com - Settings - API Tokens
echo.
echo ===================================================

REM Replace YOUR_API_TOKEN_HERE with your actual MailerSend API token
set MAILERSEND_API_TOKEN=YOUR_API_TOKEN_HERE

if "%MAILERSEND_API_TOKEN%"=="YOUR_API_TOKEN_HERE" (
    echo [ERROR] Please edit this file and replace YOUR_API_TOKEN_HERE with your actual API token
    echo.
    pause
    exit /b 1
)

echo [INFO] API Token set, running test...
echo.

python test_mailersend.py

echo.
echo Test completed. Press any key to close...
pause