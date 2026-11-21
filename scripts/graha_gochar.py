"""Vedic graha-gochar (planetary transit) Rashifal. No API, no key, no dependencies.

Positions come from low-precision orbital formulas (P. Schlyter, stjarnhimlen.se),
converted to sidereal longitude with the Lahiri ayanamsa. Accuracy is a few arc-minutes
for Sun/Mercury/Venus/Mars, about 0.3 degree for the Moon and for Jupiter/Saturn:
enough for rashi (sign) and house, which is all the text below uses.

Interpretation: classical "gochar from Chandra rashi" (transit houses counted from the
Moon sign). Traditional astrological belief, published as general entertainment guidance.
"""
import datetime
import math

SIGNS = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन']
GRAHAS = ['सूर्य', 'चंद्रमा', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'राहु', 'केतु']
NAKSHATRAS = ['अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा',
              'पूर्वा फाल्गुनी', 'उत्तरा फाल्गुनी', 'हस्त', 'चित्रा', 'स्वाति', 'विशाखा', 'अनुराधा', 'ज्येष्ठा', 'मूल',
              'पूर्वाषाढ़ा', 'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वा भाद्रपद', 'उत्तरा भाद्रपद', 'रेवती']
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

# ---------------------------------------------------------------- astronomy

def _rad(x):
    return math.radians(x)


def _julian_day(moment):
    moment = moment.astimezone(datetime.timezone.utc)
    y, m = moment.year, moment.month
    d = moment.day + (moment.hour + moment.minute / 60 + moment.second / 3600) / 24
    if m <= 2:
        y, m = y - 1, m + 12
    a = y // 100
    b = 2 - a + a // 4
    return int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d + b - 1524.5


def _kepler(M, e):
    E = M + math.degrees(e * math.sin(_rad(M)) * (1 + e * math.cos(_rad(M))))
    for _ in range(30):
        delta = (E - math.degrees(e * math.sin(_rad(E))) - M) / (1 - e * math.cos(_rad(E)))
        E -= delta
        if abs(delta) < 1e-9:
            break
    return E


def _elements(name, d):
    # N, i, w, a, e, M  (degrees / AU), epoch 1999-12-31 00:00 UT
    table = {
        'sun': (0.0, 0.0, 282.9404 + 4.70935e-5 * d, 1.0, 0.016709 - 1.151e-9 * d, 356.0470 + 0.9856002585 * d),
        'moon': (125.1228 - 0.0529538083 * d, 5.1454, 318.0634 + 0.1643573223 * d, 60.2666, 0.054900, 115.3654 + 13.0649929509 * d),
        'mercury': (48.3313 + 3.24587e-5 * d, 7.0047 + 5.00e-8 * d, 29.1241 + 1.01444e-5 * d, 0.387098, 0.205635 + 5.59e-10 * d, 168.6562 + 4.0923344368 * d),
        'venus': (76.6799 + 2.46590e-5 * d, 3.3946 + 2.75e-8 * d, 54.8910 + 1.38374e-5 * d, 0.723330, 0.006773 - 1.302e-9 * d, 48.0052 + 1.6021302244 * d),
        'mars': (49.5574 + 2.11081e-5 * d, 1.8497 - 1.78e-8 * d, 286.5016 + 2.92961e-5 * d, 1.523688, 0.093405 + 2.516e-9 * d, 18.6021 + 0.5240207766 * d),
        'jupiter': (100.4542 + 2.76854e-5 * d, 1.3030 - 1.557e-7 * d, 273.8777 + 1.64505e-5 * d, 5.20256, 0.048498 + 4.469e-9 * d, 19.8950 + 0.0830853001 * d),
        'saturn': (113.6634 + 2.38980e-5 * d, 2.4886 - 1.081e-7 * d, 339.3939 + 2.97661e-5 * d, 9.55475, 0.055546 - 9.499e-9 * d, 316.9670 + 0.0334442282 * d),
    }
    return table[name]


