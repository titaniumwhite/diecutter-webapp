module.exports= class RuuviTag {
    constructor(mac, rssi, in_session, session_id, mov_counter) {
        this._mac = mac;
        this._rssi = rssi;
        this._in_session = in_session;
        this._session_id = session_id;
        this._mov_counter = mov_counter;
    }

    get mac() { return this._mac; }
    get rssi() { return this._rssi; }
    get in_session() { return this._in_session; }
    get session_id() { return this._session_id; }
    get mov_counter() { return this._mov_counter; }
    get increase_session_id() { return this.increase(); }

    set rssi(rssi) { this._rssi = rssi; }
    set mov_counter(mov_counter) { this._mov_counter = mov_counter; }
    set in_session(in_session) { this._in_session = in_session; }
    set session_id(session_id) { this._session_id = session_id; }

    increase() {
        return this.session_id++;
    }

}