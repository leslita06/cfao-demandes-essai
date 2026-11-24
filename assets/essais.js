(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const enc=new TextEncoder(),dec=new TextDecoder();
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let D=null,SESSION=null,ST={per:'30',sr:'',mod:'',src:'',st:'',q:''},charts={};

/* ---------- Connexion ---------- */
async function sha(t){const h=await crypto.subtle.digest('SHA-256',enc.encode(t));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function ouvrir(cleBrute){
  const k=await crypto.subtle.importKey('raw',cleBrute,'AES-GCM',false,['decrypt']);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(COFFRE.i)},k,b64(COFFRE.d));
  return JSON.parse(dec.decode(pt));
}
async function connexion(login,mdp){
  const c=COFFRE.c[await sha('cfao-essais|'+login.trim().toLowerCase())];
  if(!c) throw 0;
  const base=await crypto.subtle.importKey('raw',enc.encode(mdp),'PBKDF2',false,['deriveKey']);
  const kek=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(c.s),iterations:COFFRE.it,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(c.i)},kek,b64(c.k));
  return JSON.parse(dec.decode(pt));
}
async function demarrer(sess){
  SESSION=sess;D=await ouvrir(b64(sess.k));
  sessionStorage.setItem('cfao-essais',JSON.stringify(sess));
  $('#login').hidden=true;$('#app').hidden=false;
  if(sess.p!=='tout'){ST.sr=sess.p}
  init();
}
$('#eye').onclick=()=>{const p=$('#p');p.type=p.type==='password'?'text':'password';$('#eye').textContent=p.type==='password'?'Afficher':'Masquer'};
$('#lgf').onsubmit=async e=>{
  e.preventDefault();$('#err').textContent='';$('#go').disabled=true;$('#go').textContent='Vérification…';
  try{await demarrer(await connexion($('#u').value,$('#p').value))}
  catch(_){$('#err').textContent='Identifiant ou mot de passe incorrect.';$('#p').value='';$('#p').focus()}
  $('#go').disabled=false;$('#go').textContent='Se connecter';
};
$('#out').onclick=()=>{sessionStorage.removeItem('cfao-essais');location.reload()};
const deja=sessionStorage.getItem('cfao-essais');
if(deja){demarrer(JSON.parse(deja)).catch(()=>sessionStorage.removeItem('cfao-essais'))}

/* ---------- Outils ---------- */
const MOIS=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const JOURS=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const dt=s=>new Date(s);
const jm=d=>d.getDate()+' '+MOIS[d.getMonth()];
const hm=d=>String(d.getHours()).padStart(2,'0')+' h '+String(d.getMinutes()).padStart(2,'0');
const dur=m=>m==null?'—':m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0');
const pct=(a,b)=>b?Math.round(100*a/b)+' %':'—';
const SR=id=>D.showrooms.find(s=>s.id===id)?.nom||id;
const AUJ=()=>dt(D.auj);
const ago=d=>{const m=Math.round((AUJ()-d)/60000);return m<60?'il y a '+m+' min':m<1440?'il y a '+Math.round(m/60)+' h':'il y a '+Math.round(m/1440)+' j'};
const STAT={ 'Nouvelle':'mid','Confirmée':'','Essai réalisé':'','Offre envoyée':'','Commande signée':'ok','Absent':'ko','Annulée':'gr','Perdue':'gr'};
const pill=s=>`<span class="pill ${STAT[s]||''}">${esc(s)}</span>`;
const PASSE=['Essai réalisé','Offre envoyée','Commande signée','Perdue'];
const ev=(d,l)=>d.ev.find(e=>e.l===l);

function filtre(ignorePer){
  const a=AUJ();
  return D.demandes.filter(d=>{
    if(ST.sr&&d.showroom!==ST.sr)return false;
    if(ST.mod&&d.modele!==ST.mod)return false;
    if(ST.src&&d.source!==ST.src)return false;
    if(!ignorePer&&ST.per!=='all'&&(a-dt(d.cree))/864e5>+ST.per)return false;
    return true;
  });
}
function precedent(){
  if(ST.per==='all')return null;const a=AUJ(),n=+ST.per;
  return D.demandes.filter(d=>{const j=(a-dt(d.cree))/864e5;return j>n&&j<=2*n&&(!ST.sr||d.showroom===ST.sr)&&(!ST.mod||d.modele===ST.mod)&&(!ST.src||d.source===ST.src)});
}
function mediane(v){v=v.filter(x=>x!=null).sort((a,b)=>a-b);if(!v.length)return null;const m=v.length>>1;return v.length%2?v[m]:Math.round((v[m-1]+v[m])/2)}

