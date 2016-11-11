exports.user = require('./user');
exports.application = require('./application');

// 메인 페이지
exports.index = function(req, res, next) {
  res.render('index');
};