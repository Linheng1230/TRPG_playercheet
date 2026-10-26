/* Canonical 5R feature resolver. Contains no rule text. */
window.resolveFeatureRule2024=function(cls,sub,key,lv){
  var db=window.ZIZI_5R_FULL_FEATURE_RULES||{};
  cls=String(cls||"");sub=String(sub||"");key=String(key||"").trim();lv=Number(lv||0);
  if(lv){var exact=db[cls+"|"+sub+"|"+key+"|"+lv]||db[cls+"||"+key+"|"+lv];if(exact)return exact;}
  var p1=cls+"|"+sub+"|"+key+"|",p2=cls+"||"+key+"|",found=[];
  Object.entries(db).forEach(function(kv){if(kv[0].startsWith(p1)||kv[0].startsWith(p2))found.push([Number(kv[0].split("|").pop())||0,kv[1]]);});
  if(!found.length)return "";found.sort(function(a,b){return a[0]-b[0]});
  var unique=[...new Set(found.map(function(x){return x[1]}))];return unique.length===1?unique[0]:found[0][1];
};
