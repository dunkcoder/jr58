// @require.async ./inline.js

require.async('./inline.js', function(a){});

require.async(['./inline.js', './inline2.js'], function(a, b){});