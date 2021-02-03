const Influx = require('influx');
//const os = require('os');

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
          rounds: Influx.FieldType.INTEGER
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
            //tags: { host: os.hostname() },
            fields: { 
                mac: data['mac'],
                acceleration_x: data['acceleration_x'],
                acceleration_y: data['acceleration_y'],
                acceleration_z: data['acceleration_z'],
                sequence_number: data['sequence_number'],
                rounds: data['rounds']
            }
        }
    ], {
        database: 'ruuvi'
    });
}

module.exports = {
  write
}
