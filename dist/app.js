'use strict';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
document.documentElement.classList.add('js');
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = name => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;

function highlightJSON(value) {
  return escapeHTML(typeof value === 'string' ? value : JSON.stringify(value, null, 2)).replace(/(&quot;.*?&quot;)(\s*:)?|\b(true|false|null)\b|\b(\d+(?:\.\d+)?)\b/g, (match, string, key, boolean, number) => `<span class="${key ? 'json-key' : string ? 'json-string' : boolean ? 'json-boolean' : 'json-number'}">${match}</span>`);
}

let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);
  $('.toast span').textContent = message;
  $('.toast').classList.add('show');
  toastTimer = setTimeout(() => $('.toast').classList.remove('show'), 3000);
}

async function copyText(text, message = 'Copied. Ready for your next move.') {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
    return true;
  } catch {
    const copyField = document.createElement('textarea');
    copyField.value = text;
    copyField.style.cssText = 'position:fixed;left:-9999px;top:0';
    const previousFocus = document.activeElement;
    document.body.append(copyField);
    copyField.select();
    const copied = document.execCommand('copy');
    copyField.remove();
    previousFocus?.focus({preventScroll:true});
    toast(copied ? message : 'Use the docs to select and copy this example.');
    return copied;
  }
}

const promptText = 'Read https://mindcase.co/skills.md to learn how to use Mindcase web data APIs. Help me choose the right API for my task, confirm the inputs, and return clean, structured data. Ask me for my API key before running a request.';
const mcpConfig = JSON.stringify({mcpServers:{mindcase:{url:'https://mcp.mindcase.co/',headers:{Authorization:'Bearer YOUR_MINDCASE_API_KEY'}}}}, null, 2);
const apiCallCopy = [
  "curl -X POST 'https://api.mindcase.co/v1/data/google-maps/places/run?wait=true' \\",
  "  -H 'Authorization: Bearer YOUR_API_KEY' \\",
  "  -H 'Content-Type: application/json' \\",
  `  -d '{"params":{"keywords":"coffee shops","location":"London, UK","maxResults":10}}'`
].join('\n');
const apiCall = [
  "curl -X POST \\",
  "  'https://api.mindcase.co/v1/data/google-maps/places/run?wait=true' \\",
  "  -H 'Authorization: Bearer YOUR_API_KEY' \\",
  "  -H 'Content-Type: application/json' \\",
  `  -d '{"params": {`,
  `    "keywords": "coffee shops",`,
  `    "location": "London, UK",`,
  `    "maxResults": 10`,
  `  }}'`
].join('\n');

const examples = {
  linkedin: {
    title:'Company employees', subtitle:'The right people. All the details.', domain:'linkedin.com', icon:'linkedin', queryLabel:'COMPANY URL', query:'linkedin.com/company/acme', fields:'32 fields per profile', rate:'0.4¢ / profile', endpoint:'linkedin/company-employees',
    rows:[{firstName:'Alex',lastName:'Morgan',headline:'Product Designer',city:'San Francisco'},{firstName:'Jordan',lastName:'Lee',headline:'Software Engineer',city:'London'},{firstName:'Taylor',lastName:'Kim',headline:'Head of Growth',city:'New York'}],
    preview:[['AM','Alex Morgan','Product Designer','San Francisco'],['JL','Jordan Lee','Software Engineer','London'],['TK','Taylor Kim','Head of Growth','New York']],
    columns:[['Name', r => `${r.firstName} ${r.lastName}`],['Role', r => r.headline],['Location', r => r.city]],
  },
  maps: {
    title:'Places worth discovering', subtitle:'Local businesses. A world of detail.', domain:'maps.google.com', icon:'googlemaps', queryLabel:'SEARCH + LOCATION', query:'coffee shops in London', fields:'55 fields per place', rate:'0.4¢ / place', endpoint:'google-maps/places',
    rows:[{businessName:'Sunday Coffee',rating:4.8,city:'London',category:'Coffee shop'},{businessName:'The Daily Grind',rating:4.7,city:'London',category:'Coffee shop'},{businessName:'Little Ritual',rating:4.9,city:'London',category:'Coffee shop'}],
    preview:[['SC','Sunday Coffee','Coffee shop · Shoreditch','4.8 rating'],['DG','The Daily Grind','Coffee shop · Soho','4.7 rating'],['LR','Little Ritual','Coffee shop · Hackney','4.9 rating']],
    columns:[['Business', r => r.businessName],['Rating', r => r.rating],['City', r => r.city]],
  },
  amazon: {
    title:'Products. Minus the guesswork.', subtitle:'The details behind the next decision.', domain:'amazon.com', icon:'amazon', queryLabel:'PRODUCT KEYWORD', query:'wireless headphones', fields:'36 fields per product', rate:'0.15¢ / product', endpoint:'amazon/products',
    rows:[{title:'Studio Wireless',price:129,currency:'USD',rating:4.6},{title:'Everyday Audio',price:79,currency:'USD',rating:4.4},{title:'Focus Pro',price:199,currency:'USD',rating:4.8}],
    preview:[['SW','Studio Wireless','Over-ear · Wireless','$129.00'],['EA','Everyday Audio','On-ear · Lightweight','$79.00'],['FP','Focus Pro','Over-ear · Noise cancelling','$199.00']],
    columns:[['Product', r => r.title],['Price', r => `$${r.price}`],['Rating', r => r.rating]],
  }
};
let currentSource = 'linkedin';
let currentFormat = 'json';
let isRunning = false;
let runTimer;
let runStageTimers=[];

