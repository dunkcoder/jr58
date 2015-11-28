var label = '#';

function pregQuote (str, delimiter) {
    // http://kevin.vanzonneveld.net
    return (str + '').replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&');
}

function addAsync(file, value) {
    var hasBrackets = false;
    var values = [];
    value = value.trim().replace(/(^\[|\]$)/g, function(m, v) {
        if (v) {
            hasBrackets = true;
        }
        return '';
    });
    values = value.split(/\s*,\s*/);
    values = values.map(function(v) {
        var info = fis.util.stringQuote(v);
        v = info.rest.trim();
        var uri = fis.uri.getId(v, file.dirname);
        if (file.extras.async.indexOf(uri.id) < 0) {
            file.extras.async.push(uri.id);
        }
        return info.quote + uri.id + info.quote;
    });

    return {
        values: values,
        hasBrackets: hasBrackets
    };
}

//analyse [@require.async id] syntax in comment
function analyseComment(file, comment){
    var reg = /(@require\.async\s+)('[^']+'|"[^"]+"|[^\s;!@#%^&*()]+)/g;
    return comment.replace(reg, function(m, prefix, value){
        addAsync(file, value);
        return '';
    });
}

function parseJs(content, file, conf){
    var reg = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|(\/\/[^\r\n\f]+|\/\*[\s\S]+?(?:\*\/|$))|\b(require\.async)\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|\[[\s\S]*?\])\s*/g;
    return content.replace(reg, function(m, comment, type, value){
        if(type){
            switch (type){
                case 'require.async':
                    var res = addAsync(file, value);
                    if (res.hasBrackets) {
                        m = 'require.async([' + res.values.join(', ') + ']';
                    } else {
                        m = 'require.async(' + res.values.join(', ');
                    }
                    break;
            }
        } else if (comment) {
            analyseComment(file, comment);
        }
        return m;
    });
}

function parseVm(content, file, conf){

    //处理 <script>标签
    var reg = /(<script(?:\s+[\s\S]*?["'\s\w\/]>|\s*>))([\s\S]*?)(?=<\/script>|$)/ig;
    content = content.replace(reg, function(m, $1, $2) {
        if($1){//<script>
            m = $1 + parseJs($2, file, conf);
        }
        return m;
    });

    //处理 #script()标签
    var labelParser = require('fis-velocity-label-parser');
    ret = labelParser(content, conf);
    var content_new = fis.util.clone(content);
    fis.util.map(ret, function(k, v){
        if(v.start_label == '#script'){
            var js_before = content.substring(v.content_start_index, v.content_end_index);
            var js_after = parseJs(js_before, file, conf);
            content_new = content_new.replace(js_before, js_after);
        }
    });
    return content_new;
}

function parseJsp(content, file, conf) {
    var reg = /(<fis\:script(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/fis\:script\s*>|$)/ig;
    var callback = function(m, script, scriptbody) {
        if (script) {
            m = script + parseJs(scriptbody, file, conf);
        }
        return m;
    };

    return content.replace(reg, callback);
}

module.exports = function(content, file, conf){
    label = pregQuote(label);

    var initial = false;
    if(file.extras == undefined){
        file.extras = {};
        initial = true;
    }
    file.extras.async = [];
    if(file.isHtmlLike){
        content = file.rExt === '.jsp' ? parseJsp(content, file, conf) : parseVm(content, file, conf);
    } else if(file.rExt === '.js'){
        content = parseJs(content, file, conf);
    }
    if (file.extras.async.length == 0) {
        delete file.extras.async;
        if (initial) {
            delete file.extras;
        }
    }
    return content;
}
