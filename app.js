var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');

var config = require('./config');
const redmine = {
  'url'    : 'http://localhost/redmine/',
  'format' : '.json'
}
const headers = {
  'Content-Type'      : 'application/json',
  'X-Redmine-API-Key' : config.api_key
}

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/node_modules', express.static(__dirname + '/node_modules/'));

app.get('/', function(req, res, next) {
  res.render('index');
});
app.route('/redmine/issues/new')
  .get(function(req, res) {
    res.render('new', { template: JSON.stringify(config.template) });
  })
  .post(function(req, res) {
    request({
      url: `${redmine.url}issues${redmine.format}`,
      method: 'POST',
      headers: headers,
      json: true,
      form: req.body
    }, function (error, response, body) {
      res.send('インポートが完了しました。');
    });
  });
app.route('/redmine/issues/:id(\\d+)')
  .get(function(req, res) {
    request(
      `${redmine.url}issues/${req.params.id}${redmine.format}`,
      function (error, response, body) {
        res.render('issue', { issue: body, template: JSON.stringify(config.template) });
      });
  })
  .post(function(req, res) {
    request({
      url: `${redmine.url}issues/${req.params.id}${redmine.format}`,
      method: 'PUT',
      headers: headers,
      json: true,
      form: req.body
    }, function (error, response, body) {
      res.send('インポートが完了しました。');
    });
  });

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
