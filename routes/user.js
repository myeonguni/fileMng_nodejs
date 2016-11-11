// GET 로그인
exports.login = function(req, res, next) {
  res.render('login', {error: '', joinSuccess: ''});
};

// GET 회원가입
exports.join = function(req, res, next) {
  res.render('join',  {error: ''});
};

// GET 로그아웃
exports.logout = function(req, res, next) {
  req.session.destroy();
  res.redirect('/');
};

// POST 로그인 인증
exports.login_authenticate = function(req, res, next) {
  if (!req.body.email || !req.body.password)
  	return res.render('login', {
  		error: '이메일과 패스워드를 모두 입력해주세요 !',
      joinSuccess: ''
  	});
  req.collections.users.findOne({
  	email: req.body.email,
  	password: req.body.password
  }, function(error, user){
  	if (error) return next(eroor);
  	if (!user) return res.render('login', {
  		error: '이메일 혹은 패스워드가 일치하지 않습니다 !',
      joinSuccess: ''
  	});
  	req.session.user = req.body.email;
  	res.redirect('/');
  })
};

// POST 회원가입 인증
exports.join_add = function(req, res, next) {
  if (!req.body.email || !req.body.password)
    return res.render('join', {
      error: '이메일과 패스워드를 모두 입력해주세요 !'
    });
  // 아이디 중복체크
  req.collections.users.findOne({ email: req.body.email }, function (err, member) {
    if (err) return next(error);
    // 아이디가 중복되지 않으면
    if(member == null) {
      var user = {
        email: req.body.email,
        password: req.body.password
      };
      req.collections.users.insert(user, function(error, user) {
        if (error) return next(error);
        res.render('login', {error: '', joinSuccess: '회원가입에 성공하셨습니다. 로그인 해주세요.'});
      });
    } else {
      res.render('join', {error: '이미 존재하는 아이디 입니다.'});
    }
  })
};
