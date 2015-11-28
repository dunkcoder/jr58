var label;

function pregQuote (str, delimiter) {
    // http://kevin.vanzonneveld.net
    return (str + '').replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&');
}

//"abc?__inline" return true
//"abc?__inlinee" return false
//"abc?a=1&__inline"" return true
function isInline(info){
    return /[?&]__inline(?:[=&'"]|$)/.test(info.query);
}

//analyse [@require id] syntax in comment
function analyseComment(comment, map){
    var reg = /(@require\s+)('[^']+'|"[^"]+"|[^\s;!@#%^&*()]+)/g;
    return comment.replace(reg, function(m, prefix, value){
        return prefix + map.require.ld + value + map.require.rd;
    });
}

//expand javascript
//[@require id] in comment to require resource
//__inline(path) to embedd resource content or base64 encodings
//__uri(path) to locate resource
//require(path) to require resource
function extJs(content, map){
    var reg = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|(\/\/[^\r\n\f]+|\/\*[\s\S]+?(?:\*\/|$))|\b(__inline|__uri|require)\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*')\s*\)/g;
    return content.replace(reg, function(m, comment, type, value){
        if(type){
            switch (type){
                case '__inline':
                    m = map.embed.ld + value + map.embed.rd;
                    break;
                case '__uri':
                    m = map.uri.ld + value + map.uri.rd;
                    break;
                case 'require':
                    m = 'require(' + map.require.ld + value + map.require.rd + ')';
                    break;
            }
        } else if(comment){
            m = analyseComment(comment, map);
        }
        return m;
    });
}

//expand css
//[@require id] in comment to require resource
//[@import url(path?__inline)] to embed resource content
//url(path) to locate resource
//url(path?__inline) to embed resource content or base64 encodings
//src=path to locate resource
function extCss(content, map){
    var reg = /(\/\*[\s\S]*?(?:\*\/|$))|(?:@import\s+)?\burl\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^)}]+)\s*\)(\s*;?)|\bsrc\s*=\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^\s}]+)/g;
    var callback =  function(m, comment, url, last, filter){
        if(url){
            var key = isInline(fis.util.query(url)) ? 'embed' : 'uri';
            if(m.indexOf('@') === 0){
                if(key === 'embed'){
                    m = map.embed.ld + url + map.embed.rd + last.replace(/;$/, '');
                } else {
                    m = '@import url(' + map.uri.ld + url + map.uri.rd + ')' + last;
                }
            } else {
                m = 'url(' + map[key].ld + url + map[key].rd + ')' + last;
            }
        } else if(filter) {
            m = 'src=' + map.uri.ld + filter + map.uri.rd;
        } else if(comment) {
            m = analyseComment(comment, map);
        }
        return m;
    };
    return content.replace(reg, callback);
}


function extHtml(content, map, conf) {
    var labelParser = require('fis-velocity-label-parser');
    var ret = labelParser(content, conf);
    var content_new = fis.util.clone(content);
    fis.util.map(ret, function(k, v){
        if(v.start_label == '#script'){
            var js_before = content.substring(v.content_start_index, v.content_end_index);
            var js_after = extJs(js_before, map);
            content_new = content_new.replace(js_before, js_after);
        }else if(v.start_label == '#style'){
            var css_before = content.substring(v.content_start_index, v.content_end_index);
            var css_after = extCss(css_before, map);
            content_new = content_new.replace(css_before, css_after);
        }

    });
    return extVM(content_new, map, conf);
}

function extVM(content, map, conf) {
    var reg = /(#\*[\s\S]*?(?:\*#|$)|##[^\n\r\f]*)|(?:#(require|extends|widget|html|uri|script|style)\s*\(\s*('|")(.*?)\3)/ig;
    var callback = function(m, comment, directive, quote, url) {
        if (url) {
            m = '#' + directive + '('+  map.id.ld + quote + url + quote + map.id.rd;
        } else if(comment) {
            m = analyseComment(comment, map);
        }

        return m;
    };

    return content.replace(reg, callback);
}

module.exports = function(content, file, conf){
    label = pregQuote('#');

    return extHtml(content, fis.compile.lang, conf);
}
