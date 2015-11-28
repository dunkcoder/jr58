
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
    var reg = /(<%--(?!\[)[\s\S]*?(?:--%>|$))|(<fis\:script(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/fis\:script\s*>|$)|(<fis\:style(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/fis\:style\s*>|$)/ig;
    var callback = function(m, comment, script, scriptbody, style, stylebody) {
        if (script) {
            m = script + extJs(scriptbody, map);
        } else if(style){
            m = style + extCss(style, map);
        } else if (comment) {
            m = analyseComment(comment, map);
        }

        return m;
    };

    content = content.replace(reg, callback);
    return extJsp(content, map, conf);
}

function extJsp(content, map, conf) {
    var reg = /(<%--(?!\[)[\s\S]*?(?:--%>|$))|<fis\:(html|widget|extends|require|uri|script|style)([^>]+)/ig;
    var callback = function(m, comment, type, attributes) {
        if(comment) {
            m = analyseComment(comment, map);
        } else {
            m = m.replace(/(id|name|framework|src|href)=('|")(.*?)\2/ig, function(_, attr, quote, value) {
                switch (attr) {
                    case 'src':
                    case 'href':
                        return attr + '=' + map.uri.ld + quote + value + quote + map.uri.rd;
                        break;

                    default:
                        return attr + '=' + map.id.ld + quote + value + quote + map.id.rd;
                }
            });
        }

        return m;
    };

    return content.replace(reg, callback);
}

module.exports = function(content, file, conf){
    return extHtml(content, fis.compile.lang, conf);
}
