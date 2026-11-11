(function(){
  "use strict";
  var defaults={
    enabled:false,
    supabaseUrl:"",
    supabasePublishableKey:"",
    supabaseJsVersion:"2.119.0",
    supabaseJsUrl:"assets/vendor/supabase-2.119.0.js",
    syncDebounceMs:1200
  };
  window.ZIZI_ACCOUNT_CONFIG=Object.freeze(Object.assign({},defaults,window.ZIZI_ACCOUNT_CONFIG||{}));
})();
