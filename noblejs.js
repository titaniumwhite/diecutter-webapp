/*
* TODO : prendere l'ultimo session id con una get.
* todo : inviare un pacchetto quando inizia sessione e quando finisce sessione.
* TODO : gestire i casi con più ruuvitag.
* TODO : pulire il codice, eliminare le variabili globali.
*/

const noble = require('@abandonware/noble');
const influx = require('./influx');
const RuuviTag = require('./ruuvitag');
const { EventEmitter } = require('events');
const net = require('net');
const KalmanFilter = require('kalmanjs');

const statusEmitter = new EventEmitter();
const client = new net.Socket();

// Kalman Settings
const R = 0.01;
const Q = 3;

let temporary_list = [];
let update_ruuvi_list_timeout; // after 15 seconds, delete the unnecessary objects in the dectionary and initialize the list
let no_ruuvi_timeout; // if there are no ruuvi packets for 120 seconds, there isn't any ruuvitag around
let adapter_stuck_timeout; // if there are no bluetooth packets for 4 minutes, the bluetooth adapter is stuck
let first_ruuvi_packet = true; // boolean to check whether it is the first packet received 
let last_round_value = -1;
let last_movement_counter = 0;
let socket_already_sent = false;
let socket_current_mac; // diecutter_id
/*
client.connect(2345, '127.0.0.1', function() {
  console.log("Connected to Python module");
})
*/
influx.getLastRound(setRounds);
influx.getLastSession(setSession);

