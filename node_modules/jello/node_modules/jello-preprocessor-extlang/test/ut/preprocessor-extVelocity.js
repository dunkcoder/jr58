var expect = require('chai').expect,
    fs = require('fs'),
    file = require('fis').file,
    root = __dirname + '/file',
    ext_v = require('../../index.js');

describe('compile', function(){
    var tempfiles = [];

    before(function(){
        fis.project.setProjectRoot(root);
        fis.project.setTempRoot(root+'/target/');
    });

    afterEach(function(){
        tempfiles.forEach(function(f){
            fis.util.del(root+'/target/');
        });
    });

    it('', function(){
        var f = file(__dirname + '/file/index.vm');
        tempfiles.push(f);
        var content = ext_v(f.getContent(), f, {}).toString().replace(/((\r\n)+|(\n)+|(\t)+|(\s)+)/ig, '');
        var target = fs.readFileSync(__dirname + '/file/target.vm').toString().replace(/((\r\n)+|(\n)+|(\t)+|(\s)+)/ig, '');
        expect(content).to.equal(target);

    });
});
