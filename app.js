const { EventEmitter } = require('events');
const statusEmitterApp = new EventEmitter();
const express = require('express');
const app     = express();
const path    = require('path');
const server  = require('http').createServer(app); 
const port    = 8000;
const noblejs = require('./noblejs');

app.use(express.static(path.join(__dirname, 'public')));

eventSource_handler();

app.get('/', (req, res) => { 
  res.sendFile(__dirname+"/views/home.html");
});

noblejs.start_exploring();

function eventSource_handler() {
  app.get('/status', function(req, res) {
    res.set({
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive'
    });
    res.flushHeaders();

    res.write('retry: 3000\n\n');

    noblejs.statusEmitter.on('disconnected', () => {
      res.write('data: disconnected\n\n');
    });

    noblejs.statusEmitter.on('connecting', () => {
      res.write('data: connecting\n\n');
    });

    noblejs.statusEmitter.on('connected', (address) => {
      res.write('data: ' + JSON.stringify({'event' : 'connected', 'mac' : address}) + '\n\n');
    });

    noblejs.statusEmitter.on('error_adapter_stuck', () => {
      res.write('data: error_adapter_stuck\n\n');
    });

    statusEmitterApp.on('error_no_usb', () => {
      res.write('data: error_no_usb\n\n');
    });
  });
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception ', err.message);
  if (err.message == 'LIBUSB_TRANSFER_STALL' || err.message == 'No compatible USB Bluetooth 4.0 device found!') {
    //console.error("ERRORE: l'adattatore usb bluetooth è stato rimosso. Riconnetterlo e riavviare manualmente l'applicazione.");
    statusEmitterApp.emit('error_no_usb');
  }

  // exit the process after having shown the error message
  process.exit(1);
})

server.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
