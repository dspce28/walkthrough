/* eslint-disable */
// @ts-nocheck -- ported verbatim from the original single-page drawing set; SVG string builders.
export interface ElevationOption { name: string; tag: string; text: string; pipes: string; mat: string; cost: string; svg: string }
const f2 = (v) => Math.round(v * 100) / 100;
export function buildElevations(): ElevationOption[] {
var SC=20,ZT=35;
function r(x1,z1,x2,z2,fill,ex){return '<rect x="'+f2(x1*SC)+'" y="'+f2((ZT-z2)*SC)+'" width="'+f2((x2-x1)*SC)+'" height="'+f2((z2-z1)*SC)+'" fill="'+fill+'"'+(ex||'')+'/>';}
function ln(x1,z1,x2,z2,st,w,ex){return '<line x1="'+f2(x1*SC)+'" y1="'+f2((ZT-z1)*SC)+'" x2="'+f2(x2*SC)+'" y2="'+f2((ZT-z2)*SC)+'" stroke="'+st+'" stroke-width="'+(w||1)+'"'+(ex||'')+'/>';}
function vl(x1,x2,z1,z2,step,st,w){var s='';for(var x=x1;x<=x2+0.001;x+=step)s+=ln(x,z1,x,z2,st,w);return s;}
function hl(x1,x2,z1,z2,step,st,w){var s='';for(var z=z1;z<=z2+0.001;z+=step)s+=ln(x1,z,x2,z,st,w);return s;}
function pipe(){return ln(13.35,19.2,13.35,0,'#2a7fc0',2,' stroke-dasharray="5 4"')+ln(9,19.2,13.35,19.2,'#2a7fc0',2,' stroke-dasharray="5 4"');}
function back(c){return r(0,20,14,30,c)+r(0,29.5,14,30,'#00000022')+r(1,20,5,27.5,'#00000030')+r(6,22.5,9,27.5,'#9fcbd688');}
function ground(){return r(-1,-2,15,0,'#b9b5a8')+ln(-1,0,15,0,'#2b3138',1.5);}
var opts=[
{name:'A. Sand Frame',tag:'Builds on the reference you picked earlier',
 text:'A sand-coloured box frame wraps the first-floor extension, with a warm LED cove line inside it. The washroom face is fluted walnut-finish panels with one slim glass slit. Travertine cladding and a fluted wooden door mark the entrance.',
 pipes:'Inside the thick right leg of the frame, which continues to the ground as a travertine pier',mat:'Sand texture paint, fluted WPC or teak panels, travertine tiles, glass railing with brass handrail',cost:'₹₹',
 draw:function(){var s=ground()+back('#e7e0d2');
  s+=r(0,0,14,9.5,'#d9d0bf')+r(0,0,6,9.5,'#cdbf9f')+hl(0,6,1.2,9,1.2,'#b8a988',0.8)+r(12.7,0,14,9.5,'#cdbf9f')+hl(12.7,14,1.2,9,1.2,'#b8a988',0.8);
  s+=r(1,0,5,7.5,'#6a472c')+vl(1.15,4.9,0,7.5,0.22,'#3f2819',1)+ln(3,0,3,7.5,'#2a1a10',2)+r(2.8,3,2.9,4.6,'#c9a24a')+r(3.1,3,3.2,4.6,'#c9a24a')+r(1,7.5,5,8.3,'#9fcbd6');
  s+=r(6.4,2.5,12.2,7.5,'#3b3f42')+r(6.55,2.65,12.05,7.35,'#9fcbd6')+vl(8.4,10.3,2.65,7.35,1.85,'#3b3f42',2);
  s+=r(-0.2,9.4,14.2,10.2,'#c9b48a')+r(-0.2,19.3,14.2,20.1,'#c9b48a')+r(-0.2,10.2,0.6,19.3,'#c9b48a')+r(12.7,10.2,14.2,19.3,'#c9b48a');
  s+=r(0.6,10.2,12.7,19.3,'#f1ebdd')+r(0.6,10.2,6,19.3,'#4a4d50')+r(1,10.2,4,17.2,'#2b2e31')+r(4.2,12.7,5.9,17.5,'#7fa9b5');
  s+=r(6,10.2,12.7,19.3,'#7a5335')+vl(6.15,12.6,10.2,19.3,0.25,'#4a2f1c',1.2)+r(9,12.5,9.5,18,'#2b2e31')+r(9.08,12.6,9.42,17.9,'#9fcbd6');
  s+=ln(0.65,19.25,12.65,19.25,'#ffd97a',3)+ln(0.65,10.25,12.65,10.25,'#ffd97a',2);
  s+=r(0.6,10.2,6,13.6,'#bfe0e8',' fill-opacity="0.45" stroke="#6b8d97" stroke-width="1"')+ln(0.6,13.65,6,13.65,'#c9a24a',3);
  s+=r(-0.2,20.1,14.2,23.4,'#ece5d6')+r(-0.2,23.4,14.2,23.8,'#c9b48a')+r(0.2,23.8,0.7,29,'#c9b48a')+r(13.3,23.8,13.8,29,'#c9b48a')+r(-0.2,29,14.2,29.7,'#c9b48a')+ln(0.7,28.95,13.3,28.95,'#ffd97a',2);
  return s+pipe();}},
{name:'B. Classic Cornice',tag:'Matches the classic interior',
 text:'An ivory, symmetrical colonial face with moulded cornices at every floor, slim pilasters at both edges, turned balusters on the balcony and terrace, and sage-green louvred shutters across the washroom.',
 pipes:'Inside the right pilaster, which is built hollow from the washroom to the ground with an access door at each floor',mat:'Ivory texture paint, GRC cornices and balusters, teak panelled door, aluminium louvres in sage green',cost:'₹₹',
 draw:function(){var s=ground()+back('#ede8dc');var iv='#f4efe2',mo='#fffdf6',sh='#d8d0bd';
  s+=r(0,0,14,9.5,'#e6dfcd')+r(0,0,14,1.2,'#bdb5a2');
  s+=r(1,0,5,7.2,'#5b3a24');[1.2,3.1].forEach(function(x){s+=r(x,0.5,x+1.7,3,'#6f4a2f')+r(x,3.4,x+1.7,6.8,'#6f4a2f')+r(x+0.25,3.7,x+1.45,6.5,'#5b3a24');});s+=r(0.8,7.2,5.2,7.6,mo)+r(1,7.6,5,8.6,'#9fcbd6')+vl(2,4,7.6,8.6,1,'#fffdf6',2)+r(0.7,8.6,5.3,8.95,mo);
  s+=r(6.6,2.5,12,7.6,mo)+r(6.8,2.7,11.8,7.4,'#9fcbd6')+vl(8.05,10.55,2.7,7.4,1.25,mo,2.5)+hl(6.8,11.8,4.27,5.84,1.57,mo,2.5)+r(6.4,2.2,12.2,2.5,mo)+r(6.4,7.6,12.2,7.95,mo);
  function cornice(z){return r(-0.35,z,14.35,z+0.25,mo,' stroke="#bdb5a2" stroke-width="0.6"')+r(-0.2,z-0.3,14.2,z,sh)+r(-0.1,z-0.55,14.1,z-0.3,mo)+vl(0.2,13.8,z-0.52,z-0.33,0.4,'#bdb5a2',2);}
  s+=r(0,10,14,19.5,iv)+r(1,10,6,19.5,'#5a5d5f')+r(1.3,10,4,17,'#3a2a1e')+r(4.3,12.5,5.8,17.3,'#8db5c0');
  s+=r(6.6,11.5,12.4,18.3,mo);[6.8,8.7,10.6].forEach(function(x){s+=r(x,11.7,x+1.6,18.1,'#73856a')+hl(x+0.1,x+1.5,11.9,17.9,0.28,'#55664e',1.2);});s+=r(6.4,18.3,12.6,18.65,mo)+r(6.4,11.15,12.6,11.5,mo);
  s+=r(1,10,6,10.35,mo);for(var x=1.25;x<5.9;x+=0.42)s+='<ellipse cx="'+(x*SC)+'" cy="'+((ZT-11.8)*SC)+'" rx="2.6" ry="26" fill="'+mo+'" stroke="#bdb5a2" stroke-width="0.5"/>';s+=r(1,13.2,6,13.55,mo,' stroke="#bdb5a2" stroke-width="0.5"');
  s+=r(0,0,1,23.6,mo,' stroke="#cfc7b3" stroke-width="0.8"')+r(13,0,14,23.6,mo,' stroke="#cfc7b3" stroke-width="0.8"')+vl(0.25,0.75,1.2,23,0.25,'#d8d0bd',1)+vl(13.25,13.75,1.2,23,0.25,'#d8d0bd',1);
  s+=cornice(9.9)+cornice(19.9);
  s+=r(1,20.15,13,20.5,mo);for(var x2=1.25;x2<12.9;x2+=0.42)s+='<ellipse cx="'+(x2*SC)+'" cy="'+((ZT-21.9)*SC)+'" rx="2.6" ry="26" fill="'+mo+'" stroke="#bdb5a2" stroke-width="0.5"/>';s+=r(-0.2,23.25,14.2,23.65,mo,' stroke="#bdb5a2" stroke-width="0.6"');
  [0.5,13.5].forEach(function(x){s+='<circle cx="'+(x*SC)+'" cy="'+((ZT-24.2)*SC)+'" r="7" fill="'+mo+'" stroke="#bdb5a2" stroke-width="0.6"/>';});
  s+=r(1.2,23.65,1.6,28.6,'#fffdf6')+r(12.4,23.65,12.8,28.6,'#fffdf6')+r(0.8,28.6,13.2,29.1,mo,' stroke="#bdb5a2" stroke-width="0.6"')+vl(1.2,12.8,29.1,29.4,0.8,'#cfc7b3',5);
  return s+pipe();}},
{name:'C. Timber Haveli',tag:'Warm, rooted in Gujarat',
 text:'Lime-white walls with teak joinery in the manner of an old Ahmedabad pol house, kept straight-lined. A timber-framed balcony sits on carved brackets under a clay-tile sunshade, and a square teak lattice covers the washroom.',
 pipes:'Behind the teak lattice, then down a stone-clad pier at the right edge',mat:'Lime-finish paint, teak or teak-finish aluminium, Mangalore clay tiles, Dhrangadhra stone plinth, brass studs',cost:'₹₹₹',
 draw:function(){var s=ground()+back('#efeadf');var lw='#f5f1e6',tk='#7d5230',td='#553520';
  s+=r(0,0,14,9.5,'#e9e3d3')+r(0,0,14,1.5,'#b8a888')+hl(0,14,0.5,1,0.5,'#9c8d70',0.7)+r(12.8,0,14,9.5,'#c8b996')+hl(12.8,14,1.5,9,1,'#a9997a',0.7);
  s+=r(0.8,0,5.2,7.9,td)+r(1,0,5,7.5,tk)+ln(3,0,3,7.5,td,2.5);for(var z=1;z<7.2;z+=1.25)for(var x=1.4;x<5;x+=0.8)if(Math.abs(x-3)>0.25)s+='<circle cx="'+(x*SC)+'" cy="'+((ZT-z)*SC)+'" r="2.2" fill="#c9a24a"/>';s+=r(0.6,7.9,5.4,8.3,td);
  s+=r(6.4,2.5,12.2,7.6,td)+r(6.6,2.7,12,7.4,'#9fcbd6')+vl(7.95,10.65,2.7,7.4,1.35,td,3)+ln(6.6,5.8,12,5.8,td,3);
  for(var bx=0.3;bx<14;bx+=1.9)s+='<path d="M'+(bx*SC)+' '+((ZT-9.5)*SC)+' l0 '+(1.6*SC)+' l'+(1.1*SC)+' '+(-1.6*SC)+' Z" fill="'+td+'"/>';
  s+=r(-0.2,9.5,14.2,10.1,td);
  s+=r(0,10.1,14,19,lw)+r(0.6,10.1,6,19,'#5b5d5c')+r(1.2,10.1,4,17,'#3a2416')+r(4.3,12.6,5.8,17.2,'#8db5c0');
  s+=r(6.3,11.2,12.7,18.2,td)+r(6.5,11.4,12.5,18,'#a97a4c');s+=vl(6.5,12.5,11.4,18,0.5,td,2)+hl(6.5,12.5,11.4,18,0.5,td,2);s+=r(8.9,15,10.1,17,'#9fcbd6',' stroke="'+td+'" stroke-width="3"');
  s+=r(0.6,10.1,0.9,19,tk)+r(5.7,10.1,6,19,tk)+r(3.15,10.1,3.4,13.4,tk)+r(0.6,13.4,6,13.7,td)+vl(1.1,5.6,10.3,13.4,0.36,tk,2.5)+r(0.6,10.1,6,10.4,td);
  s+='<path d="M'+(-0.6*SC)+' '+((ZT-19)*SC)+' L'+(14.6*SC)+' '+((ZT-19)*SC)+' L'+(14*SC)+' '+((ZT-20.4)*SC)+' L0 '+((ZT-20.4)*SC)+' Z" fill="#b5653f"/>'+vl(-0.2,14.2,19.05,19.9,0.4,'#8d4a2b',1);
  s+=r(-0.1,20.4,14.1,23.6,lw)+r(-0.2,23.6,14.2,24,td)+vl(1,13,20.8,23.3,1.5,'#d9d2c0',10);
  s+=r(0.4,24,0.8,28.6,tk)+r(13.2,24,13.6,28.6,tk)+r(6.8,24,7.2,28.6,tk)+r(0,28.6,14,29.1,td)+vl(0.3,13.7,29.1,29.5,0.7,tk,5);
  return s+pipe();}}
];
return opts.map(function(o){return {name:o.name,tag:o.tag,text:o.text,pipes:o.pipes,mat:o.mat,cost:o.cost,svg:o.draw()};});
}
