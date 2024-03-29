const Influx = require('influx');

const influx = new Influx.InfluxDB({
    host: 'localhost',
    database: 'rotalaserdb',
    schema: [
      {
        measurement: 'ruuvi',
        fields: {
          mac: Influx.FieldType.STRING,
          rounds: Influx.FieldType.INTEGER,
          session_id: Influx.FieldType.INTEGER,
          in_session: Influx.FieldType.BOOLEAN,
          temperature: Influx.FieldType.FLOAT,
          humidity: Influx.FieldType.FLOAT,
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
              in_session: data['in_session'],
              temperature: data['temperature'],
              humidity: data['humidity'],
              speed: data['speed']
            }
        }
    ], {
        database: 'rotalaserdb'
    });
}

function getLastSession(callback,mac) {
  influx.query('select last(session_id) from ruuvi where mac =\'' + mac + '\'').catch(err=>{
      console.log(err);
    })
    .then(results=>{
      if(results.length > 0)
        callback(results[0].last,mac);
      else
        callback(0, mac);
    });
}


function fixIncompleteSessions(mac) {
  influx.query('select * from ruuvi where mac =\'' + mac + '\' order by time desc limit 1').catch(err=>{
      console.log(err);
    })
    .then(results=>{
      
      if(results.length > 0){
        if(results[0].in_session == true){
          console.log("[WARNING] "+mac+" has NOT correctly finished the session")
          influx.writePoints([
              {
                  measurement: 'ruuvi',
                  fields: {   
                    mac: mac,
                    rounds: results[0].rounds,
                    session_id: results[0].session_id,
                    in_session: false,
                    temperature: results[0].temperature,
                    humidity: results[0].humidity,
                    speed: 0
                  }
              }
          ], {
              database: 'rotalaserdb'
          });
        }else{
          console.log("[INFO] "+mac+" has correctly finished the session")
        }
        
      }
      else
        console.log("[WARNING] Unable to find last in_session for " + mac)
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
  getLastRound,
  fixIncompleteSessions
}