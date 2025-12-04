export function calculateLocalSiderealTime(date, longitudeDeg) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const T = (jd - 2451545.0) / 36525;
    let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000;
    gmst = ((gmst % 360) + 360) % 360;
    const lst = gmst + longitudeDeg;
    return ((lst % 360) + 360) % 360;
}