function start_exploring() {
  let ruuvi_list = [];
  explore();

  function explore() {
    noble.on('stateChange', async function (state) {
      if (state === 'poweredOn') {
        await noble.startScanningAsync([], true);
      }
    });
    
    noble.on('scanStart', function() {
      console.log("Scanning started.");
      statusEmitter.emit('connecting');
    });

    noble.on('scanStop', function() {
      console.log("Scanning stopped.");
      setTimeout(() => {
        noble.startScanningAsync();
      }, 60000)
    });

    noble.on('discover', on_discovery);
  }

  function on_discovery(peripheral) {

    clearTimeout(adapter_stuck_timeout);
    adapter_stuck_timeout = setInterval(recover_adapter, 300000);

    let encoded_data = peripheral.advertisement.manufacturerData;

    if (!encoded_data || !is_ruuvi_packet(encoded_data)) 
      return;
    
    let ruuvi;
    let mac = peripheral.address;
    let rssi = peripheral.rssi;
    decoded_data = decode(encoded_data.slice(2), mac);

    statusEmitter.emit('connected', mac);
    
    // if no ruuvi packets for 120 seconds, there isn't any ruuvi around
    clearTimeout(no_ruuvi_timeout);
    no_ruuvi_timeout = setTimeout(no_ruuvi_around, 120000);
    
    if (first_ruuvi_packet){
      setInterval(() => { update_ruuvi_list(ruuvi_list) }, 30000);
      first_ruuvi_packet = false;
    }
          
    update_temporary_list(temporary_list, mac);

    /*
    * If ruuvi is already in ruuvi_list, update the rssi by the Kalman Filter.
    * Otherwise, create a new ruuvi and put it in the list.
    */
    ruuvi = update_list_or_create_ruuvi(ruuvi_list, mac, rssi);
    console.log('Mac ' + mac + '  Kalman RSSI ' + ruuvi.rssi + '  true RSSI -> ' + peripheral.rssi + '  mov_counter ' + decoded_data["movement_counter"]);

    let closer_ruuvi = get_closer_ruuvi(ruuvi_list);

    if ( (decoded_data["movement_counter"] != 0 && no_ruuvi_in_session()) 
      || (decoded_data["movement_counter"] != 0 && decoded_data["movement_counter"] != ruuvi.mov_counter) ) {
      ruuvi.increase_session_id;
      ruuvi.in_session = true;

      if (socket_already_sent == false) {
        socket_already_sent = true;
        //send_to_socket(ruuvi.mac, ruuvi.session_id, ruuvi.in_session);
        console.log("Sessione iniziata")
      }

    } else if (decoded_data["movement_counter"] == 0 && ruuvi.in_session == true) {
      ruuvi.in_session = false;

      if (socket_already_sent == true) {
        socket_already_sent = false;
        //send_to_socket(ruuvi.mac, ruuvi.session_id, ruuvi.in_session);
        console.log("Sessione terminata")
      }
    }

    // write in the database only the packet of the closer device
    if (ruuvi.rounds !== decoded_data["rounds"] && 
        ruuvi.in_session === true) {
        
      decoded_data["session_id"] = ruuvi.session_id;
      influx.write(decoded_data);
    }

    ruuvi.rounds = decoded_data["rounds"];
    ruuvi.mov_counter = decoded_data["movement_counter"];

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
  
  function create_ruuvi(ruuvi_list, mac, rssi) {
    let kf = new KalmanFilter({R: R, Q: Q});
    let ruuvi = new RuuviTag(mac, rssi, false, 0, kf);
    ruuvi_list.push(ruuvi);
    return ruuvi;
  }
  
  function update_rssi(ruuvi, rssi) {
    ruuvi.rssi = ruuvi.kalman.filter(50);
    return ruuvi;
  }
  
  function update_list_or_create_ruuvi(ruuvi_list, mac, rssi) {
    for (let i = 0; i < ruuvi_list.length; i++) {
      if (mac == ruuvi_list[i].mac) return update_rssi(ruuvi_list[i], rssi);
    }
    return create_ruuvi(ruuvi_list, mac, rssi);
  }

  function send_to_socket(socket_current_mac, session_id, in_session) {
    let packet = JSON.stringify({
      diecutter_id : socket_current_mac,
      session_id : session_id,
      in_session : in_session
    });
  
    console.log("INVIATO " + packet);
  
    client.write(packet); 
  }
  
  function decode(data, mac) {
    let measurement = {};
  
    measurement["data_format"] = data.slice(0, 1).readInt8();
    measurement["temperature"] = data.slice(1, 3).readInt16BE() / 200;
    measurement["humidity"] = data.slice(3, 5).readUInt16BE() / 400;
    measurement["speed"] = data.slice(5, 7).readUInt16BE() / 1000;
    measurement["acceleration_x"] = data.slice(7,9).readInt16BE() / 1000;
    measurement["acceleration_y"] = data.slice(9,11).readInt16BE() / 1000;
    measurement["acceleration_z"] = data.slice(11,13).readInt16BE() / 1000;
        
    let power_info = data.slice(13,15).readInt16BE();
  
    if ((power_info >>> 5) != 0b11111111111) {
      measurement["battery_voltage"] = (power_info >>> 5) / 1000 + 1.6;
    }
    
    if ((power_info & 0b11111) != 0b11111) {
      measurement["tx_power"] = (power_info & 0b11111) * 2 - 40;
    }
  
    measurement["movement_counter"] = data.slice(15,16).readUInt8();
    measurement["sequence_number"] = data.slice(16,18).readUInt16BE();
    measurement["rounds"] = data.slice(18,24).readUIntBE(0,6);
  
    measurement["mac"] = mac;
  
    return measurement;
  }
  
  function recover_adapter() {
    console.error("ADAPTER STUCK: cannot receive any bluetooth packet");
    statusEmitter.emit('error_adapter_stuck');
    noble.stopScanningAsync();
  }
  
  function no_ruuvi_around() {
    statusEmitter.emit('disconnected');
    console.log("No RuuviTag around.");
    clearInterval(no_ruuvi_timeout);
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
  
  function update_temporary_list(array, value) {
    if (array.indexOf(value) === -1)
      array.push(value)
  }
  
  /*
  * If the objects in the dictionary are greater than the items in the list,
  * delete the objects in the dictionary that are not in the list.
  * Aftet that, make the list empty.
  */
  function update_ruuvi_list() {
    if (ruuvi_list.length > temporary_list.length) {
      for (let i = 0; i < ruuvi_list.length; i++) {
        if (temporary_list.indexOf(ruuvi_list[i].mac) === -1) {
          ruuvi_list.splice(i, 1);
          i--;
        }
      }
    }
    temporary_list = [];
  }

}

function setRounds(result){
  last_round_value = result;
}

function setSession(result){
  session_id = result;
}


module.exports = {
  statusEmitter,
  start_exploring
}

/*
* Append in the dictionary the MAC address associated to the rssi value.
* If the MAC address is already in the dictionary, the rssi is updated.
* Return the MAC addres with the greater rssi.

function updateDictionary(dict, mac, rssi) {
  if (dict.hasOwnProperty(mac)) dict[`${mac}`] = rssi;
  else dict[`${mac}`] = rssi;

  return Object.keys(dict).reduce((a, b) => dict[a] > dict[b] ? a : b);
}
*/
