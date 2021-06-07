const Influx = require('influx');

const influx = new Influx.InfluxDB({
    host: 'localhost',
    database: 'ruuvi',
    schema: [
      {
        measurement: 'ruuvi',
        fields: {
          mac: Influx.FieldType.STRING,
          rounds: Influx.FieldType.INTEGER,
          session_id: Influx.FieldType.INTEGER,
          temperature: Influx.FieldType.INTEGER,
          humidity: Influx.FieldType.INTEGER,
          speed: Influx.FieldType.FLOAT
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
              rounds: data['rounds'],
              session_id: data['session_id'],
              temperature: data['temperature'],
              humidity: data['humidity'],
              speed: data['speed']
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