/* ---------- Construction ---------- */
function init(){
  const a=AUJ();
  $('#maj').textContent=`Mis à jour le ${JOURS[a.getDay()]} ${jm(a)} ${a.getFullYear()} à ${hm(a)}`;
  $('#who').textContent=SESSION.p==='tout'?'Direction commerciale':'Showroom '+SR(SESSION.p);
  const opt=(arr,tous,val)=>`<option value="">${tous}</option>`+arr.map(([v,l])=>`<option value="${esc(v)}" ${v===val?'selected':''}>${esc(l)}</option>`).join('');
  $('#fsr').innerHTML=opt(D.showrooms.map(s=>[s.id,s.nom]),'Tous les showrooms',ST.sr);
  $('#fsr').disabled=SESSION.p!=='tout';
  $('#fmod').innerHTML=opt(D.modeles.map(m=>[m,m]),'Tous les modèles','');
  $('#fsrc').innerHTML=opt(D.sources.map(m=>[m,m]),'Toutes les sources','');
  $('#fsr').onchange=e=>{ST.sr=e.target.value;rendre()};
  $('#fmod').onchange=e=>{ST.mod=e.target.value;rendre()};
  $('#fsrc').onchange=e=>{ST.src=e.target.value;rendre()};
  $$('#per button').forEach(b=>b.onclick=()=>{ST.per=b.dataset.p;$$('#per button').forEach(x=>x.classList.toggle('on',x===b));rendre()});
  const sts=['','Nouvelle','Confirmée','Absent','Offre envoyée','Commande signée','Perdue'];
  $('#fst').innerHTML=sts.map(s=>`<button data-s="${s}" class="${s===''?'on':''}">${s||'Toutes'}</button>`).join('');
  $$('#fst button').forEach(b=>b.onclick=()=>{ST.st=b.dataset.s;$$('#fst button').forEach(x=>x.classList.toggle('on',x===b));liste()});
  $('#q').oninput=e=>{ST.q=e.target.value.toLowerCase();liste()};
  $('#csv').onclick=csv;
  $('#dx').onclick=fermer;$('#drw').onclick=e=>{if(e.target.id==='drw')fermer()};
  document.addEventListener('keydown',e=>{if(e.key==='Escape')fermer()});
  rendre();
}
function rendre(){kpis();todo();funnel();semaines();agenda();conseillers();modeles();liste()}

function kpis(){
  const L=filtre(),P=precedent(),a=AUJ();
  const n=L.length,np=P?P.length:null;
  const att=D.demandes.filter(d=>d.statut==='Nouvelle'&&(!ST.sr||d.showroom===ST.sr));
  const vieux=att.filter(d=>(a-dt(d.cree))/6e4>30).length;
  const med=mediane(L.map(d=>d.delai));
  const prevus=L.filter(d=>dt(d.essai)<=a&&d.statut!=='Annulée'&&d.statut!=='Nouvelle');
  const faits=prevus.filter(d=>PASSE.includes(d.statut));
  const cmd=L.filter(d=>d.statut==='Commande signée').length;
  const var_=np?Math.round(100*(n-np)/np):null;
  const k=[
    {l:'Demandes reçues',v:n,s:var_==null?'depuis le lancement':`<span class="${var_>=0?'up':'down'}">${var_>=0?'+':''}${var_} %</span> par rapport aux ${ST.per} jours d'avant`},
    {l:'À confirmer',v:att.length,s:vieux?`${vieux} en attente depuis plus de 30 min`:'toutes traitées en moins de 30 min',al:vieux>0},
    {l:'Délai médian de confirmation',v:dur(med),s:'objectif : moins de 30 min'},
    {l:'Taux de présence',v:pct(faits.length,prevus.length),s:`${faits.length} essais réalisés sur ${prevus.length} prévus`},
    {l:'Essais devenus commandes',v:pct(cmd,faits.length),s:`${cmd} commandes signées`}
  ];
  $('#kpis').innerHTML=k.map(x=>`<div class="kpi ${x.al?'alerte':''}"><div class="l">${x.l}</div><div class="v">${x.v}</div><div class="s">${x.s}</div></div>`).join('');
}