def _orbit(name, d):
    """Return (x, y, z, r, true_longitude, mean_anomaly) in the orbit's own frame."""
    N, i, w, a, e, M = _elements(name, d)
    M %= 360
    E = _kepler(M, e)
    xv = a * (math.cos(_rad(E)) - e)
    yv = a * math.sqrt(1 - e * e) * math.sin(_rad(E))
    v = math.degrees(math.atan2(yv, xv))
    r = math.hypot(xv, yv)
    vw = _rad(v + w)
    x = r * (math.cos(_rad(N)) * math.cos(vw) - math.sin(_rad(N)) * math.sin(vw) * math.cos(_rad(i)))
    y = r * (math.sin(_rad(N)) * math.cos(vw) + math.cos(_rad(N)) * math.sin(vw) * math.cos(_rad(i)))
    z = r * math.sin(vw) * math.sin(_rad(i))
    return x, y, z, r, (v + w) % 360, M


def _tropical(d):
    """Geocentric tropical (of date) ecliptic longitudes, degrees."""
    sx, sy, _, sr, sun_lon, ms = _orbit('sun', d)
    out = {'सूर्य': sun_lon}
    # Moon
    x, y, _, _, _, mm = _orbit('moon', d)
    lon = math.degrees(math.atan2(y, x))
    Nm = _elements('moon', d)[0]
    wm = _elements('moon', d)[2]
    ws = _elements('sun', d)[2]
    Ls = ms + ws
    Lm = mm + wm + Nm
    D = Lm - Ls
    F = Lm - Nm
    s = lambda v: math.sin(_rad(v))
    lon += (-1.274 * s(mm - 2 * D) + 0.658 * s(2 * D) - 0.186 * s(ms) - 0.059 * s(2 * mm - 2 * D)
            - 0.057 * s(mm - 2 * D + ms) + 0.053 * s(mm + 2 * D) + 0.046 * s(2 * D - ms) + 0.041 * s(mm - ms)
            - 0.035 * s(D) - 0.031 * s(mm + ms) - 0.015 * s(2 * F - 2 * D) + 0.011 * s(mm - 4 * D))
    out['चंद्रमा'] = lon % 360
    mj = _orbit('jupiter', d)[5]
    msat = _orbit('saturn', d)[5]
    for key, name in (('मंगल', 'mars'), ('बुध', 'mercury'), ('गुरु', 'jupiter'), ('शुक्र', 'venus'), ('शनि', 'saturn')):
        x, y, z, r, _, _ = _orbit(name, d)
        lon = math.degrees(math.atan2(y, x))
        if name == 'jupiter':
            lon += (-0.332 * s(2 * mj - 5 * msat - 67.6) - 0.056 * s(2 * mj - 2 * msat + 21) + 0.042 * s(3 * mj - 5 * msat + 21)
                    - 0.036 * s(mj - 2 * msat) + 0.022 * math.cos(_rad(mj - msat)) + 0.023 * s(2 * mj - 3 * msat + 52)
                    - 0.016 * s(mj - 5 * msat - 69))
        elif name == 'saturn':
            lon += (0.812 * s(2 * mj - 5 * msat - 67.6) - 0.229 * math.cos(_rad(2 * mj - 4 * msat - 2))
                    + 0.119 * s(mj - 2 * msat - 3) + 0.046 * s(2 * mj - 6 * msat - 69) + 0.014 * s(mj - 3 * msat + 32))
        horizontal = math.sqrt(x * x + y * y)
        hx, hy = horizontal * math.cos(_rad(lon)), horizontal * math.sin(_rad(lon))
        out[key] = math.degrees(math.atan2(hy + sy, hx + sx)) % 360
    T = d / 36525.0 + (2451543.5 - 2451545.0) / 36525.0
    out['राहु'] = (125.04452 - 1934.136261 * T) % 360   # mean node
    out['केतु'] = (out['राहु'] + 180) % 360
    return out


def ayanamsa(jd):
    """Lahiri (Chitrapaksha) ayanamsa, degrees."""
    years = (jd - 2451545.0) / 365.25
    return 23.8571 + 0.013969 * years


