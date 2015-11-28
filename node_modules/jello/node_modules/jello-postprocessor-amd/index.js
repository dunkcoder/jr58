var base = module.exports = require('fis-postprocessor-amd');
var labelParser = require('fis-velocity-label-parser');

function parseVm(content, file, conf) {
    var ret = labelParser(content, conf);
    var content_new = fis.util.clone(content);
    fis.util.map(ret, function(k, v){
        if(v.start_label == '#script'){
            var js_before = content.substring(v.content_start_index, v.content_end_index);
            var m = /^\s*\(.*?\)(?:\n|\r\n|\r)?/.exec(js_before);

            if (m) {
                js_before = js_before.substring(m[0].length);
            }

            var js_after = base.parseJs(js_before, file, conf);
            content_new = content_new.replace(js_before, js_after);
        }
    });

    return content_new;
}

function parseJsp(content, file, conf) {
    var reg = /<%--(?!\[)([\s\S]*?)(?:-->|$)|(<fis\:script(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/fis\:script\s*>|$)/ig;
    var callback = function(m, comment, script, scriptbody) {
        if (script) {
            m = script + base.parseJs(scriptbody, file, conf);
        }

        return m;
    };

    return content.replace(reg, callback);
}

base.parseHtml = (function(older) {

    return function(content, file, conf) {

        content = file.rExt === '.jsp' ? parseJsp(content, file, conf) : parseVm(content, file, conf);

        return older(content, file, conf);
    };
})(base.parseHtml);