function todo(){
  const a=AUJ(),out=[];
  const base=D.demandes.filter(d=>(!ST.sr||d.showroom===ST.sr)&&(!ST.mod||d.modele===ST.mod)&&(!ST.src||d.source===ST.src));
  base.filter(d=>d.statut==='Nouvelle').forEach(d=>{const m=(a-dt(d.cree))/6e4;out.push({d,o:0+(-m/1e4),c:m>30?'r':'',t:'À confirmer',s:`${d.modele}, ${SR(d.showroom)}, reçue ${ago(dt(d.cree))}`})});
  base.filter(d=>d.statut==='Absent'&&(a-dt(d.essai))/864e5<10).forEach(d=>out.push({d,o:1,c:'r',t:'Absent à rappeler',s:`Essai ${d.modele} prévu le ${jm(dt(d.essai))}, ${d.conseiller}`}));
  base.filter(d=>d.statut==='Essai réalisé'&&(a-dt(ev(d,'Essai réalisé').t))/36e5>24&&(a-dt(d.essai))/864e5<20).forEach(d=>out.push({d,o:2,c:'',t:'Offre à envoyer',s:`Essai ${d.modele} le ${jm(dt(d.essai))}, ${d.conseiller}`}));
  base.filter(d=>d.statut==='Offre envoyée'&&(a-dt(ev(d,'Offre envoyée').t))/864e5>5).forEach(d=>{const j=Math.round((a-dt(ev(d,'Offre envoyée').t))/864e5);if(j<25)out.push({d,o:3,c:'b',t:'Relancer l\'offre',s:`${d.modele}, offre envoyée il y a ${j} jours, ${d.conseiller}`})});
  out.sort((x,y)=>x.o-y.o);
  $('#todo').innerHTML=out.length?out.slice(0,40).map(x=>`<button class="td" data-r="${x.d.ref}"><i class="${x.c}"></i><div><b>${esc(x.d.client)}</b><span>${esc(x.s)}</span></div><em class="${x.c}">${x.t}</em></button>`).join(''):'<p class="vide">Rien en attente.</p>';
  $$('#todo .td').forEach(b=>b.onclick=()=>detail(b.dataset.r));
}

function funnel(){
  const L=filtre(),a=AUJ();
  const conf=L.filter(d=>ev(d,'Confirmée par WhatsApp'));
  const faits=L.filter(d=>ev(d,'Essai réalisé'));
  const off=L.filter(d=>ev(d,'Offre envoyée'));
  const cmd=L.filter(d=>d.statut==='Commande signée');
  const et=[['Demandes',L.length],['Confirmées',conf.length],['Essais réalisés',faits.length],['Offres envoyées',off.length],['Commandes',cmd.length]];
  const max=et[0][1]||1;
  $('#funnel').innerHTML=et.map(([l,v],i)=>`<div class="fn"><span>${l}</span><div class="bar"><i style="width:${Math.max(2,100*v/max)}%"></i></div><b>${v}<small>${i?pct(v,et[i-1][1])+' de l\'étape':''}</small></b></div>`).join('');
}

function semaines(){
  const L=filtre(true),a=AUJ();
  const lundi=d=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
  const fin=lundi(a),debut=lundi(dt(D.demandes[D.demandes.length-1].cree));
  const sem=[];for(let x=new Date(debut);x<=fin;x.setDate(x.getDate()+7))sem.push(new Date(x));
  const pal=['#00438D','#2F6DB5','#25D366','#8FB0D8','#3E3D5C','#B54708'];
  const ds=D.sources.map((s,i)=>({label:s,backgroundColor:pal[i],data:sem.map(w=>L.filter(d=>d.source===s&&+lundi(dt(d.cree))===+w).length),borderRadius:3,maxBarThickness:34}));
  if(charts.s)charts.s.destroy();
  charts.s=new Chart($('#cSem'),{type:'bar',data:{labels:sem.map(w=>'Sem. du '+jm(w)),datasets:ds},options:{maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:11.5}}}},scales:{x:{stacked:true,grid:{display:false},ticks:{font:{size:11}}},y:{stacked:true,beginAtZero:true,ticks:{precision:0}}}}});
}

