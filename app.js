// Is this a debug version?
const debug = true;
// Is this a local test version (non-factory)?
const local = false;

const express = require('express');
const app     = express();
const server  = require('http').createServer(app); 
const port    = 8000;
const noble = require('@abandonware/noble');
const influx = require('./influx');
const RuuviTag = require('./ruuvitag');
const net = require('net');

let no_ruuvi_timeout; // if there are no ruuvi packets for 20 minutes, there isn't any ruuvitag around
let adapter_stuck_timeout; // if there are no bluetooth packets for 25 minutes, the bluetooth adapter is stuck
let first_ruuvi_packet = true; // boolean to check whether it is the first packet received 
let socket_already_sent = {};  // now we support a set of ruuvitag in session via socket ...
let ruuvi_mac_in_session = {}; // ... and here in local: both are maps of (MAC_ADDRESS,boolean)
let end_session_timeout; /* if the ruuvi monitored by Flavia is out of range for 3 minutes
                            before the movement counter is set to 0, the end session message is sent */
let is_connected = false; // is python socket connected?
let ruuvi_list = [];


let mac_address_list = ["da:5b:93:12:58:30","ee:ea:4b:24:65:33","c7:02:8f:47:f2:0d","d5:65:e4:a8:89:60", 
                        "d7:05:4d:e8:6a:f9","c2:f3:33:08:5a:2f","da:bc:6e:d4:80:73", "d4:30:15:4a:ab:2d",
                        "ce:15:06:5f:7d:84", "eb:c2:54:81:1b:15", "d5:ad:35:8a:cb:d1"]
let last_session_map = {}
/*
* Commento da Marco: ma in che lingua scriviamo? Ahahahah
*/

/* Socket connection */
const client = new net.Socket();

start_exploring();

// Per ora credo siano inutili, quando vuole Gabbo le facciamo esplodere
if(!local){
  //influx.getLastRound(setRounds);
  for(mac in mac_address_list){
    influx.getLastSession(setSession,mac_address_list[mac]);
    influx.fixIncompleteSessions(mac_address_list[mac])
  }
}

