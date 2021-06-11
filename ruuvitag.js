module.exports= class RuuviTag {
    constructor(mac, rssi, in_session, session_id, rounds, mov_counter, kalman) {
        this._mac = mac;
        this._rssi = rssi;
        this._in_session = in_session;
        this._session_id = session_id;
        this._rounds = rounds;
        this._mov_counter = mov_counter;
        this._kalman = kalman;
    }

    get mac() { return this._mac; }
    get rssi() { return this._rssi; }
    get in_session() { return this._in_session; }
    get session_id() { return this._session_id; }
    get kalman() { return this._kalman; }
    get mov_counter() { return this._mov_counter; }
    get rounds() { return this._rounds; }
    get increase_session_id() { return this.increase(); }


    set rssi(rssi) { this._rssi = rssi; }
    set rounds(rounds) { this._rounds = rounds; }
    set mov_counter(mov_counter) { this._mov_counter = mov_counter; }
    set in_session(in_session) { this._in_session = in_session; }
    set session_id(session_id) { this._session_id = session_id; }

    increase() {
        return this.session_id++;
    }

}