function outputObject() {
  return {status:'completed',row_count:3,data:examples[currentSource].rows};
}

function renderOutput() {
  const data = examples[currentSource];
  // Compact, valid JSON keeps the full three-record example legible in the preview.
  const lines = ['{','  "status": "completed",','  "row_count": 3,','  "data": ['];
  data.rows.forEach((row, index) => {
    const fields = Object.entries(row);
    lines.push('    { ' + fields.slice(0,2).map(([k,v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ') + ',');
    lines.push('      ' + fields.slice(2).map(([k,v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ') + ' }' + (index < data.rows.length-1 ? ',' : ''));
  });
  lines.push('  ]','}');
  $('#json-output').innerHTML = highlightJSON(lines.join('\n'));
  $('#table-output').innerHTML = `<table><thead><tr>${data.columns.map(([name]) => `<th scope="col">${escapeHTML(name)}</th>`).join('')}</tr></thead><tbody>${data.rows.map(row => `<tr>${data.columns.map(([,get]) => `<td>${escapeHTML(get(row))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  $('#json-output').hidden = currentFormat !== 'json';
  $('#table-output').hidden = currentFormat !== 'table';
}

function setSource(source) {
  runStageTimers.forEach(clearTimeout);
  runStageTimers=[];
  $('.playground').style.setProperty('--run-progress','0%');
  if (isRunning) {
    clearTimeout(runTimer);
    isRunning = false;
    $('.playground').classList.remove('is-running');
    $('.run-button').disabled = false;
    $('.run-button span').textContent = 'Run example';
  }
  currentSource = source;
  const data = examples[source];
  $$('[data-source]').forEach(button => {
    const active = button.dataset.source === source;
    button.setAttribute('aria-selected', active);
    button.tabIndex = active ? 0 : -1;
  });
  $('#demo-panel').setAttribute('aria-labelledby', `source-${source}`);
  $('#source-domain').textContent = data.domain;
  $('#source-icon').src = `/assets/icons/${data.icon}.svg`;
  $('#demo-title').textContent = data.title;
  $('#demo-subtitle').textContent = data.subtitle;
  $('#query-label').textContent = data.queryLabel;
  $('#demo-query').value = data.query;
  $('#demo-field-count').textContent = data.fields;
  $('#demo-rate').textContent = data.rate;
  $('#source-preview').innerHTML = data.preview.map(([initials,name,detail,meta]) => `<div class="profile-row"><span class="profile-avatar">${escapeHTML(initials)}</span><div class="profile-detail"><strong>${escapeHTML(name)}</strong><span>${escapeHTML(detail)}</span></div><span class="profile-meta">${escapeHTML(meta)}</span></div>`).join('');
  $('#run-status').textContent = 'Ready to use';
  $('#result-count').innerHTML = `${icon('check-circle')}3 example records`;
  renderOutput();
  if (!reducedMotion.matches) {
    $('.source-content').animate([{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:340,easing:'cubic-bezier(.22,1,.36,1)'});
    $('.output-content').animate([{opacity:.45},{opacity:1}],{duration:440});
  }
}

$$('[data-source]').forEach(button => button.addEventListener('click', () => setSource(button.dataset.source)));
$$('[data-output]').forEach(button => button.addEventListener('click', () => {
  currentFormat = button.dataset.output;
  $$('[data-output]').forEach(tab => {const active=tab===button;tab.setAttribute('aria-selected', active);tab.tabIndex=active?0:-1;});
  renderOutput();
}));
$('#demo-form').addEventListener('submit', event => {
  event.preventDefault();
  if (isRunning) return;
  const query = $('#demo-query').value.trim();
  if (!query) {$('#demo-query').focus();toast('Add a source to preview the workflow.');return;}
  isRunning = true;
  $('.playground').classList.add('is-running');
  $('.playground').style.setProperty('--run-progress','18%');
  runStageTimers.forEach(clearTimeout);
  runStageTimers=[
    setTimeout(()=>{if(!isRunning)return;$('#run-status').textContent='Structuring...';$('.playground').style.setProperty('--run-progress','55%');},reducedMotion.matches?100:650),
    setTimeout(()=>{if(!isRunning)return;$('#run-status').textContent='Delivering...';$('.playground').style.setProperty('--run-progress','88%');},reducedMotion.matches?250:1300)
  ];
  $('.run-button').disabled = true;
  $('.run-button span').textContent = 'Structuring sample data...';
  $('#run-status').textContent = 'Extracting...';
  $('#result-count').innerHTML = `${icon('layers')}Preparing example records`;
  runTimer = setTimeout(() => {
    isRunning = false;
    $('.playground').style.setProperty('--run-progress','100%');
    $('.playground').classList.remove('is-running');
    $('.run-button').disabled = false;
    $('.run-button span').textContent = 'Run again';
    if(!reducedMotion.matches)$$('.source-preview .profile-row').forEach((row,index)=>row.animate([{opacity:.3,transform:'translateX(-7px)'},{opacity:1,transform:'translateX(0)'}],{duration:450,delay:index*65,easing:'cubic-bezier(.22,1,.36,1)'}));
    $('#run-status').textContent = 'Completed';
    $('#result-count').innerHTML = `${icon('check-circle')}3 example records`;
    $('#demo-subtitle').textContent = `Sample workflow · ${query.length>43?query.slice(0,42)+'…':query}`;
    renderOutput();
    if (!reducedMotion.matches) $('.output-content').animate([{opacity:.25,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'cubic-bezier(.22,1,.36,1)'});
    toast('Example complete. Your sample records are ready.');
  }, reducedMotion.matches ? 400 : 1850);
});
$('#copy-output').addEventListener('click', () => copyText(JSON.stringify(outputObject(), null, 2), 'Example JSON copied.'));
setSource('linkedin');

const steps = [
  ['25+ sources, one connection','source: "the web" <svg class="inline-flow-arrow" aria-hidden="true"><use href="#arrow-right"/></svg> output: "possibilities"'],
  ['Extracting, without the busywork','request: "your task" <svg class="inline-flow-arrow" aria-hidden="true"><use href="#arrow-right"/></svg> status: "running"'],
  ['Structured data, ready to build','status: "completed" <svg class="inline-flow-arrow" aria-hidden="true"><use href="#arrow-right"/></svg> next: "your idea"']
];
let currentWorkflowStep=0;
let workflowTransitions=[];
function setStep(index, animate=true) {
  if(index<0||index>2)return;
  const previous=currentWorkflowStep;
  currentWorkflowStep=index;
  workflowTransitions.forEach(animation=>animation.cancel());
  workflowTransitions=[];
  $$('[data-step]').forEach(button=>{const active=Number(button.dataset.step)===index;button.classList.toggle('active',active);button.setAttribute('aria-selected',active);button.tabIndex=active?0:-1;});
  $('#workflow-status').textContent=steps[index][0];
  $('#workflow-code').innerHTML=steps[index][1];
  $('#workflow-graphic').dataset.stage=index;
  $('#workflow-mobile-description').textContent=$(`#workflow-tab-${index} p`).textContent.replace(/\s+/g,' ').trim();
  const panels=$$('.workflow-scene');
  const runTransition=animate&&!reducedMotion.matches&&index!==previous;
  panels.forEach((panel,panelIndex)=>{
    const active=panelIndex===index;
    panel.inert=!active;
    panel.setAttribute('aria-hidden',String(!active));
    panel.hidden=!active&&!(runTransition&&panelIndex===previous);
    const svg=$('.workflow-illustration',panel);
    if(svg&&typeof svg.pauseAnimations==='function'){
      if(active){
        svg.setCurrentTime(0);
        const bounds=panel.getBoundingClientRect();
        if(!reducedMotion.matches&&bounds.bottom>0&&bounds.top<innerHeight)svg.unpauseAnimations();else svg.pauseAnimations();
      }else svg.pauseAnimations();
    }
  });
  if(runTransition){
    const outgoing=panels[previous].animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(-10px)'}],{duration:170,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
    outgoing.onfinish=()=>{if(currentWorkflowStep!==previous)panels[previous].hidden=true;};
    const incoming=panels[index].animate([{opacity:0,transform:'translateX(14px)'},{opacity:1,transform:'translateX(0)'}],{duration:400,easing:'cubic-bezier(.22,1,.36,1)'});
    workflowTransitions=[outgoing,incoming];
  }
}
$$('[data-step]').forEach(button=>button.addEventListener('click',()=>setStep(Number(button.dataset.step))));
setStep(0,false);
function syncWorkflowOrientation(){
  $('.workflow-steps').setAttribute('aria-orientation',window.matchMedia('(max-width:800px)').matches?'horizontal':'vertical');
}
syncWorkflowOrientation();
window.addEventListener('resize',syncWorkflowOrientation,{passive:true});

const apis = [
  {name:'LinkedIn Profiles',path:'linkedin/profiles',icon:'linkedin',category:'people',label:'PEOPLE & COMPANIES',description:'Find the people behind your next opportunity. Profiles, experience, and more.',rate:'0.4¢ / profile',fields:'32+ profile fields',color:'#e2ebfa',tint:'#eaf1ff',accent:'#4d75ae',params:{queries:['https://www.linkedin.com/in/example']},sample:{firstName:'Alex',lastName:'Morgan',headline:'Product Designer',city:'San Francisco'}},
  {name:'Google Maps Places',path:'google-maps/places',icon:'googlemaps',category:'places',label:'PLACES & BUSINESSES',description:'Discover local businesses, from opening hours to ratings and contact details.',rate:'0.4¢ / place',fields:'55 place fields',color:'#e0eee2',tint:'#e7f7ee',accent:'#3d8761',params:{keywords:'coffee shops',location:'London, UK',maxResults:10},sample:{businessName:'Sunday Coffee',category:'Coffee shop',city:'London',rating:4.8}},
  {name:'Amazon Products',path:'amazon/products',icon:'amazon',category:'commerce',label:'PRODUCTS & COMMERCE',description:'Get the full product picture. Prices, availability, ratings, and specifications.',rate:'0.15¢ / product',fields:'36 product fields',color:'#f7e9ce',tint:'#fff4db',accent:'#b0863d',params:{keywords:'wireless headphones',marketplace:'com',maxResults:10},sample:{title:'Studio Wireless',price:129,currency:'USD',rating:4.6}},
  {name:'Instagram Profiles',path:'instagram/profiles',icon:'instagram',category:'social',label:'SOCIAL & CREATORS',description:'Understand creators and brands through bios, audiences, and recent content.',rate:'0.2¢ / profile',fields:'Profiles & audience data',color:'#f4dfe9',tint:'#ffeaf3',accent:'#ad638e',params:{},sample:{username:'example_studio',fullName:'Example Studio',followersCount:12500}},
  {name:'Reddit Posts',path:'reddit/posts',icon:'reddit',category:'social',label:'CONVERSATIONS & COMMUNITY',description:'Follow the conversations that matter. Posts from communities, users, and feeds.',rate:'0.5¢ / result',fields:'Posts & engagement data',color:'#f6e3d4',tint:'#fff0e6',accent:'#bc784f',params:{},sample:{title:'What are you building this week?',subreddit:'SideProject',score:142}},
  {name:'X / Tweets',path:'twitter/tweets',icon:'x',category:'social',label:'SOCIAL & SIGNALS',description:'Turn timelines and searches into useful signals, with context and engagement.',rate:'0.025¢ / tweet',fields:'Tweets & engagement data',color:'#e7dff2',tint:'#eee9fc',accent:'#8464af',params:{},sample:{text:'A new week. A new idea.',likes:87,reposts:12}}
];
let selectedCategory = 'all';
function renderAPIs() {
  const query=$('#api-search').value.trim().toLowerCase();
  const visible=apis.filter(api=>(selectedCategory==='all'||api.category===selectedCategory)&&`${api.name} ${api.description} ${api.label}`.toLowerCase().includes(query));
  $('#api-grid').innerHTML=visible.length?visible.map((api,i)=>`<button class="api-card" data-api="${api.path}" style="--icon-bg:${api.color};--card-tint:${api.tint};--platform-ink:${api.accent};animation-delay:${i*40}ms" aria-label="Explore ${api.name} API"><div class="api-card-top"><span class="api-card-icon"><img src="/assets/icons/${api.icon}.svg" alt=""></span>${icon('arrow-up-right')}</div><h3>${api.name}</h3><p>${api.description}</p><div class="api-card-footer"><span>${api.label}</span><strong>${api.rate}</strong></div></button>`).join(''):`<div class="api-empty">${icon('search')}<p>No matching featured APIs.</p><button id="clear-api-search">Clear filters</button></div>`;
  $('#catalog-count').textContent=selectedCategory==='all'&&!query?'6 featured APIs. A lot more to explore.':`${visible.length} featured ${visible.length===1?'API':'APIs'} found.`;
  $$('[data-api]').forEach(button=>button.addEventListener('click',()=>showAPI(button.dataset.api)));
  $('#clear-api-search')?.addEventListener('click',()=>{$('#api-search').value='';selectedCategory='all';$$('[data-category]').forEach(b=>{const active=b.dataset.category==='all';b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});renderAPIs();$('#api-search').focus();});
}
$$('[data-category]').forEach(button=>button.addEventListener('click',()=>{selectedCategory=button.dataset.category;$$('[data-category]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});renderAPIs();}));
$('#api-search').addEventListener('input',renderAPIs);
function showAPI(path) {
  const api=apis.find(item=>item.path===path);
  $('#api-dialog-content').innerHTML=`<div class="api-detail-top"><img src="/assets/icons/${api.icon}.svg" alt=""><h2 id="api-dialog-title">${api.name}</h2></div><p>${api.description}</p><div class="api-detail-meta"><span>${api.fields}</span><span>${api.rate}</span></div><div class="api-detail-label">ILLUSTRATIVE OUTPUT · SAMPLE RECORD</div><pre>${highlightJSON(api.sample)}</pre><a class="button button-primary" href="https://mindcase.co/api/${api.path}" target="_blank" rel="noopener">Explore this API ${icon('arrow-up-right')}</a>`;
  openDialog($('#api-dialog'));
}
renderAPIs();

let currentConnection='api';
const connectionExamples={
  api:{filename:'get-started.sh',comment:'// Great things start with one request.',code:apiCall,copy:apiCallCopy,response:'{\n  "status": "completed",\n  "row_count": 1,\n  "data": [{\n    "businessName": "Sunday Coffee",\n    "rating": 4.8\n  }]\n}',responseLabel:'ILLUSTRATIVE RESPONSE',note:'One key. Every API.'},
  prompt:{filename:'your-next-idea.md',comment:'// Let your AI agent take it from here.',code:'Read mindcase.co/skills.md.\n\nFind 10 coffee shops in London.\nReturn their names, ratings,\nand websites as structured data.\n\nAsk me for the required API key\nbefore making a request.',copy:promptText,response:'1. Read the API documentation\n2. Choose google-maps/places\n3. Confirm inputs and API key\n4. Run and return structured records',responseLabel:'A SIMPLE WORKFLOW',note:'Plain English. Structured results.'},
  mcp:{filename:'mcp.json',comment:'// Your agent just got a new connection.',code:mcpConfig,copy:mcpConfig,response:'1. list_agents()\n2. get_agent_schema(group, slug)\n3. run_agent(group, slug, params)',responseLabel:'DISCOVER. CONNECT. BUILD.',note:'OAuth or API key authentication.'}
};
function setConnection(key) {
  currentConnection=key;
  const data=connectionExamples[key];
  $$('[data-connect]').forEach(button=>{const active=button.dataset.connect===key;button.setAttribute('aria-selected',active);button.tabIndex=active?0:-1;});
  $('#terminal-filename').textContent=data.filename;
  $('#terminal-comment').textContent=data.comment;
  $('#connection-code').innerHTML=key==='mcp'?highlightJSON(data.code):escapeHTML(data.code).replace(/(curl|POST|Read|Find|Return|Ask)/g,'<span class="terminal-command">$1</span>').replace(/(&#39;[^\n]*?&#39;)/g,'<span class="terminal-string">$1</span>');
  $('#connection-response').textContent=data.response;
  $('#terminal-response-label').textContent=data.responseLabel;
  $('#terminal-note').textContent=data.note;
  if (!reducedMotion.matches) $('.terminal-body').animate([{opacity:.3,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:350,easing:'cubic-bezier(.22,1,.36,1)'});
}
$$('[data-connect]').forEach(button=>button.addEventListener('click',()=>setConnection(button.dataset.connect)));
setConnection('api');

let dialogReturnFocus=null;
function openDialog(dialog) {
  if(dialog.open)return;
  dialogReturnFocus=document.activeElement;
  dialog.showModal();
  document.body.style.overflow='hidden';
}
function closeDialog(dialog) {
  if (!dialog.open || dialog.classList.contains('is-closing')) return;
  if (reducedMotion.matches) { dialog.close(); return; }
  dialog.classList.add('is-closing');
  setTimeout(() => { dialog.close(); dialog.classList.remove('is-closing'); }, 150);
}
$$('dialog').forEach(dialog=>{
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
  $('[data-close-dialog]',dialog).addEventListener('click',()=>closeDialog(dialog));
  dialog.addEventListener('click',event=>{if(event.target===dialog){const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)closeDialog(dialog);}});
  dialog.addEventListener('close',()=>{document.body.style.overflow='';dialogReturnFocus?.focus({preventScroll:true});dialogReturnFocus=null;});
});
$$('[data-open-connect]').forEach(button=>button.addEventListener('click',()=>openDialog($('#connect-dialog'))));
$$('[data-copy]').forEach(button=>button.addEventListener('click',()=>{
  const type=button.dataset.copy;
  const text=type==='prompt'?promptText:type==='mcp-url'?'https://mcp.mindcase.co/':connectionExamples[currentConnection].copy;
  copyText(text,type==='prompt'?'AI prompt copied. Paste it into your coding agent.':type==='mcp-url'?'MCP server URL copied.':'Connection example copied.').then(copied=>{
    if(!copied)return;
    const previousMarkup=button.innerHTML,previousLabel=button.getAttribute('aria-label');
    const svg=button.querySelector('svg');
    if(svg)svg.innerHTML='<use href="#check-circle"/>';
    button.setAttribute('aria-label','Copied successfully');
    setTimeout(()=>{button.innerHTML=previousMarkup;if(previousLabel)button.setAttribute('aria-label',previousLabel);else button.removeAttribute('aria-label');},1800);
  });
}));

let priceFeedback;
function updatePrice() {
  const count=Number($('#record-range').value),rate=Number($('#price-api').value);
  const previousPrice=$('#estimated-price').textContent;
  $('#record-count').value=count.toLocaleString('en-US');
  $('#estimated-price').textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(count*rate);
  if(previousPrice!==$('#estimated-price').textContent&&!reducedMotion.matches){
    priceFeedback?.cancel();
    priceFeedback=$('#estimated-price').animate([{opacity:.55,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.22,1,.36,1)'});
  }
  const progress=(count-100)/9900*100;
  $('#record-range').style.background=`linear-gradient(to right,#505050 ${progress}%,#e6e6e6 ${progress}%)`;
}
$('#record-range').addEventListener('input',updatePrice);
$('#price-api').addEventListener('change',updatePrice);
updatePrice();

// Native anchors keep useful fallbacks; enhanced navigation avoids unnecessary hashes.
function goToSection(target) {
  const element=document.getElementById(target);
  if (!element)return;
  element.scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'start'});
}
$$('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
  if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const id=link.getAttribute('href').slice(1);
  if(!document.getElementById(id))return;
  event.preventDefault();
  closeMenu();
  goToSection(id);
  // Move focus for keyboard-driven navigation without causing a second scroll.
  if(event.detail===0){const target=document.getElementById(id);target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
}));
$('.back-top').addEventListener('click',()=>window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'}));
const menuButton=$('.menu-toggle');
function closeMenu(){menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open menu');$('#mobile-nav').classList.remove('open');$('#mobile-nav').inert=true;}
menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';menuButton.setAttribute('aria-expanded',open);menuButton.setAttribute('aria-label',open?'Close menu':'Open menu');$('#mobile-nav').classList.toggle('open',open);$('#mobile-nav').inert=!open;});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape')closeMenu();
  if(event.key==='/'&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)&&!$$('dialog[open]').length){event.preventDefault();goToSection('apis');$('#api-search').focus({preventScroll:true});}
});
window.matchMedia('(min-width:801px)').addEventListener('change',event=>{if(event.matches)closeMenu();});

// Roving tabindex and arrow-key navigation for every tab group.
$$('[role="tablist"]').forEach(group=>group.addEventListener('keydown',event=>{
  const tabs=$$('[role="tab"]',group);
  const current=tabs.indexOf(document.activeElement);
  if(current<0)return;
  const vertical=group.getAttribute('aria-orientation')==='vertical';
  const next=vertical?'ArrowDown':'ArrowRight',previous=vertical?'ArrowUp':'ArrowLeft';
  let index;
  if(event.key===next)index=(current+1)%tabs.length;
  else if(event.key===previous)index=(current-1+tabs.length)%tabs.length;
  else if(event.key==='Home')index=0;
  else if(event.key==='End')index=tabs.length-1;
  else return;
  event.preventDefault();tabs[index].click();tabs[index].focus();
}));

// Progressive reveals and light SVG choreography, with content always available.
if ('IntersectionObserver' in window) {
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.09,rootMargin:'0px 0px -25px 0px'});
  $$('.reveal').forEach(element=>observer.observe(element));
} else $$('.reveal').forEach(element=>element.classList.add('visible'));
let scrollFrame=false;
function updateScroll(){
  const total=document.documentElement.scrollHeight-window.innerHeight;
  $('.scroll-progress').style.width=`${total>0?window.scrollY/total*100:0}%`;
  $('.site-header').classList.toggle('scrolled',window.scrollY>20);
  scrollFrame=false;
}
window.addEventListener('scroll',()=>{if(!scrollFrame){scrollFrame=true;requestAnimationFrame(updateScroll);}},{passive:true});
updateScroll();

// Only animate visible SVGs; pause their SMIL timelines outside the viewport.
if ('IntersectionObserver' in window) {
  const svgObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    const svg=entry.target;
    if (typeof svg.pauseAnimations==='function') {
      if(!entry.isIntersecting||reducedMotion.matches||svg.closest('[hidden]'))svg.pauseAnimations();else svg.unpauseAnimations();
    }
  }));
  $$('svg').filter(svg=>svg.querySelector('animate,animateMotion')).forEach(svg=>svgObserver.observe(svg));
}
function motionPreferenceChanged(){
  $$('svg').filter(svg=>svg.querySelector('animate,animateMotion')).forEach(svg=>{if(typeof svg.pauseAnimations==='function'){if(reducedMotion.matches||svg.closest('[hidden]'))svg.pauseAnimations();else svg.unpauseAnimations();}});
}
reducedMotion.addEventListener('change',motionPreferenceChanged);
if(reducedMotion.matches)motionPreferenceChanged();

// Native disclosure semantics with paired opening and closing motion.
const faqMotions=new WeakMap();
function animateFAQ(detail, opening) {
  const startHeight=detail.getBoundingClientRect().height;
  faqMotions.get(detail)?.cancel();
  if(reducedMotion.matches){detail.open=opening;detail.style.height='';detail.style.overflow='';return;}
  if(opening)detail.open=true;
  const endHeight=opening?detail.scrollHeight:detail.querySelector('summary').getBoundingClientRect().height+1;
  detail.style.overflow='hidden';
  const animation=detail.animate([{height:`${startHeight}px`},{height:`${endHeight}px`}],{duration:opening?320:240,easing:'cubic-bezier(.22,1,.36,1)'});
  faqMotions.set(detail,animation);
  animation.onfinish=()=>{if(!opening)detail.open=false;detail.style.height='';detail.style.overflow='';faqMotions.delete(detail);};
}
$$('.faq-items details').forEach(detail=>{
  detail.querySelector('summary').addEventListener('click',event=>{
    event.preventDefault();
    const opening=!detail.open;
    if(opening)$$('.faq-items details[open]').forEach(other=>{if(other!==detail)animateFAQ(other,false);});
    animateFAQ(detail,opening);
  });
});

// A persistent SVG underline follows source and output tabs.
const indicatorGroups=$$('.demo-tabs,.output-topbar [role="tablist"]');
function syncTabIndicators(){
  indicatorGroups.forEach(group=>{
    let indicator=$('.moving-indicator',group);
    if(!indicator){indicator=document.createElement('span');indicator.className='moving-indicator';indicator.setAttribute('aria-hidden','true');group.append(indicator);}
    const selected=$('[aria-selected="true"]',group);
    if(!selected)return;
    const bounds=group.getBoundingClientRect(),active=selected.getBoundingClientRect();
    indicator.style.setProperty('--indicator-x',`${active.left-bounds.left+group.scrollLeft}px`);
    indicator.style.setProperty('--indicator-width',`${active.width}px`);
  });
}
document.addEventListener('click',event=>{if(event.target.closest('[data-source],[data-output]'))requestAnimationFrame(syncTabIndicators);});
window.addEventListener('resize',()=>requestAnimationFrame(syncTabIndicators),{passive:true});
document.fonts.ready.then(syncTabIndicators);
syncTabIndicators();

// Fine-pointer highlights add depth; touch visitors receive the same complete UI.
const finePointer=window.matchMedia('(hover:hover) and (pointer:fine)');
$$('.button-primary').forEach(button=>button.addEventListener('pointermove',event=>{
  if(!finePointer.matches||reducedMotion.matches)return;
  const bounds=button.getBoundingClientRect();
  button.style.setProperty('--pointer-x',`${event.clientX-bounds.left}px`);
  button.style.setProperty('--pointer-y',`${event.clientY-bounds.top}px`);
}));
$('#api-grid').addEventListener('pointermove',event=>{
  if(!finePointer.matches||reducedMotion.matches)return;
  const card=event.target.closest('.api-card');
  if(!card)return;
  const bounds=card.getBoundingClientRect();
  card.style.setProperty('--card-x',`${event.clientX-bounds.left}px`);
  card.style.setProperty('--card-y',`${event.clientY-bounds.top}px`);
});
const dataArtwork=$('.workflow-art');
let artworkFrame;
dataArtwork.addEventListener('pointermove',event=>{
  if(!finePointer.matches||reducedMotion.matches)return;
  if(artworkFrame)cancelAnimationFrame(artworkFrame);
  artworkFrame=requestAnimationFrame(()=>{
    const bounds=dataArtwork.getBoundingClientRect();
    const x=(event.clientX-bounds.left)/bounds.width,y=(event.clientY-bounds.top)/bounds.height;
    dataArtwork.style.setProperty('--art-rotate-x',`${(y-.5)*-3}deg`);
    dataArtwork.style.setProperty('--art-rotate-y',`${(x-.5)*3}deg`);
    dataArtwork.style.setProperty('--art-pointer-x',`${x*100}%`);
    dataArtwork.style.setProperty('--art-pointer-y',`${y*100}%`);
  });
});
dataArtwork.addEventListener('pointerleave',()=>{
  if(artworkFrame)cancelAnimationFrame(artworkFrame);
  dataArtwork.style.setProperty('--art-rotate-x','0deg');
  dataArtwork.style.setProperty('--art-rotate-y','0deg');
});
