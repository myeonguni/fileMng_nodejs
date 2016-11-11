// 파일업로드 및 압축해제, 파일 처리 관련
var multer = require('multer');
var AdmZip = require('adm-zip');
var fstream = require('fstream');
var fs = require('fs');
var path = require('path');
// 폴더생성
var mkdirp = require('mkdirp');
// 디렉토리 및 파일 삭제 한번에 하기위해
var rmdir = require('rimraf');
// 파일 및 폴더 생성시 시간기준 명명하기 위해
require('date-utils');


/*
 * GET 선택 파일 내용 반환
 */

exports.app = function(req, res, next) {
	// 세션 기반 프로젝트 초기화 작업
	fs.readdir('./uploads/', function (err, files) {
		if(err) throw err;
		var isProject = false;
		// 세션 기반 프로젝트 폴더 존재여부 확인
		files.forEach(function(file) {
			if(file==req.session.user){
				isProject = true;
			}else{ }
			fs.stat('./uploads/'+file, function(err, stats) {
			});
		});
		// 이미 존재할 경우
		if(isProject==true){
			// 하위 파일 갯수 체크(0일 경우 업로드X)
			fs.readdir('./uploads/' + req.session.user, function (err, files) {
				if(files.length > 0){
					res.render('application', {isUpload: '1'});
				}else{
					res.render('application', {isUpload: '0'});
				}
			});
		}else{// 없을 경우
			// 세션 기반 프로젝트 폴더 생성
			fs.mkdir('./uploads/' + req.session.user, 0666, function(err) {
				if(err) throw err;
			});
			res.render('application', {isUpload: '0'});
		}
	});
};


/*
 * GET 프로젝트 트리 구조 JSON 데이터 반환
 */

exports.tree = function(req, res, next) {
	var _p;
    if (req.query.id == '#') {
      _p = path.resolve(__dirname, '../uploads/' + req.session.user);
      processReq(_p, res);
    } else {
      if (req.query.id) {
        _p = req.query.id;
        processReq(_p, res);
      } else {
      	//파일 없을 경우
      }
    }
};

function processReq(_p, res) {
  var resp = [];
  fs.readdir(_p, function(err, list) {
    for (var i = list.length - 1; i >= 0; i--) {
      resp.push(processNode(_p, list[i]));
    }
    res.json(resp);
  });
}

function processNode(_p, f) {
  var s = fs.statSync(path.join(_p, f));
  return {
    "id": path.join(_p, f),
    "text": f,
    "icon" : s.isDirectory() ? 'jstree-folder' : 'jstree-file',
    "state": {
      "opened": false,
      "disabled": false,
      "selected": false
    },
    "li_attr": {
      "base": path.join(_p, f),
      "isLeaf": !s.isDirectory()
    },
    "children": s.isDirectory()
  };
}


/*
 * POST 프로젝트 업로드
 */

var pathName = '';
var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};
var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './uploads/' + req.session.user + '/');
  },
  filename: function (req, file, callback) {
    pathName = file.originalname;
    callback(null, file.originalname);
  }
});
var upload = multer({ storage : storage}).single('upFile');

exports.upload = function(req, res, next) {
	upload(req,res,function(err) {
	    if(err) {
	        return res.end("업로드 오류");
	    }
		//파일 업로드가 완료되면 압축해제 시작
		var zip = new AdmZip("./uploads/"+ req.session.user + '/' + pathName);
		var zipEntries = zip.getEntries(); 
		zipEntries.forEach(function(zipEntry) {
			//console.log(zipEntry.toString());
		});
		// 전체파일 압축해제(경로:세션아이디 폴더 생성)
		zip.extractAllTo("./uploads/" + req.session.user + '/' +pathName.substring(0, pathName.length-4)+"/", /*overwrite*/true);
		// 압축 해제 후 압축파일 삭제
		fs.unlink("./uploads/" + req.session.user + '/' +pathName, function (err) {
		  if (err) throw err;
		});
		res.redirect('/application');
  		//res.render('/application', {uploadSuccess: '업로드에 성공하셨습니다.'});
	});
};


/*
 * GET 파일 생성
 */

exports.createFile = function(req, res, next) {
  // 파일명 중복방지를 위한 현재시간 가져오기
  var dt = new Date();
  var d = dt.toFormat('HH24MISS');
  // 해당 경로에 새파일 생성하기
  fs.writeFile(req.query.id+'/newFile'+d, '', function(err) {
    if(err) console.log("파일생성 에러"+err);
    res.send('success');
  });
};


/*
 * GET 폴더 생성
 */

exports.createFolder = function(req, res, next) {
  // 폴더명 중복방지를 위한 현재시간 가져오기
  var dt = new Date();
  var d = dt.toFormat('HH24MISS');
  // 해당 경로에 새폴더 생성하기
  fs.mkdir(req.query.id+'/newFolder'+d, 0666, function(err) {
    if(err) console.log("폴더생성 에러"+err);
    res.send('success');
  });
};


/*
 * GET 이름변경
 */

exports.rename = function(req, res, next) {
  // 해당 파일의 디렉토리 위치+변경할이름
  var rename = req.query.id.substring(0, req.query.id.lastIndexOf("/"))+"/"+req.query.text;
  // 해당 파일의 이름을 변경하기
  fs.rename(req.query.id, rename, function(err){
    if(err) console.log("이름변경 에러"+err);
    res.send('success');
  });
};


/*
 * GET 파일열기(내용편집)
 */

exports.editFile = function(req, res, next) {
  res.send(fs.readFileSync(req.query.id, 'UTF-8'));
  console.log("내용편집"+req.query.id);
};


/*
 * POST 파일저장
 */

exports.saveFile = function(req, res, next) {
  fs.writeFile(req.body.id, req.body.resource, function(err) {
    if(err) console.log("파일저장 에러"+err);
    res.send('success');
  });
};


/*
 * GET 파일삭제
 */

exports.remove = function(req, res, next) {
  // 해당 경로 및 파일 삭제하기
  rmdir(req.query.id, function(err) {
    if(err) console.log("파일삭제 에러"+err);
    res.send('success');
  });
};
