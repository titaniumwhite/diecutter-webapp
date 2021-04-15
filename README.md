# Diecutter WebApp

Web Application per acquisire dati da dispositivo RuuviTag tramite [Noble.js](https://github.com/abandonware/noble).

# Prerequisiti
* Node.js
* [Noble.js](https://github.com/abandonware/noble) [gestito da @abandonware]
* [node-influx](https://github.com/node-influx/node-influx)

# Avvio
## Nodemon (sviluppo)
Nodemon permette di avviare l'applicazione e di riavviarla automaticamente ogni volta che ci sono cambiamenti nel codice.
Il comando per avviare l'applicazione tramite Nodemon è
```
npm start
```

## Pm2 (produzione)
Per avviare il processo tramite pm2 viene usato ```pm2 start ecosystem.config.js```.
Per fermare il processo tramite pm2 viene usato ```pm2 stop ecosystem.config.js```.
Possibile anche usare _delete_ per rimuovere un processo o _restart_ per farlo avviare nuovamente.
Infine, in una nuova PowerShell, tramite il comando ```pm2 monit``` si avrà un chiaro grafico di ciò che sta accadendo (consigliato usarlo).

# Compatibilità
* node-influx è compatibile solo con InfluxDB 1.x.x. L'ultima versione di InfluxDB disponibile per Windows è 1.8.4.
* Noble.js su Windows richiede necessariamente un [dongle usb compatibile.](https://github.com/abandonware/node-bluetooth-hci-socket#windows) Maggiori informazioni sull'installazione si trovano nel Readme di Noble.js.
* E' presente l'API [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource). EventSource non è compatibile con Internet Explorer.

# Script all'avvio
Per fare in modo che l'applicazione parta in automatico all'avvio del pc, premere WINDOWS+R, digitare

```
shell:startup
```
e incollare [startup_script.bat](./startup_script.bat) avendo cura di specificare i corretti path per il dispositivo corrente.