function agenda(){
  const a=AUJ(),lim=new Date(a);lim.setDate(lim.getDate()+7);
  const L=D.demandes.filter(d=>(!ST.sr||d.showroom===ST.sr)&&(!ST.mod||d.modele===ST.mod)&&['Confirmée','Nouvelle'].includes(d.statut)&&dt(d.essai)>=a&&dt(d.essai)<=lim).sort((x,y)=>dt(x.essai)-dt(y.essai));
  $('#nbav').textContent=L.length+' essais prévus';
  let h='',jour='';
  L.forEach(d=>{const e=dt(d.essai),j=JOURS[e.getDay()]+' '+jm(e);if(j!==jour){h+=`<div class="ag-d">${j}</div>`;jour=j}
    h+=`<div class="ag" data-r="${d.ref}"><span class="h">${hm(e).replace(' h ','h')}</span><div>${esc(d.client)} <span>${esc(d.modele)}, ${esc(SR(d.showroom))}, ${esc(d.conseiller)}</span></div>${pill(d.statut==='Nouvelle'?'À confirmer':'Confirmé')}</div>`});
  $('#agenda').innerHTML=h||'<p class="vide">Aucun essai prévu.</p>';
  $$('#agenda .ag').forEach(b=>b.onclick=()=>detail(b.dataset.r));
}

function conseillers(){
  const L=filtre(),a=AUJ();
  const ligne=(l,arr,cls)=>{const prevus=arr.filter(d=>dt(d.essai)<=a&&!['Annulée','Nouvelle'].includes(d.statut)),faits=prevus.filter(d=>PASSE.includes(d.statut)),cmd=arr.filter(d=>d.statut==='Commande signée').length;
    const med=mediane(arr.map(d=>d.delai));
    return `<tr class="${cls}"><td>${esc(l)}</td><td class="n">${arr.length}</td><td class="n" style="color:${med>30?'var(--orange)':'inherit'}">${dur(med)}</td><td class="n">${pct(faits.length,prevus.length)}</td><td class="n">${cmd}</td><td class="n">${pct(cmd,faits.length)}</td></tr>`};
  let h='<thead><tr><th>Showroom, conseiller</th><th class="n">Demandes</th><th class="n">Délai médian</th><th class="n">Présence</th><th class="n">Commandes</th><th class="n">Essais devenus commandes</th></tr></thead><tbody>';
  D.showrooms.filter(s=>!ST.sr||s.id===ST.sr).forEach(s=>{const A=L.filter(d=>d.showroom===s.id);h+=ligne(s.nom,A,'sr');D.conseillers[s.id].forEach(c=>h+=ligne(c,A.filter(d=>d.conseiller===c),''))});
  $('#tCons').innerHTML=h+'</tbody>';
}

function modeles(){
  const L=filtre();
  if(charts.m)charts.m.destroy();
  charts.m=new Chart($('#cMod'),{type:'bar',data:{labels:D.modeles,datasets:[
    {label:'Demandes',data:D.modeles.map(m=>L.filter(d=>d.modele===m).length),backgroundColor:'#8FB0D8',borderRadius:4,maxBarThickness:22},
    {label:'Commandes',data:D.modeles.map(m=>L.filter(d=>d.modele===m&&d.statut==='Commande signée').length),backgroundColor:'#00438D',borderRadius:4,maxBarThickness:22}]},
    options:{indexAxis:'y',maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:11.5}}}},scales:{x:{beginAtZero:true,ticks:{precision:0}},y:{grid:{display:false}}}}});
  const P=L.filter(d=>d.statut==='Perdue'||d.statut==='Absent'||d.statut==='Annulée');
  const c={};P.forEach(d=>{const k=d.statut==='Perdue'?d.motif:d.statut==='Absent'?'Absent à l\'essai':'Essai annulé';c[k]=(c[k]||0)+1});
  const e=Object.entries(c).sort((a,b)=>b[1]-a[1]),max=e.length?e[0][1]:1;
  $('#motifs').innerHTML=e.map(([k,v])=>`<div class="br"><span>${esc(k)}</span><div class="bar"><i style="width:${100*v/max}%"></i></div><b>${v}</b></div>`).join('')||'<p class="vide">Aucune perte sur la période.</p>';
}

