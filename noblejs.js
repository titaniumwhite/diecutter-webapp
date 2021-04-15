const noble = require('@abandonware/noble');
const influx = require('./influx');
const { EventEmitter } = require('events');

const statusEmitter = new EventEmitter();

let actual_mac = {};
let temporary_mac = [];
let idInterval; // after 15 seconds, delete the unnecessary objects in the dectionary and initialize the list
let idTimeout; // if there are no packets for 45 seconds, the connection is considered as lost
let first_data = true;
let session_on = false;
let session_id = 0;
let last_round_value = -1;
let last_movement_counter = 0;

influx.getLastRound(setRounds);
influx.getLastSession(setSession);

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

  noble.on('discover', on_discovery);
}

function on_discovery(peripheral) {
  // ignore devices with no manufacturer data
  if (!peripheral.advertisement.manufacturerData || peripheral.advertisement.manufacturerData[0] != 0x99) 
    return;
  
  let encoded_data = peripheral.advertisement.manufacturerData;

  if (encoded_data[0] == 0x99 && encoded_data[1] == 0x04 && encoded_data[2] == 5) {
    // if no packets for 45 seconds, device is disconnected
    clearTimeout(idTimeout);
    idTimeout = setTimeout(reset, 90000);

    // first ruuvi packet received
    if (first_data) {
      idInterval = setInterval(checkList, 15000);
      first_data = false;
    }
        
    updateList(temporary_mac, peripheral.address);

    statusEmitter.emit('connected', peripheral.address);
    
    let data_slice = encoded_data.slice(2);

    decoded_data = decode(data_slice);
    decoded_data["mac"] = peripheral.address;

    //console.log('Packet from ' + peripheral.address + ' movement counter -> ' + decoded_data["movement_counter"]);
	/*
    if ( (decoded_data["movement_counter"] > 0 && session_on == false) 
      || (decoded_data["movement_counter"] != 0 && decoded_data["movement_counter"] != last_movement_counter) ) {
      session_id++;
      session_on = true;
    } else if (decoded_data["movement_counter"] == 0 && session_on == true) {
      session_on = false;
    }*/

    // write in the database only the packet of the closer device
    if ((peripheral.address === updateDictionary(actual_mac, peripheral.address, peripheral.rssi))
          && last_round_value !== decoded_data["rounds"]
          /*&& session_on == true*/
		  ) {
      
      //console.log("Writing on Influx the data of " + peripheral.address);
      decoded_data["session_id"] = session_id;
      influx.write(decoded_data);
    }

    last_round_value = decoded_data["rounds"];
    last_movement_counter = decoded_data["movement_counter"];
  }
}

function decode(data) {
  let measurement = {};

  measurement["data_format"] = data.slice(0, 1).readInt8();
  measurement["temperature"] = data.slice(1, 3).readInt16BE() / 200;
  measurement["humidity"] = data.slice(3, 5).readUInt16BE() / 400;
  measurement["pressure"] = data.slice(5, 7).readUInt16BE() + 50000;
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

  return measurement;
}

async function reset() {
  statusEmitter.emit('disconnected');
  console.error("Disconnected from RuuviTag.");
  clearInterval(idInterval);
  clearInterval(idTimeout);
  first_data = true;
  process.exit(1);
}

function updateList(array, value) {
  if (array.indexOf(value) === -1)
    array.push(value)
}

/*
* If the objects in the dictionary are greater than the items in the list,
* delete the objects in the dictionary that are not in the list.
* Aftet that, make the list empty.
*/
function checkList() {
  if (Object.keys(actual_mac).length > temporary_mac.length) {
    for (let key in actual_mac) {
      if (temporary_mac.indexOf(key) === -1) delete actual_mac[`${key}`];
    }
  }
  temporary_mac = [];
}

/*
* Append in the dictionary the MAC address associated to the rssi value.
* If the MAC address is already in the dictionary, the rssi is updated.
* Return the MAC addres with the greater rssi.
*/
function updateDictionary(dict, mac, rssi) {
  if (dict.hasOwnProperty(mac)) dict[`${mac}`] = rssi;
  else dict[`${mac}`] = rssi;

  return Object.keys(dict).reduce((a, b) => dict[a] > dict[b] ? a : b);
}

function setRounds(result){
  last_round_value = result;
  //console.log("last_round " + last_round_value);
}

function setSession(result){
  session_id = result;
  //console.log("session_id " + session_id);
}

module.exports = {
  statusEmitter,
  explore,
  reset
}
