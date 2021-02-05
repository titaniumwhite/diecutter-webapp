if (!!window.EventSource) {
    let eventSource = new EventSource("/status");

    eventSource.addEventListener('open', function(e) {
        if (this.readyState == eventSource.OPEN) {
            console.log('Offline');
            $('#infobar').text('Offline');
        }
    }, false);

    eventSource.addEventListener('message', function(e) {
        if (this.readyState == eventSource.OPEN) {
            console.log(e.data);
            if (e.data == 'connecting') {
                $('#infobar').text('Connessione in corso...' );
            }

            if (e.data == 'reset') {
                $('#infobar').text('Disconnesso dal dispositivo');
                $('#infobar').css('background-color', 'firebrick');
                $('#infobar').css('color', 'white');
            }

            if (e.data == 'connected') {
                $('#infobar').text('Connessione effettuata');
                $('#infobar').css('background-color', 'forestgreen');
                $('#infobar').css('color', 'white');
            }
            
            if (e.data == 'error-no_usb') {
                $('#infobar').text("ERRORE: collegare l'adattatore USB e ricaricare la pagina");
                $('#infobar').css('background-color', 'red');
                $('#infobar').css('color', 'white');
            }
        }
    }, false);
  
    eventSource.addEventListener('error', function(e) {
        const id_state = document.getElementById('state')
        if (e.eventPhase == EventSource.CLOSED) eventSource.close()
    }, false);

} else {
    console.log("Your browser doesn't support SSE");
}