function start_exploring() {

  if(!local){
    connect_to_socket();
  }

  if(debug){
    console.log("[DEBUG] Starting explore...");
  }

  explore();

  function explore() {
    noble.on('stateChange', async function (state) {
      if (state === 'poweredOn') {

        if(debug){
          console.log("[DEBUG] Waiting for noble async...");
        }

        try{
          await noble.startScanningAsync([], true);
        }catch(e){

          if(debug){
            console.log("[ERRORE] Errore nello startScanningAsync");
            console.log(e);
          }

          console.error(e);
        }
      }else if (state === 'resetting'){
        console.log("[WARN] Adapter resetting, trying again in a few seconds");
        sleep(1000);
      }else if (state === 'unknown'|| state === 'unauthorized'|| state === 'unsupported'){
        console.log("[ERROR] Adapter in unknown/unauthorized/unsupported state, exiting...");
        process.exit(1);
      } /* else if (state === 'poweredOff'){
        console.log("[WARN] Adapter Powered off, exiting...");
        process.exit(1);
      } */
    });
    
    noble.on('scanStart', function() {
      console.log("[INFO] Scanning started.");
    });

    noble.on('scanStop', function() {
      console.log("[INFO] Scanning stopped.");
      try{
        setTimeout(() => {
          noble.startScanningAsync();
        }, 60000);
      }catch(e){
        if(debug){
          console.log("[ERRORE] Errore nello StartScanningAsync dopo il timeout");
          console.log(e);
        }
        console.error(e);
      }
    });

    noble.on('discover', on_discovery);

    noble.on('warning', (message) => console.log("[WARNING] "+ message));
  }

  function on_discovery(peripheral) {


    clearTimeout(adapter_stuck_timeout);
    adapter_stuck_timeout = setInterval(recover_adapter, 1500000);

    let encoded_data = peripheral.advertisement.manufacturerData;

    if (!encoded_data || !is_ruuvi_packet(encoded_data)) 
      return;
    
    let ruuvi;
    let mac = peripheral.address;
    let rssi = peripheral.rssi;
    let decoded_data = decode(encoded_data.slice(2), mac);
    
    // if no ruuvi packets for 20 minutes, there isn't any ruuvi around
    clearTimeout(no_ruuvi_timeout);
    no_ruuvi_timeout = setTimeout(no_ruuvi_around, 1200000);

    /*
    * If ruuvi is already in ruuvi_list, take it.
    * Otherwise, create a new ruuvi and put it in the list.
    */
    ruuvi = update_or_create_ruuvi(ruuvi_list, mac, rssi, decoded_data["movement_counter"]);

    console.log(`mac: ${mac}`);
    console.log(`rounds: ${decoded_data["rounds"]}`);
    console.log(`mov_counter: ${decoded_data["movement_counter"]}`);

    console.log("printing additional debug info:");
    console.log(`time: ${(new Date()).toLocaleString()}`);
    console.log(`true speed: ${decoded_data["original_speed"]}`);
    console.log(`computed_speed: ${decoded_data["speed"]}`);
    console.log(`input data std: ${decoded_data["input_data_std"]}`);
    console.log(`max power: ${decoded_data["max_power"]}`);
    console.log(`freq std: ${decoded_data["freq_std"]}`); 

    console.log(""); 


    let closer_ruuvi = get_closer_ruuvi(ruuvi_list);

    // recognize whether the ruuvitag is in movement and set the property in_session
    if (decoded_data["movement_counter"] != 0 /*&& decoded_data["movement_counter"] != ruuvi.mov_counter)*/
    ) {
      if (ruuvi.in_session === false) {
        ruuvi.increase_session_id;
        last_session_map[ruuvi.mac] = last_session_map[ruuvi.mac] + 1
        ruuvi.in_session = true;
      }
    }
    else if (decoded_data["movement_counter"] == 0) ruuvi.in_session = false;


    // if no message has been sent to Flavia, do it
    if (ruuvi.in_session && 
      (ruuvi_mac_in_session[ruuvi.mac] === undefined || ruuvi_mac_in_session[ruuvi.mac] === false)) {

      if (socket_already_sent[ruuvi.mac] === undefined || socket_already_sent[ruuvi.mac] === false) {
        ruuvi_mac_in_session[ruuvi.mac] = true;
        socket_already_sent[ruuvi.mac] = true;
        send_to_socket(ruuvi.mac, ruuvi.session_id, ruuvi.in_session);
        console.log("[INFO] Sessione iniziata per "+ ruuvi.mac)
      }

    } else if (!ruuvi.in_session && ruuvi_mac_in_session[ruuvi.mac] !== undefined 
      && ruuvi_mac_in_session[ruuvi.mac] === true) {

      if (socket_already_sent[ruuvi.mac] === true) {
        // write on Influx the ruuvi is not in session anymore
        decoded_data["session_id"] = ruuvi.session_id;
        decoded_data["in_session"] = ruuvi.in_session;
        if(!local) influx.write(decoded_data);

        ruuvi_mac_in_session[ruuvi.mac] = false;
        socket_already_sent[ruuvi.mac] = false;      
        send_to_socket(ruuvi.mac, ruuvi.session_id, ruuvi.in_session);
        console.log("[INFO] Sessione terminata per "+ ruuvi.mac)
      }
    }

    /* if the ruuvi monitored by Flavia is out of range for 15 minutes
    before the movement counter is set to 0, the end session message is sent */
    if (ruuvi_mac_in_session[ruuvi.mac] === true && socket_already_sent[ruuvi.mac] === true) {
      clearTimeout(end_session_timeout);
      ruuvi_to_end = ruuvi;
      end_session_timeout = setTimeout(() => { end_session(ruuvi_to_end); }, 900000);
    }

    // write in the database only the packet of the closer device [WIP]
    if (ruuvi.in_session === true) {
        
      decoded_data["session_id"] = ruuvi.session_id;
      decoded_data["in_session"] = ruuvi.in_session;

      if(!local){
        try{
          influx.write(decoded_data);
        }catch(e){

          if(debug){
            console.log("[ERRORE] Errore nello scrivere su Influx");
            console.log(e);
          }
          console.error(e);

        }
      }

    }

    ruuvi.mov_counter = decoded_data["movement_counter"];

  }

  function end_session(ruuvi) {
    console.log("[INFO] End session di "+ ruuvi.mac);
    ruuvi.in_session = false;
    ruuvi_mac_in_session[ruuvi.mac] = false;

    if (socket_already_sent[ruuvi.mac]) {
      console.log("Sessione terminata, il ruuvitag in sessione non è nei paraggi da 15 minuti")
      send_to_socket(ruuvi.mac, ruuvi.session_id, ruuvi.in_session);
      socket_already_sent[ruuvi.mac] = false;
    }

    // set in_session=false for this ruuvi
    influx.fixIncompleteSessions(ruuvi.mac);
  }

  function no_ruuvi_in_session() {
    for (let i = 0; i < ruuvi_list.length; i++) {
      if (ruuvi_list[i].in_session) {
        return false;
      };
    } 
    return true;
  }

  function get_closer_ruuvi(ruuvi_list) {
    let closer_ruuvi;
    let closer_rssi = -500;
  
    for (let i = 0; i < ruuvi_list.length; i++) {
      if (ruuvi_list[i].rssi > closer_rssi) {
        closer_rssi = ruuvi_list[i].rssi;
        closer_ruuvi = ruuvi_list[i];
      };
    }
  
    return closer_ruuvi;
  }
  
  function create_ruuvi(ruuvi_list, mac, rssi, mov_counter) {
    let ruuvi = new RuuviTag(mac, rssi, false, last_session_map[mac], mov_counter);
    ruuvi_list.push(ruuvi);
    return ruuvi;
  }
   
  function update_or_create_ruuvi(ruuvi_list, mac, rssi, mov_counter){

    for (let i = 0; i < ruuvi_list.length; i++) {     
      if (mac == ruuvi_list[i].mac) {
        return ruuvi_list[i];
      };
    }

    return create_ruuvi(ruuvi_list, mac, rssi, mov_counter);
  }
  
  function decode(data, mac) {
    
    let ble_packet = {};
    
    ble_packet["mac"] = mac;
    ble_packet["data_format"] = data.slice(0, 1).readInt8();
    
    // parse environmental data
    ble_packet["temperature"] = data.slice(1, 3).readInt16BE() / 200;
    ble_packet["humidity"] = data.slice(3, 5).readUInt16BE() / 400;

    // parse debug data
    ble_packet["movement_counter"] = data.slice(7,9).readInt16BE();
    ble_packet["original_speed"] = data.slice(9,11).readInt16BE() / 1000;
    ble_packet["input_data_std"] = data.slice(11,13).readInt16BE() / 1000;
    ble_packet["max_power"] = data.slice(13,15).readInt16BE();
    ble_packet["freq_std"] = data.slice(16,18).readUInt16BE() / 1000;

    // parse rotation related data
    ble_packet["speed"] = data.slice(5, 7).readUInt16BE() / 1000;
    ble_packet["rounds"] = data.slice(18,24).readUIntBE(0,6);
  
    return ble_packet;
  }
  
  function recover_adapter() {
    console.error("[WARN] ADAPTER STUCK: cannot receive any bluetooth packet");
    try{
      noble.stopScanningAsync();
    }catch(e){
      if(debug){
        console.log("[ERRORE] Errore nello stopScanningAsync");
        console.log(e);
      }
      console.error(e);
    }
  }
  
  function no_ruuvi_around() {
    console.log("[INFO] No RuuviTag around.");
    clearInterval(no_ruuvi_timeout);
    for(mac in mac_address_list){
      influx.fixIncompleteSessions(mac_address_list[mac])
    }
    first_ruuvi_packet = true;
  }
  
  function is_ruuvi_packet(ble_raw_data) {
    let is_ruuvi_packet = Boolean(ble_raw_data && 
                    ble_raw_data.length == 26 && 
                      ble_raw_data[0] == 0x99 && 
                      ble_raw_data[1] == 0x04 && 
                      ble_raw_data[2] == 5);
  
    return is_ruuvi_packet;
  }

}

