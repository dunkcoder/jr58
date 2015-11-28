var jspLang = require('./lang/jsp.js');
var vmLang = require('./lang/vm.js');

module.exports = function(content, file, conf){

    if(file.isHtmlLike){

        // 扩展 id 用法
        var map = fis.compile.lang;
        var key = 'id';
        var LD = '<<<', RD = '>>>';

        map[key] = {
            ld: LD + key + ':',
            rd: RD
        };


        var extHtml = file.rExt === '.jsp' ? jspLang : vmLang;

        return extHtml(content, fis.compile.lang, conf)
            .replace(/\<\<\<id\:([\s\S]+?)\>\>\>/ig, function(_, value) {
                var info = fis.uri.getId(value, file.dirname);

                if (info.file) {
                    return info.quote + info.id + info.quote;
                }

                return value;
            });
    }
}
