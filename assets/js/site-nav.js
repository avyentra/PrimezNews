// Shared reader navigation, including documents served under /news/<slug>/.
(() => {
  const links = [
    ['All', 'ਮੁੱਖ ਪੰਨਾ', 'होम', 'Home'],
    ['Punjab', 'ਪੰਜਾਬ', 'पंजाब', 'Punjab'],
    ['Politics', 'ਸਿਆਸਤ', 'राजनीति', 'Politics'],
    ['Agriculture', 'ਖੇਤੀਬਾੜੀ', 'कृषि', 'Agriculture'],
    ['Education', 'ਸਿੱਖਿਆ', 'शिक्षा', 'Education'],
    ['Crime', 'ਅਪਰਾਧ ਤੇ ਸੁਰੱਖਿਆ', 'अपराध और सुरक्षा', 'Crime & Safety'],
    ['Sports', 'ਖੇਡਾਂ', 'खेल', 'Sports'],
    ['Faith', 'ਆਸਥਾ ਤੇ ਸੱਭਿਆਚਾਰ', 'आस्था और संस्कृति', 'Faith & Culture'],
    ['Jobs', 'ਰੋਜ਼ਗਾਰ', 'रोज़गार', 'Jobs']
  ];
  const host = document.querySelector('primez-site-nav');
  if (!host) return;
  const root = host.attachShadow({mode: 'open'});
  root.innerHTML = `<style>
    :host{display:block;position:sticky;top:0;z-index:12;width:100%;flex:none;align-self:start;background:white;color:#101e34;box-shadow:0 2px 8px #17223b16;border-block:1px solid #e3e5eb;font:600 15px/1.35 system-ui,sans-serif}
    *{box-sizing:border-box}nav{margin:auto;max-width:1280px;padding:0 16px;display:flex;align-items:center;gap:0}
    .items{display:flex;align-items:stretch;flex-wrap:wrap}a,button{font:inherit;color:inherit;background:white;text-decoration:none;cursor:pointer;border:0}
    a{display:flex;align-items:center;gap:8px;padding:13px clamp(9px,1vw,18px);min-height:46px;position:relative}
    a:not(:last-child)::after{content:'';position:absolute;right:0;height:15px;border-right:1px solid #dee1e6}
    a:hover,button:hover{background:#faf7ef}a[aria-current]{box-shadow:inset 0 -3px #dfa421}
    a:focus-visible,button:focus-visible{outline:2px solid #765014;outline-offset:-3px}
    svg{width:19px;height:19px;flex:none}.district{margin-left:auto;font-size:14px}
    ${document.querySelector('.pn-header') ? '.district{display:none}.items{margin-inline:auto}' : ''}
    button{display:none;padding:10px 8px;min-height:44px;align-items:center;gap:8px}
    @media(max-width:1050px){nav{flex-wrap:wrap}button{display:flex}.district{order:1}.items{display:none;order:2;width:100%;max-height:65vh;overflow:auto}.items.open{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.items a::after{display:none}.items a{border-top:1px solid #eee}}
    </style><nav><button type="button" aria-expanded="false" aria-controls="sections"><span aria-hidden="true">☰</span><span></span></button><div class="items" id="sections"></div><a class="district" href="index.html#districts"></a><slot></slot></nav>`;
  const items = root.querySelector('.items'), toggle = root.querySelector('button');
  const home = new URL('index.html',document.baseURI);
  const landing = [home.pathname, home.pathname.replace(/index\.html$/,''),new URL('home-v2.html',home).pathname].includes(location.pathname);
  const params = new URLSearchParams(location.search);
  const active = landing && !params.has('story') ? params.get('category') || 'All' : null;
  const anchors = links.map(([key]) => {
    const a = document.createElement('a');
    a.href = key === 'Jobs' ? 'https://www.pgrkam.com/' : key === 'All' ? 'index.html' : 'home-v2.html?category=' + key;
    if (key === active) a.setAttribute('aria-current','page');
    if (key === 'All') a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m2 11 10-8 10 8M5 10v11h5v-7h4v7h5V10"/></svg>';
    a.append(document.createElement('span'));
    items.append(a);
    return a;
  });
  function translate() {
    const lang = document.documentElement.lang.split('-')[0];
    const col = ({pa:1,hi:2,en:3})[lang] || 1;
    anchors.forEach((a,i)=>a.lastChild.textContent=links[i][col]);
    toggle.lastChild.textContent=['','ਮੀਨੂ','मेन्यू','Menu'][col];
    root.querySelector('nav').setAttribute('aria-label',['','ਮੁੱਖ ਨੈਵੀਗੇਸ਼ਨ','मुख्य नेविगेशन','Main navigation'][col]);
    root.querySelector('.district').textContent=['','ਤੁਹਾਡਾ ਜ਼ਿਲ੍ਹਾ','आपका ज़िला','Your district'][col];
  }
  function open(state){items.classList.toggle('open',state);toggle.setAttribute('aria-expanded',String(state));}
  toggle.onclick=()=>open(toggle.getAttribute('aria-expanded')==='false');
  document.addEventListener('click',e=>{if(!e.composedPath().includes(host))open(false);});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){open(false);toggle.focus();}});
  translate();
  new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