/* socket exception handling*/
client.on('error', function(err){
  is_connected = false;
  if(debug){
    console.log("[ERRORE] Errore Client")
  }
  console.log(err);

  for (let i = 0; i < ruuvi_list.length; i++) {
    if (ruuvi_list[i].mac in socket_already_sent && socket_already_sent[ruuvi_list[i].mac] === true) {
      socket_already_sent[ruuvi_list[i].mac] = false;
    }
  }

});

client.on('close', function(err) {
  sleep(10000).then(() => {
    // Connect back again after the 10s sleep!
    if(debug){
      console.log("[DEBUG] Provo a connettermi di nuovo")
    }
    connect_to_socket();
  });
})

client.on('connect', function() {
  is_connected = true;
  /* Each time python module connects, send to it all the Ruuvi in list */
  console.log("[INFO] Modulo Python connesso, invio i Ruuvi in sessione ");
  for (let i = 0; i < ruuvi_list.length; i++) {
    if (ruuvi_list[i].in_session && socket_already_sent[ruuvi_list[i].mac] === false) {
      send_to_socket(ruuvi_list[i].mac, ruuvi_list[i].session_id, ruuvi_list[i].in_session)
      socket_already_sent[ruuvi_list[i].mac] = true
    };
  }
})

/* Wrap the connect function */
function connect_to_socket(){
  if(!is_connected){           
    client.connect(2345, '127.0.0.1');
  }
}

