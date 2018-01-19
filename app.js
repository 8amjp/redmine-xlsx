var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');

var config = require('./config');
config.host_name = config.host_name || 'http://localhost/redmine/';
var components = config.host_name.match(/^(.+?):\/\/([0-9a-zA-Z-_\.]+):?(\d+)?(\/.*)?$/);
config.redmine_protocol = components[1];
config.redmine_hostname = components[2];
config.redmine_port = (components[3] === undefined ? '' : `:${components[3]}`);
config.redmine_pathname = components[4];
config.api_url = `${config.redmine_protocol}://localhost${config.redmine_port}${config.redmine_pathname}`
config.include_param = config.include_param || '';
config.default_project_id = config.default_project_id || 1;
config.default_tracker_id = config.default_tracker_id || 1;

var headers = {
  'Content-Type': 'application/json',
  'X-Redmine-API-Key': config.api_key
}

const template = require('./template');
const format = '.json';

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
app.route('/issues/new')
  .get(function(req, res) {
    var project_id = req.query.project_id || config.default_project_id;
    var tracker_id = req.query.tracker_id || config.default_tracker_id;
    var switch_user = req.query.switch_user || '';
    var use_template = ( 
      template[project_id] && template[project_id][tracker_id] ? template[project_id][tracker_id] :
      template[project_id] ? template[project_id] :
      template
    );
    var postdata = {
      'issue' : {
        'project_id' : project_id,
        'tracker_id' : tracker_id
      }
    }
    res.render('new', {
      postdata: JSON.stringify(postdata),
      template: JSON.stringify(use_template),
      host_name: config.host_name,
      switch_user: switch_user,
      project_id: project_id,
      tracker_id: tracker_id
    });
  })
  .post(function(req, res) {
    if (req.headers['X-Redmine-Switch-User'] || req.headers['x-redmine-switch-user']) {
      headers['X-Redmine-Switch-User'] = req.headers['X-Redmine-Switch-User'] || req.headers['x-redmine-switch-user'];
    };
    request({
      url: `${config.api_url}issues${format}`,
      method: 'POST',
      headers: headers,
      json: true,
      form: req.body
    }, function (error, response, body) {
      res.send(response);
    });
  });
app.route('/issues/:id(\\d+)')
  .get(function(req, res) {
    request({
      url: `${config.api_url}issues/${req.params.id}${format}${config.include_param}`,
      method: 'GET',
      headers: headers
    }, function (error, response, body) {
      var currentdata = JSON.parse(body);
      var project_id = currentdata.issue.project.id;
      var tracker_id = currentdata.issue.tracker.id;
      var switch_user = req.query.switch_user || '';
      var use_template = ( 
        template[project_id] && template[project_id][tracker_id] ? template[project_id][tracker_id] :
        template[project_id] ? template[project_id] :
        template
      );
      res.render('issue', {
        currentdata: body,
        template: JSON.stringify(use_template),
        host_name: config.host_name,
        switch_user: switch_user,
        project_id: project_id,
        tracker_id: tracker_id
      });
    });
  })
  .post(function(req, res) {
    if (req.headers['X-Redmine-Switch-User'] || req.headers['x-redmine-switch-user']) {
      headers['X-Redmine-Switch-User'] = req.headers['X-Redmine-Switch-User'] || req.headers['x-redmine-switch-user'];
    };
    request({
      url: `${config.api_url}issues/${req.params.id}${format}`,
      method: 'PUT',
      headers: headers,
      json: true,
      form: req.body
    }, function (error, response, body) {
      res.send(response);
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