let courant=[];
function liste(){
  let L=filtre();
  if(ST.st)L=L.filter(d=>d.statut===ST.st);
  if(ST.q)L=L.filter(d=>(d.client+' '+d.ref+' '+d.societe+' '+d.conseiller).toLowerCase().includes(ST.q));
  courant=L;
  const h='<thead><tr><th>Reçue le</th><th>Client</th><th>Modèle</th><th>Showroom</th><th>Conseiller</th><th>Essai prévu</th><th class="n">Confirmée en</th><th>Statut</th></tr></thead><tbody>'+
   L.slice(0,300).map(d=>{const c=dt(d.cree),e=dt(d.essai);return `<tr data-r="${d.ref}"><td>${jm(c)}, ${hm(c)}</td><td>${esc(d.client)}${d.societe?' <span class="note">'+esc(d.societe)+'</span>':''}</td><td>${esc(d.modele)}</td><td>${esc(SR(d.showroom))}</td><td>${esc(d.conseiller)}</td><td>${jm(e)}, ${hm(e)}</td><td class="n">${dur(d.delai)}</td><td>${pill(d.statut)}</td></tr>`}).join('')+'</tbody>';
  $('#tAll').innerHTML=h;
  $('#nbAll').textContent=L.length+' demandes'+(L.length>300?', 300 premières affichées':'');
  $$('#tAll tbody tr').forEach(r=>r.onclick=()=>detail(r.dataset.r));
}

function detail(ref){
  const d=D.demandes.find(x=>x.ref===ref);if(!d)return;
  const e=dt(d.essai),pr=d.client.split(' ')[0];
  const msg={
    'Nouvelle':`Bonjour ${pr}, ici ${d.conseiller}, conseiller BYD chez CFAO Mobility. Votre essai du BYD ${d.modele} est confirmé le ${JOURS[e.getDay()]} ${jm(e)} à ${hm(e)}, ${SR(d.showroom)}. Pensez à votre permis. À très vite !`,
    'Absent':`Bonjour ${pr}, nous vous attendions pour l'essai du BYD ${d.modele}. Souhaitez-vous un autre créneau cette semaine ? Je vous le réserve en une minute.`,
    'Essai réalisé':`Bonjour ${pr}, merci pour votre visite. Voici votre offre pour le BYD ${d.modele}, à l'achat ou en location LOXEA. Je reste disponible pour en parler.`,
    'Offre envoyée':`Bonjour ${pr}, avez-vous pu regarder votre offre pour le BYD ${d.modele} ? Je peux vous proposer une simulation de financement adaptée.`
  }[d.statut];
  $('#dBody').innerHTML=`<div class="d-ref">${d.ref}</div><h3 id="dT">${esc(d.client)}</h3>${pill(d.statut)}
  <dl class="dl"><dt>Profil</dt><dd>${esc(d.profil)}${d.societe?', '+esc(d.societe):''}</dd><dt>Téléphone</dt><dd>${esc(d.tel)}</dd><dt>E-mail</dt><dd>${esc(d.mail||'non renseigné')}</dd>
  <dt>Modèle</dt><dd>BYD ${esc(d.modele)}</dd><dt>Showroom</dt><dd>${esc(SR(d.showroom))}</dd><dt>Conseiller</dt><dd>${esc(d.conseiller)}</dd>
  <dt>Essai</dt><dd>${JOURS[e.getDay()]} ${jm(e)}, ${hm(e)}</dd><dt>Permis</dt><dd>${d.permis?'Permis B valide':'Viendra accompagné'}</dd><dt>Venu par</dt><dd>${esc(d.source)}</dd>${d.motif?`<dt>Motif de perte</dt><dd>${esc(d.motif)}</dd>`:''}</dl>
  <h3 style="font-size:15px;color:var(--encre)">Historique</h3>
  <div class="tl">${d.ev.map(x=>{const t=dt(x.t);return `<div><b>${esc(x.l)}</b><span>${jm(t)}, ${hm(t)}${x.d?' · '+esc(x.d):''}</span></div>`}).join('')}</div>
  ${msg?`<div class="d-msg"><b>Message WhatsApp proposé</b>${esc(msg)}</div><div class="d-act"><button class="btn sm" disabled title="Démonstration">Envoyer sur WhatsApp</button><button class="btn ghost sm" id="cp">Copier le message</button></div>`:''}`;
  const cp=$('#cp');if(cp)cp.onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(msg);cp.textContent='Copié'};
  $('#drw').hidden=false;
}
function fermer(){$('#drw').hidden=true}

function csv(){
  const cols=['ref','cree','client','profil','societe','tel','mail','modele','showroom','conseiller','source','essai','delai','statut','motif'];
  const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const t='\ufeff'+cols.join(';')+'\n'+courant.map(d=>cols.map(c=>q(c==='showroom'?SR(d[c]):d[c])).join(';')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download='demandes-essai-byd.csv';a.click();
}
})();
