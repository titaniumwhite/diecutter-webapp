const cluster = require('cluster');

if (cluster.isMaster) {
  
  cluster.fork();
  
  cluster.on('exit', function(worker) {
    console.log('Worker ' + worker.id + ' died...');
    cluster.fork();
  });

} else {

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

  app.post('/explore', async function(req, res) {
    res.sendStatus(204);
    noblejs.explore();
  });

  function eventSource_handler() {
    app.get('/status', function(req, res) {
      console.log('Got /offline');
      res.set({
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive'
      });
      res.flushHeaders();

      // tell the client to retry every 3 seconds if connectivity is lost
      res.write('retry: 3000\n\n');

      noblejs.statusEmitter.on('reset', () => {
        console.log('Got /reset');
        res.write('data: reset\n\n');
      });

      noblejs.statusEmitter.on('connecting', () => {
        console.log('Got /connecting');
        res.write('data: connecting\n\n');
      });

      noblejs.statusEmitter.on('connected', () => {
        console.log('Got /connected');
        res.write('data: connected\n\n');
      });

      statusEmitterApp.on('error-no_usb', () => {
        console.log('Got /error-no_usb');
        res.write('data: error-no_usb\n\n');
      });
    });
  }

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception ', err.message);
    if (err.message == 'LIBUSB_TRANSFER_STALL' || err.message == 'No compatible USB Bluetooth 4.0 device found!') {
      statusEmitterApp.emit('error-no_usb');
    }

    // exit the process after having shown the error message
    setTimeout(() => {process.exit(1);}, 100); 
  })

  server.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
  });

}