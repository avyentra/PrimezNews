/* Rashifal (zodiac) and Dharm (faith) sections. Reads the shared `stories` list from app.js. */
(function () {
  var SIGNS = [
    ['मेष', '♈'], ['वृषभ', '♉'], ['मिथुन', '♊'], ['कर्क', '♋'], ['सिंह', '♌'], ['कन्या', '♍'],
    ['तुला', '♎'], ['वृश्चिक', '♏'], ['धनु', '♐'], ['मकर', '♑'], ['कुंभ', '♒'], ['मीन', '♓']
  ];
  var grid = document.getElementById('zodiacGrid');
  if (grid) {
    grid.innerHTML = SIGNS.map(function (s, i) {
      return '<a class="zodiac-tile" href="rashi.html?sign=' + i + '"><span class="zodiac-symbol" aria-hidden="true">' + s[1] + '</span><span class="zodiac-name">' + s[0] + '</span></a>';
    }).join('');
  }
  var panelEl = document.getElementById('zodiacPanel');
  if (panelEl) panelEl.remove();

  var faith = document.getElementById('faithGrid');
  if (faith && typeof stories !== 'undefined') {
    var items = stories.filter(function (s) { return s.category === 'Faith'; });
    if (!items.length) {
      faith.innerHTML = '<p class="faith-empty">इस श्रेणी की खबरें जल्द आएँगी।</p>';
    } else {
      var lead = items[0], rest = items.slice(1);
      var others = stories.filter(function (s) { return s.category !== 'Faith'; }).slice(0, 7);
      faith.classList.toggle('single', rest.length === 0 && others.length === 0);
      var leftHtml = rest.length ? '<div class="faith-list">' + rest.map(function (s) {
        return '<button class="faith-item story-open" data-story="' + s.id + '"><h3>' + s.title + '</h3><span class="faith-meta">' + s.district + ' · ' + s.minutes + ' मिनट</span></button>';
      }).join('') + '</div>' : '';
      var leadHtml = '<button class="faith-lead story-open" data-story="' + lead.id + '"><img loading="lazy" decoding="async" src="assets/' + lead.image + '.webp" alt="' + lead.title.replace(/"/g, '&quot;') + '" width="800" height="450"><span class="faith-tag">' + lead.district + '</span><h3>' + lead.title + '</h3><span class="faith-meta">' + lead.minutes + ' मिनट पढ़ें</span></button>';
      var otherHtml = others.length ? '<aside class="faith-others"><h3 class="faith-others-title">अन्य खबरें</h3><ol>' + others.map(function (s, k) {
        return '<li><button class="story-open" data-story="' + s.id + '"><span class="faith-num">' + (k + 1) + '</span><span>' + s.title + '</span></button></li>';
      }).join('') + '</ol></aside>' : '';
      faith.innerHTML = leftHtml + leadHtml + otherHtml;
    }
  }
})();
