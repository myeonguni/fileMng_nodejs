var express = require('express'),
  routes = require('./routes'),
  http = require('http'),
  path = require('path'),
  mongoskin = require('mongoskin'),
  dbUrl = process.env.MONGOHQ_URL || 'mongodb://@110.10.237.6:27017/codigm',
  db = mongoskin.db(dbUrl, {safe: true}),
  collections = {
    allChat: db.collection('allChat'),
    whisperChat: db.collection('whisperChat'),
    users: db.collection('users')
  };
  everyauth = require('everyauth');

// Express.js 미들웨어
var session = require('express-session'),
  logger = require('morgan'),
  errorHandler = require('errorhandler'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override');


// everyauth를 이용한 소셜 로그인(페이스북, 트위터, 구글, 깃허브 지원)
everyauth.debug = true;
everyauth.facebook
  .appId('226344894452009')
  .appSecret('6b2488efd05b0892ea925d64462a9905')
  .findOrCreateUser( function (session, accessToken, accessTokenSecret, facebookUserMetadata) {
    var promise = this.Promise();
    process.nextTick(function(){
        session.user = facebookUserMetadata.id;
        promise.fulfill(facebookUserMetadata.id);
    });
    return promise;
  })
  .redirectPath('/');
everyauth.twitter
  .consumerKey('CSYjDMdwkIq7YojINBzpW3phy')
  .consumerSecret('Ep7W4StdZGhnahT3QtzoWALOIOwJTVX2bM9h401a1hpQy40kck')
  .findOrCreateUser( function (session, accessToken, accessTokenSecret, twitterUserMetadata) {
    var promise = this.Promise();
    process.nextTick(function(){
        session.user = twitterUserMetadata.id;
        promise.fulfill(twitterUserMetadata.id);
    });
    return promise;
  })
  .redirectPath('/');
everyauth.google
  .appId('3335216477.apps.googleusercontent.com')
  .appSecret('PJMW_uP39nogdu0WpBuqMhtB')
  .scope('https://www.googleapis.com/auth/userinfo.profile https://www.google.com/m8/feeds/')
  .findOrCreateUser( function (session, accessToken, accessTokenSecret, googleUserMetadata) {
    var promise = this.Promise();
    process.nextTick(function(){
        session.user = googleUserMetadata.id;
        promise.fulfill(googleUserMetadata.id);
    });
    return promise;
  })
  .redirectPath('/');
everyauth.github
  .appId('64ef9b1ca5e2a0b5b8b3')
  .appSecret('0b0c7f70780de1c3a6d10492d8d868e2753e94a2')
  .findOrCreateUser( function (session, accessToken, accessTokenSecret, githubUserMetadata) {
    var promise = this.Promise();
    process.nextTick(function(){
        session.user = githubUserMetadata.id;
        promise.fulfill(githubUserMetadata.id);
    });
    return promise;
  })
  .redirectPath('/');

everyauth.everymodule.handleLogout(routes.user.logout);
everyauth.everymodule.findUserById( function (user, callback) {
  callback(user);
});

var app = express();
app.locals.appTitle = 'The developer mission';

// 요청 핸들러에 컬렉션 노출
app.use(function(req, res, next) {
  if (!collections.allChat || !collections.whisperChat || !collections.users) return next(new Error("No collections."));
  req.collections = collections;
  return next();
});

// Express.js 설정
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

// Express.js 미들웨어 설정
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser('3CCC4ACD-63D1-4844-9217-82131BDCB239'));
app.use(session({secret: '2C44774A-D649-4D44-9535-46E296EF984F'}));
app.use(everyauth.middleware());
app.use(methodOverride());
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// 인증 미들웨어
app.use(function(req, res, next) {
  if (req.session && req.session.user){
    res.locals.user = true;
    res.locals.userId = req.session.user;
  }
  next();
});

//권한 부여 미들웨어
var authorize = function(req, res, next) {
  if (req.session && req.session.user){
    return next();
  }
  else{
    return res.render('login', {error: '회원만 이용 가능합니다. 로그인을 먼저 해주세요.', joinSuccess: ''});
  }
};

