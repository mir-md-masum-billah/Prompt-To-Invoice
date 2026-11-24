@echo off
powershell -NoProfile -Command "$exclude=@('node_modules','.next','.git','dist','build','.vercel','.turbo','coverage'); Get-ChildItem -Force | Where-Object {$_.Name -notin $exclude} | Compress-Archive -DestinationPath '../project-upload.zip' -Force"
echo.
echo ZIP Created Successfully!
pause