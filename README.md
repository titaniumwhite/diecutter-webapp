# Diecutter WebApp

Web Application per acquisire dati da dispositivo RuuviTag tramite [Noble.js](https://github.com/abandonware/noble).

# Prerequisiti
* Node.js
* [Noble.js](https://github.com/abandonware/noble) [gestito da @abandonware]
* [node-influx](https://github.com/node-influx/node-influx)

# Compatibilità
* node-influx è compatibile solo con InfluxDB 1.x.x. L'ultima versione di InfluxDB disponibile per Windows è 1.8.4.
* Noble.js su Windows richiede necessariamente un [dongle usb compatibile.](https://github.com/abandonware/node-bluetooth-hci-socket#windows) Maggiori informazioni sull'installazione si trovano nel Readme di Noble.js.
* E' presente l'API [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource). EventSource non è compatibile con Internet Explorer.
