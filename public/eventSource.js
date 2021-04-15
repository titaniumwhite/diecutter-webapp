if (!!window.EventSource) {
    let eventSource = new EventSource("/status");

    if (JSON.parse(sessionStorage.getItem('status')) == null) {
        eventSource.addEventListener('open', function(e) {
            if (this.readyState == eventSource.OPEN) {
                $('#infobar').text('Connessione in corso...' );
            }
        }, false);
    }

    eventSource.addEventListener('message', function(e) {
        let status;
        if (this.readyState == eventSource.OPEN) {
            console.log(e.data);

            if (e.data == 'error_no_usb') {
                status = 'connecting';
                $('#infobar').text("ERRORE: collegare l'adattatore USB e ricaricare la pagina");
                $('#infobar').css('background-color', 'red');
                $('#infobar').css('color', 'white');
            } else if (e.data == 'error_adapter_stuck') {
                status = 'error_adapter_stuck';
                $('#infobar').text("ERRORE: l'adattatore usb non riceve più pacchetti bluetooth. Tentativo di riconnessione in corso...");
                $('#infobar').css('background-color', 'red');
                $('#infobar').css('color', 'white');
            } else if (e.data == 'connecting') {
                status = 'connecting';
                $('#infobar').text('Connessione in corso...' );
            } else if (e.data == 'disconnected') {
                status = 'disconnected';
                $('#infobar').text('Non ci sono RuuviTag nelle vicinanze');
                $('#infobar').css('background-color', 'red');
                $('#infobar').css('color', 'white');
            } else {
                let parsed_data = JSON.parse(e.data);
                if (parsed_data['event'] == 'connected') {
                    status = 'connected';
                    $('#infobar').text('Connessione effettuata a ' + parsed_data['mac']);
                    $('#infobar').css('background-color', 'forestgreen');
                    $('#infobar').css('color', 'white');
                }
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

    if (status == 'connecting') {
        $('#infobar').css('background-color', 'rgb(230, 228, 228)');
        $('#infobar').text('Connessione in corso...' );
    }

    if (status == 'disconnected') {
        $('#infobar').text('Non ci sono RuuviTag nelle vicinanze');
        $('#infobar').css('background-color', 'red');
        $('#infobar').css('color', 'white');
    }

    if (status == 'connected') {
        $('#infobar').text('Connessione effettuata');
        $('#infobar').css('background-color', 'forestgreen');
        $('#infobar').css('color', 'white');
    }
    
    if (status == 'error_no_usb') {
        $('#infobar').text("ERRORE: collegare l'adattatore USB e ricaricare la pagina");
        $('#infobar').css('background-color', 'red');
        $('#infobar').css('color', 'white');
    }

    if (e.data == 'error_adapter_stuck') {
        $('#infobar').text("ERRORE: l'adattatore usb non riceve più pacchetti bluetooth. Tentativo di riconnessione in corso...");
        $('#infobar').css('background-color', 'red');
        $('#infobar').css('color', 'white');
    }
}