function send_to_socket(socket_current_mac, session_id, in_session) {
  let packet = JSON.stringify({
    diecutter_id : socket_current_mac,
    session_id : session_id,
    in_session : in_session
  });

  console.log("[INFO] INVIATO " + packet);

  if(!local){
    if(is_connected){
      try{
        client.write(packet);
      }catch(e){

        if(debug){
          console.log("[ERRORE] Errore nell'invio pacchetti con socket");
          console.log(e);
        }

        console.error(e);
      } 
    }else{
      console.log("[WARN] Ho provato a mandare dati alla socket ma non sono connesso")
    }
  }
}



/* sleep utility function */
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function setRounds(result){
  last_round_value = result;
}

function setSession(result,mac){
  console.log("[INFO] "+mac+" last session_id: "+result)
  last_session_map[mac] = result;
}

/* maybe unhandled promises detector will help debugging? */
process.on('unhandledRejection', (reason, promise) => {
  console.log('[WARN] Unhandled Rejection at:', promise, 'reason:', reason);
});

/* last resort exception handling*/
process.on('uncaughtException', (err) => {
  if(debug){
    console.log('[DEBUG] Eccezione lanciata: '+err);
    console.log('[DEBUG] Vedere i log per più info');
  }
  
  if (err.message == 'LIBUSB_TRANSFER_STALL' || err.message == 'No compatible USB Bluetooth 4.0 device found!') {
    console.error("[ERRORE] l'adattatore usb bluetooth è stato rimosso. Riconnetterlo e riavviare manualmente l'applicazione.");
  }else if(err.message == 'LIBUSB_ERROR_NOT_SUPPORTED'){
    console.error("[ERRORE] driver USB non installati correttamente/nessun adattatore bt inserito");
  }else{
    console.error('[ERROR] Uncaught exception ', err.message);
  }

  // exit the process after having shown the error message
  process.exit(1);
})

server.listen(port, () => {
  console.log(`[INFO] Listening at http://localhost:${port}`);
});