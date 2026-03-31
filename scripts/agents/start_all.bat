@echo off
echo Starting War Room Agents in Windows Terminal tabs...
echo.

wt new-tab --title "CEO Agent" cmd /k "cd /d C:\Users\Jennie Chu\Desktop\Projects\paperclip && claude --dangerously-skip-permissions --model sonnet"
timeout /t 2 >nul

wt new-tab --title "Majordomo Agent" cmd /k "cd /d C:\Users\Jennie Chu\Desktop\Projects\paperclip && claude --dangerously-skip-permissions --model sonnet"
timeout /t 2 >nul

wt new-tab --title "Sales Closer Agent" cmd /k "cd /d C:\Users\Jennie Chu\Desktop\Projects\paperclip && claude --dangerously-skip-permissions --model sonnet"
timeout /t 2 >nul

wt new-tab --title "Customer Success Agent" cmd /k "cd /d C:\Users\Jennie Chu\Desktop\Projects\paperclip && claude --dangerously-skip-permissions --model sonnet"
timeout /t 2 >nul

wt new-tab --title "Content Strategist Agent" cmd /k "cd /d C:\Users\Jennie Chu\Desktop\Projects\paperclip && claude --dangerously-skip-permissions --model sonnet"

echo.
echo 5 agent tabs opened. Paste agent prompts from:
echo   scripts\agents\prompts\
echo.
pause