// development only
if ('development' == app.get('env')) {
  app.use(errorHandler());
}

// 페이지와 경로
app.get('/', routes.index);
app.get('/login', routes.user.login);
app.post('/login', routes.user.login_authenticate);
app.get('/join', routes.user.join);
app.post('/join', routes.user.join_add);
app.get('/logout', routes.user.logout);

app.get('/application', authorize, routes.application.app);
app.post('/application', authorize, routes.application.upload);
app.get('/application/tree', authorize, routes.application.tree);
app.get('/application/tree/createFile', authorize, routes.application.createFile);
app.get('/application/tree/createFolder', authorize, routes.application.createFolder);
app.get('/application/tree/rename', authorize, routes.application.rename);
app.get('/application/tree/editFile', authorize, routes.application.editFile);
app.get('/application/tree/remove', authorize, routes.application.remove);
app.post('/application/tree/saveFile', authorize, routes.application.saveFile);

app.all('*', function(req, res) {
  res.send(404);
});


// express http 서버 
var server = http.createServer(app);
var boot = function () {
  server.listen(app.get('port'), function(){
    console.info('Express server listening on port ' + app.get('port'));
  });
};
var shutdown = function() {
  server.close();
};
if (require.main === module) {
  boot();
} else {
  console.info('Running app as a module');
  exports.boot = boot;
  exports.shutdown = shutdown;
  exports.port = app.get('port');
}


// http 서버 socket.io 서버로 업그레이드
var io = require('socket.io').listen(server);
var nickidlist = [];
var msgTemp;

// 클라이언트가 socket.io 채널로 접속하였을 때
io.sockets.on('connection', function(socket){ 

  // 전체(익명) 채팅 메시지가 온 경우
  socket.on('chatMessage', function(from, msg){
    // DB 저장
    msgTemp = { from: from, msg: msg };
    collections.allChat.insert(msgTemp, function(error, aa) {
      if (error) return next(error);
    });
    // 전체 클라이언트에게 전달
    io.emit('chatMessage', from, msg);
  });

  // 귓속말(쪽지) 채팅 메시지가 온 경우
  socket.on('chatMessage2', function(from, to, msg){
    // DB 저장
    msgTemp = { from: from, to: to, msg: msg };
    collections.whisperChat.insert(msgTemp, function(error, aa) {
      if (error) return next(error);
    });
    if(!io.sockets.connected[nickidlist[to]]){
      // 상대방이 접속안해있을 경우(메시지로 간주)
      socket.emit('chatMessage2', from+"→"+to, "상대방이 현재 접속중이지 않습니다. 메시지 처리 되었습니다. - "+msg+" -");
    }else{
      // 귓속말 요청 클라이언트에게 전달
      socket.emit('chatMessage2', from+"→"+to, msg);
      // 귓속말 받는 클라이언트에게 전달
      io.sockets.sockets[nickidlist[to]].emit('chatMessage2', from+"→"+to, msg);
    }
  });


  // 초기 접속 시 (전체채팅) 대화내용 로드
  socket.on('setAllChat', function(from, msg){
    collections.allChat.find({}).toArray(function(error, msg) {
      if (error) return next(error);
      if (!msg) return next();
      for(var i=0; i<msg.length; i++){
        socket.emit('chatMessage', msg[i].from, msg[i].msg);
      }
    });
  });

  // 초기 접속 시 (귓속말) 대화내용 로드
  socket.on('setWhisperChat', function(from, msg){
    // 실시간 귓속말을 위한 유저리스트 저장
    if(nickidlist[from]==null){
      nickidlist[from] = socket.id;
    }
    // 몽고디비에서 귓속말 내역 가져오기
    collections.whisperChat.find({}).toArray(function(error, msg) {
      if (error) return next(error);
      if (!msg) return next();
      for(var i=0; i<msg.length; i++){
        if(msg[i].from == from || msg[i].to == from){
          socket.emit('chatMessage2', msg[i].from+"→"+msg[i].to, msg[i].msg);
        }
      }
    });
  });
});