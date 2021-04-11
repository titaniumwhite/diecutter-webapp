const Influx = require('influx');

const influx = new Influx.InfluxDB({
    host: 'localhost',
    database: 'ruuvi',
    schema: [
      {
        measurement: 'ruuvi',
        fields: {
          mac: Influx.FieldType.STRING,
          acceleration_x: Influx.FieldType.FLOAT,
          acceleration_y: Influx.FieldType.FLOAT,
          acceleration_z: Influx.FieldType.FLOAT,
          sequence_number: Influx.FieldType.INTEGER,
          rounds: Influx.FieldType.INTEGER,
          session_id: Influx.FieldType.INTEGER
        },
        tags: [
          'host'
        ]
      }
    ]
})

function write(data) {
    influx.writePoints([
        {
            measurement: 'ruuvi',
            fields: { 
              mac: data['mac'],
              acceleration_x: data['acceleration_x'],
              acceleration_y: data['acceleration_y'],
              acceleration_z: data['acceleration_z'],
              sequence_number: data['sequence_number'],
              rounds: data['rounds'],
              session_id: data['session_id']
            }
        }
    ], {
        database: 'ruuvi'
    });
}

function getLastSession(callback) {
  influx.query('select last(session_id) from ruuvi order by desc limit 1').catch(err=>{
      console.log(err);
    })
    .then(results=>{
      if(results.length > 0)
        callback(results[0].last);
      else
        callback(0);
    });
}

function getLastRound(callback) {
  influx.query('select last(rounds) from ruuvi order by desc limit 1').catch(err=>{
      console.log(err);
    })
    .then(results=>{
      if(results.length > 0)
        callback(results[0].last);
      else
        callback(-1);
    });
}

module.exports = {
  write,
  getLastSession,
  getLastRound
}
