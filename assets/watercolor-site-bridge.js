/* Watercolor homepage deep-link bridge. Does not alter stored character or rule data. */
(function(){
  'use strict';
  var targets={
    creator:0,origin:1,abilities:2,skills:3,details:4,level:5,prepare:6,
    sheet:7,rules:8,spells:9,shop:10,play:11,characters:12,adventures:13
  };
  var params=new URLSearchParams(window.location.search);
  var route=params.get('view');
  if(!route||!Object.prototype.hasOwnProperty.call(targets,route))return;
  // index.html's original boot() has already run before this deferred companion script.
  if(typeof go!=='function')return;
  go(targets[route]);
})();