def sidereal_positions(moment):
    """Sidereal longitude (0-360) of the nine grahas at a datetime."""
    jd = _julian_day(moment)
    ay = ayanamsa(jd)
    return {name: (lon - ay) % 360 for name, lon in _tropical(jd - 2451543.5).items()}


def sign_index(longitude):
    return int(longitude // 30) % 12


# ---------------------------------------------------------------- interpretation

FAVORABLE = {
    'सूर्य': {3, 6, 10, 11}, 'चंद्रमा': {1, 3, 6, 7, 10, 11}, 'मंगल': {3, 6, 11}, 'बुध': {2, 4, 6, 8, 10, 11},
    'गुरु': {2, 5, 7, 9, 11}, 'शुक्र': {1, 2, 3, 4, 5, 8, 9, 11, 12}, 'शनि': {3, 6, 11}, 'राहु': {3, 6, 11}, 'केतु': {3, 6, 11},
}
ORDINAL = ['पहले', 'दूसरे', 'तीसरे', 'चौथे', 'पाँचवें', 'छठे', 'सातवें', 'आठवें', 'नौवें', 'दसवें', 'ग्यारहवें', 'बारहवें']
HOUSE_TOPIC = ['स्वास्थ्य और व्यक्तित्व', 'धन, वाणी और परिवार', 'साहस, प्रयास और छोटे भाई-बहन', 'घर, माता और मन की शांति',
               'शिक्षा, रचनात्मकता और प्रेम', 'काम की प्रतिस्पर्धा और दिनचर्या', 'साझेदारी और जीवनसाथी', 'अचानक बदलाव और जोखिम',
               'भाग्य, यात्रा और बड़ों का मार्गदर्शन', 'करियर और कामकाज', 'आय, लाभ और मित्र', 'खर्च, विश्राम और यात्रा']
POSITIVE = {
    'सूर्य': 'आत्मविश्वास और मान-सम्मान का साथ मिल सकता है', 'चंद्रमा': 'मन हल्का और उत्साही रह सकता है',
    'मंगल': 'ऊर्जा और साहस से काम आगे बढ़ सकता है', 'बुध': 'बातचीत और समझदारी भरे निर्णय सहायक रह सकते हैं',
    'गुरु': 'अनुभवी लोगों की सलाह और शुभ अवसर मिल सकते हैं', 'शुक्र': 'सौहार्द और सुख-सुविधा का माहौल बन सकता है',
    'शनि': 'अनुशासन और लगातार मेहनत का अच्छा फल मिल सकता है', 'राहु': 'नए अवसर मिल सकते हैं, पर सोच-समझकर आगे बढ़ें',
    'केतु': 'आत्मचिंतन से स्पष्टता मिल सकती है',
}
CAUTION = {
    'सूर्य': 'अहंकार और जल्दबाज़ी से बचें', 'चंद्रमा': 'भावनाओं में बहकर फैसले न लें', 'मंगल': 'गुस्से और जल्दबाज़ी से बचें',
    'बुध': 'बातचीत और कागज़ी काम में सावधानी रखें', 'गुरु': 'बड़े वादों और अति-आत्मविश्वास से बचें',
    'शुक्र': 'दिखावे और फिजूलखर्ची से बचें', 'शनि': 'धैर्य रखें; काम में देरी संभव है',
    'राहु': 'भ्रम या अफ़वाहों पर भरोसा न करें', 'केतु': 'बेचैनी में जल्दबाज़ी न करें',
}
REMEDY = {
    'चंद्रमा': 'कुछ मिनट शांत बैठकर गहरी साँस लें और मन को स्थिर करें।',
    'मंगल': 'गुस्सा आए तो जवाब देने से पहले दस तक गिनें और हल्का व्यायाम करें।',
    'शनि': 'किसी ज़रूरतमंद या बुज़ुर्ग की मदद करें और काम समय पर पूरा करें।',
    'सूर्य': 'सुबह कुछ देर धूप में टहलें और दिन की योजना लिखें।',
    'शुक्र': 'आसपास की सफ़ाई पर थोड़ा समय दें और किसी अपने से अच्छे से बात करें।',
    'बुध': 'ज़रूरी संदेश या कागज़ भेजने से पहले एक बार दोबारा जाँच लें।',
    'गुरु': 'किसी बड़े या शिक्षक से सलाह लें और कुछ नया सीखें।',
    'राहु': 'अफ़वाहों से दूर रहें; जानकारी की पुष्टि करके ही मानें।',
}
REMEDY_ORDER = ['चंद्रमा', 'मंगल', 'शनि', 'सूर्य', 'शुक्र', 'बुध', 'गुरु', 'राहु']
DEFAULT_REMEDY = 'किसी की मदद करें और दिन की एक अच्छी बात लिखें।'
WEEKDAY = ['सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार']
WEEKDAY_LORD = ['सूर्य', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'सूर्य']          # Monday's Moon is already covered
WEEKDAY_COLOR = ['सफेद', 'लाल', 'हरा', 'पीला', 'गुलाबी', 'नीला', 'नारंगी']
WEEKDAY_NUMBER = [2, 9, 5, 3, 6, 8, 1]
SIGN_COLOR = ['लाल', 'सफेद', 'हरा', 'सफेद', 'नारंगी', 'हरा', 'गुलाबी', 'लाल', 'पीला', 'नीला', 'नीला', 'पीला']
SIGN_NUMBER = [9, 6, 5, 2, 1, 5, 6, 9, 3, 8, 8, 3]
TOPIC_PLANETS = {'career': ('सूर्य', 'शनि'), 'money': ('गुरु', 'शुक्र'), 'love': ('शुक्र', 'चंद्रमा'),
                 'family': ('चंद्रमा', 'गुरु'), 'health': ('मंगल', 'शनि')}
TOPIC_TEXT = {
    'career': ['करियर में धैर्य रखें; जल्दबाज़ी में बड़ा फैसला न लें और ज़िम्मेदारियाँ साफ़ रखें।',
               'करियर में मिली-जुली स्थिति है; अनुशासन रखकर एक-एक काम पूरा करें।',
               'सूर्य और शनि के अनुकूल गोचर से करियर में मेहनत का फल और मान-सम्मान मिल सकता है।'],
    'money': ['आर्थिक निर्णयों में जल्दबाज़ी न करें; बड़े खर्च और निवेश से पहले जोखिम समझें।',
              'धन के मामलों में मिली-जुली स्थिति है; बजट बनाकर चलें और खर्च लिखें।',
              'गुरु और शुक्र के अनुकूल गोचर से आय और बचत की स्थिति अच्छी रह सकती है; फिर भी खर्च का हिसाब रखें।'],
    'love': ['भावनाओं में बहकर कुछ न कहें; पहले सामने वाले की बात समझें।',
             'रिश्तों में हल्का उतार-चढ़ाव संभव है; धैर्य से सुनें और बात करें।',
             'शुक्र और चंद्रमा अनुकूल हैं; रिश्तों में सौहार्द और खुलकर बात करने का अच्छा समय है।'],
    'family': ['परिवार में मतभेद हो तो शांत होकर बात करें और बड़ों का सम्मान रखें।',
               'घर में छोटी बातों पर सहमति बनाने के लिए समय निकालें।',
               'चंद्रमा और गुरु अनुकूल हैं; परिवार में सहयोग और शांति का माहौल रह सकता है।'],
    'health': ['थकान से बचें और पर्याप्त आराम करें; लगातार परेशानी हो तो योग्य चिकित्सक से सलाह लें।',
               'स्वास्थ्य सामान्य रह सकता है; नींद और भोजन का समय नियमित रखें।',
               'मंगल और शनि अनुकूल हैं; नियमित दिनचर्या से ऊर्जा बनी रह सकती है।'],
}
OVERALL = ['सतर्कता रखने का समय है', 'मिली-जुली स्थिति रहने की संभावना है', 'आमतौर पर अनुकूल स्थिति है', 'स्थिति अनुकूल रहने की संभावना है']


def house(rashi, planet_sign):
    return (planet_sign - rashi) % 12 + 1


def favorable(graha, h):
    return h in FAVORABLE[graha]


def sentence(graha, h):
    ordinal = ORDINAL[h - 1] + ' भाव'
    topic = HOUSE_TOPIC[h - 1]
    if favorable(graha, h):
        return f'{graha} आपकी चंद्र राशि से {ordinal} में है, जो {topic} के लिए अनुकूल माना जाता है; {POSITIVE[graha]}।'
    return f'{graha} आपकी चंद्र राशि से {ordinal} में है, इसलिए {topic} में {CAUTION[graha]}।'


def _at(day, hour, minute=0):
    return datetime.datetime(day.year, day.month, day.day, hour, minute, tzinfo=IST)


def _signs(day, hour=6, minute=0):
    return {name: sign_index(lon) for name, lon in sidereal_positions(_at(day, hour, minute)).items()}


def _summary(period, count, total):
    level = 0 if count == 0 else 3 if count == total else 1 if count * 2 < total + 1 else 2
    return f'कुल मिलाकर {period} {OVERALL[level]}।'


def _period_text(rashi, signs, planets, label):
    houses = [(g, house(rashi, signs[g])) for g in planets]
    count = sum(favorable(g, h) for g, h in houses)
    parts = [sentence(g, h) for g, h in houses]
    parts.append(_summary(label, count, len(planets)))
    return ' '.join(parts)


def _score(rashi, signs, graha_pair):
    return sum(favorable(g, house(rashi, signs[g])) for g in graha_pair)


def guidance(sign, day):
    """Same shape as rashifal_free.guidance, but built from real graha positions."""
    rashi = SIGNS.index(sign)
    positions = sidereal_positions(_at(day, 6))
    today = {n: sign_index(v) for n, v in positions.items()}
    week_mid = day - datetime.timedelta(days=day.weekday()) + datetime.timedelta(days=3)
    week = _signs(week_mid, 12)
    month = _signs(day.replace(day=15), 12)

    moon_sign = today['चंद्रमा']
    moon_house = house(rashi, moon_sign)
    nak = NAKSHATRAS[int(positions['चंद्रमा'] // (360 / 27)) % 27]
    lord = WEEKDAY_LORD[day.weekday()]
    daily = [f'आज चंद्रमा {SIGNS[moon_sign]} राशि में {nak} नक्षत्र में रहेगा।', sentence('चंद्रमा', moon_house),
             f'आज {WEEKDAY[day.weekday()]} है। ' + sentence(lord, house(rashi, today[lord]))]
    late = sign_index(sidereal_positions(_at(day, 23, 59))['चंद्रमा'])
    if late != moon_sign:
        daily.append(f'दिन में चंद्रमा {SIGNS[late]} राशि में प्रवेश करेगा।')
    result = {'daily': ' '.join(daily),
              'weekly': _period_text(rashi, week, ['मंगल', 'बुध', 'शुक्र'], 'यह सप्ताह'),
              'monthly': _period_text(rashi, month, ['सूर्य', 'मंगल', 'शुक्र'], 'यह महीना'),
              'yearly': _period_text(rashi, today, ['गुरु', 'शनि', 'राहु'], 'यह वर्ष')}

    details = {topic: TOPIC_TEXT[topic][_score(rashi, today, planets)] for topic, planets in TOPIC_PLANETS.items()}
    watch = [g for g in REMEDY_ORDER if not favorable(g, house(rashi, today[g]))]
    details['remedy'] = REMEDY[watch[0]] if watch else DEFAULT_REMEDY
    good_day = favorable('चंद्रमा', moon_house)
    details['lucky_number'] = WEEKDAY_NUMBER[day.weekday()] if good_day else SIGN_NUMBER[rashi]
    details['lucky_color'] = WEEKDAY_COLOR[day.weekday()] if good_day else SIGN_COLOR[rashi]
    result['details'] = details
    return result


def positions_summary(day):
    """Human-readable planet table stored in the JSON for transparency."""
    return {name: {'rashi': SIGNS[sign_index(lon)], 'degree': round(lon % 30, 1)}
            for name, lon in sidereal_positions(_at(day, 6)).items()}
