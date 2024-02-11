# RuuviTag WebApp for Bluetooth connection
The following project has been developed with the aim of acquiring data from an IoT RuuviTag device through a Bluetooth connection using [Noble.js(https://github.com/abandonware/noble).

## Requirements
* Node.js
* [Noble.js](https://github.com/abandonware/noble) [gestito da @abandonware]
* [node-influx](https://github.com/node-influx/node-influx)

## Start
### Nodemon (development)
Nodemon allows to start and automatically restart the WebApp any time the code changes.
The command to start the WebApp through Nodemon is

```
npm start
```

### Pm2 (production)
To start the process through pm2 it is used ```pm2 start ecosystem.config.js```.
To stop the process through pm2 it is used ```pm2 stop ecosystem.config.js```.
It's possible to use _delete_ to remove the process or _restart_ to make it start automatically again if interrupted. 
In a new command line it is possible to monitor the process through ```pm2 monit```.

## Compatibility
* node-influx is compatible only with InfluxDB 1.x.x.
* Noble.js on Windows requires a [compatible dongle usb](https://github.com/abandonware/node-bluetooth-hci-socket#windows) More info about that can be found on the Readme of Noble.js.
* It is used the API [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource). EventSource is not ocmpatible with Internet Explorer.


## Startup Script (Windows)
It is possible to find a startup script on [startup_script.bat](./startup_script.bat).
