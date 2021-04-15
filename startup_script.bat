@ECHO OFF
echo Launching app...
::tbd !!! MISSING INFLUX PATH && MISSING FOREVER.JSON absolute path!!!
start /B start C:\Users\Name\Desktop\influxdb-1.8.3-1\influxd.exe
timeout /t 1
start /B pm2 start C:\Users\Name\Desktop\diecutter-webapp\ecosystem.config.js
timeout /t 1
echo Launching browser...
start http://localhost:8000
