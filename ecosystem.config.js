module.exports = {
  apps: [{
      name: 'app',
      script: 'app.js',
	  restart_delay: 10000,
      output: '.log/out.log',
      error: '.log/error.log',
	  log: '.log/combined.outerr.log',
	  log_date_format: 'YYYY-MM-DD HH:mm'
    }]
}