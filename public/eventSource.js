if (!!window.EventSource) {
    let eventSource = new EventSource("/status");

    if (JSON.parse(sessionStorage.getItem('status')) == null) {
        eventSource.addEventListener('open', function(e) {
            if (this.readyState == eventSource.OPEN) {
                console.log('open Offline');
                $('#infobar').text('Offline');
            }
        }, false);
    }

    eventSource.addEventListener('message', function(e) {
        let status;
        if (this.readyState == eventSource.OPEN) {
            console.log(e.data);
            if (e.data == 'connecting') {
                status = 'connecting';
                $('#infobar').text('Connessione in corso...' );
            }

            if (e.data == 'disconnected') {
                status = 'disconnected';
                $('#infobar').text('Disconnesso dal dispositivo');
                $('#infobar').css('background-color', 'firebrick');
                $('#infobar').css('color', 'white');
            }

            if (e.data == 'connected') {
                status = 'connected';
                $('#infobar').text('Connessione effettuata');
                $('#infobar').css('background-color', 'forestgreen');
                $('#infobar').css('color', 'white');
            }
            
            if (e.data == 'error-no_usb') {
                status = 'offline';
                $('#infobar').text("ERRORE: collegare l'adattatore USB e ricaricare la pagina");
                $('#infobar').css('background-color', 'red');
                $('#infobar').css('color', 'white');
            }

            sessionStorage.setItem('status', JSON.stringify(status));
        }
    }, false);
  
    eventSource.addEventListener('error', function(e) {
        const id_state = document.getElementById('state')
        if (e.eventPhase == EventSource.CLOSED) eventSource.close()
    }, false);

} else {
    console.log("Your browser doesn't support SSE");
}

function reload() {
    let status = JSON.parse(sessionStorage.getItem('status'));
    console.log("Lo status è " + status);
    if (status == 'offline') {
        console.log('Offline');
        $('#infobar').css('background-color', 'rgb(230, 228, 228)');
        $('#infobar').text('Offline');
    }

    if (status == 'connecting') {
        $('#infobar').text('Connessione in corso...' );
    }

    if (status == 'disconnected') {
        $('#infobar').text('Disconnesso dal dispositivo');
        $('#infobar').css('background-color', 'firebrick');
        $('#infobar').css('color', 'white');
    }

    if (status == 'connected') {
        $('#infobar').text('Connessione effettuata');
        $('#infobar').css('background-color', 'forestgreen');
        $('#infobar').css('color', 'white');
    }
    
    if (status == 'error-no_usb') {
        $('#infobar').text("ERRORE: collegare l'adattatore USB e ricaricare la pagina");
        $('#infobar').css('background-color', 'red');
        $('#infobar').css('color', 'white');
    }
}