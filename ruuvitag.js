
class RuuviTag {
    constructor(mac, rssi, in_session, kalman) {
        this.mac = mac;
        this.rssi = rssi;
        this.in_session = in_session;
        this.kalman = kalman;
    }

    get get_mac() { return this.mac; }
    get get_rssi() { return this.rssi; }
    get get_in_session() { return this.in_session; }
    get get_kalman() { return this.kalman; }

    set set_rssi(rssi) { 
        this.rssi = this.kalman(rssi);
    }

    set set_in_session(in_session) {
        this.in_session = in_session;
    }

}