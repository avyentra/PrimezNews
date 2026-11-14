# Name and birth Moon sign finder

The two methods are deliberately separate. Name-rashi uses a confirmed first
sound of the first name, not its surname. English transliteration can map to
more than one Hindi consonant; ambiguous matches require an explicit sound
choice. The UI permits correcting every suggestion. Unsupported spellings do
not receive a guessed sign. Reference: https://www.drikpanchang.com/astrology/prediction/info/find-rashi-with-name.html

Birth-rashi is calculated in the browser using vendored Astronomy Engine 2.1.19
(MIT notice retained in the library), with no account, API key or external birth
data submission. Package: https://www.npmjs.com/package/astronomy-engine/v/2.1.19
Source: https://github.com/cosinekitty/astronomy

`EclipticGeoMoon` supplies true geocentric tropical longitude of date. We remove
longitude nutation and a mean Lahiri approximation: 23.857092353 degrees at J2000,
advanced with the IAU 2006 general precession polynomial. This is **not an exact
Swiss Ephemeris Lahiri implementation**. The UI explicitly calls it approximate.
Independent Swiss Ephemeris 2.10.03 MOSEPH/SIDM_LAHIRI numerical fixtures cover
32 dates across 1900–2100. Maximum observed longitude difference: 0.018165 degree;
this is sampled verification, not a uniform accuracy guarantee. A result within
0.05 degree of a sign boundary shows both adjacent signs and requests a precise
birth-time/ephemeris check. Do not market this as a full kundli or exact chart.
Reference: https://www.astro.com/swisseph/swisseph.htm

Selected city supplies its IANA time zone, not an ascendant or topocentric
position. Unlisted cities need explicit time-zone selection. Historical offsets
come from the browser's Intl time-zone database. DST gaps fail; repeated times
require choosing the first or second occurrence. Browser time-zone data versions
can differ. Date range is 1900–2100; future birth instants are rejected by the UI.
The user's birth inputs are neither stored nor put in the horoscope link.

Sun-sign birth-date ranges were removed from the Moon/name-rashi reading header.
The existing daily readings remain keyless curated entertainment guidance; adding
a Moon calculation does not turn those readings into planetary predictions.
