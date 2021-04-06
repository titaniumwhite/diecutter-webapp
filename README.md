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

## Forever (produzione)
Forever viene utilizzato per mantenere un server attivo, anche quando crasha o si stoppa inaspettatamente. Forever trasforma il server in un processo demone, trasformandolo a tutti gli effetti in un servizio. E' stata creata una cartella dove verranno mantenuti tutti i log.
Per avviare l'applicazione tramite Forever viene usato ```forever start forever.json```.
Per fermare tutti i processi creati da Forever viene usato ```forever stopall```.
Per visualizzare sulla Windows PowerShell i console.log in real-time, si può usare ```Get-Content /path/to/logfile.log -Wait -Tail 1000```.

# Compatibilità
* node-influx è compatibile solo con InfluxDB 1.x.x. L'ultima versione di InfluxDB disponibile per Windows è 1.8.4.
* Noble.js su Windows richiede necessariamente un [dongle usb compatibile.](https://github.com/abandonware/node-bluetooth-hci-socket#windows) Maggiori informazioni sull'installazione si trovano nel Readme di Noble.js.
* E' presente l'API [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource). EventSource non è compatibile con Internet Explorer.
