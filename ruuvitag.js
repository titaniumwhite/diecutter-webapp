module.exports= class RuuviTag {
    constructor(mac, rssi, in_session, session_id, rounds, mov_counter, kalman) {
        this._mac = mac;
        this._rssi = rssi;
        this._in_session = in_session;
        this._session_id = session_id;
        this._mov_counter = mov_counter;
        this._kalman = kalman;

        // additional fields required to compute rotations
        this._prev_raw_session = 0;
        this._prev_rotations = 0;
        this._prev_timestamp = new Date();
    }

    get mac() { return this._mac; }
    get rssi() { return this._rssi; }
    get in_session() { return this._in_session; }
    get session_id() { return this._session_id; }
    get kalman() { return this._kalman; }
    get mov_counter() { return this._mov_counter; }
    get increase_session_id() { return this.increase(); }

    // additional getter methods
    get prev_raw_session() {return this._prev_raw_session; }
    get prev_rotations() {return this._prev_rotations; }
    get prev_timestamp() {return this._prev_timestamp; }


    set rssi(rssi) { this._rssi = rssi; }
    set mov_counter(mov_counter) { this._mov_counter = mov_counter; }
    set in_session(in_session) { this._in_session = in_session; }
    set session_id(session_id) { this._session_id = session_id; }

    // additional setter methods
    set prev_raw_session(raw_session) {this._prev_raw_session = raw_session; }
    set prev_rotations(rotations) {this._prev_rotations = rotations; }
    set prev_timestamp(timestamp) {this._prev_timestamp = timestamp; }

    increase() {
        return this.session_id++;
    }

}