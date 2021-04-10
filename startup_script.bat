@ECHO OFF
echo Launching app...
::tbd !!! MISSING INFLUX PATH && MISSING FOREVER.JSON absolute path!!!
start /B forever start .\forever.json
timeout /t 1
echo Launching browser...
start http://localhost:8000
