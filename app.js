var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');

var config = require('./config');
var template = require('./template');
const redmine = {
  'url'       : 'http://localhost/redmine/',
  'format'    : '.json',
  'get_param' : '?include=attachments'
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
app.route('/redmine/issues/new/:project_id(\\d+)/:tracker_id(\\d+)')
  .get(function(req, res) {
    var project_id = req.params.project_id;
    var tracker_id = req.params.tracker_id;
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
      postdata: JSON.stringify( postdata ),
      project_id: project_id,
      tracker_id: tracker_id,
      template_name: use_template.filename,
      mapping_table: JSON.stringify( use_template.mapping_table )
    });
  })
  .post(function(req, res) {
    request({
      url: `${redmine.url}issues${redmine.format}`,
      method: 'POST',
      headers: headers,
      json: true,
      form: req.body
    }, function (error, response, body) {
      res.send(response);
    });
  });
app.route('/redmine/issues/:id(\\d+)')
  .get(function(req, res) {
    request({
      url: `${redmine.url}issues/${req.params.id}${redmine.format}${redmine.get_param}`,
      method: 'GET',
      headers: headers
    }, function (error, response, body) {
      var currentdata = JSON.parse(body);
      var project_id = currentdata.issue.project.id;
      var tracker_id = currentdata.issue.tracker.id;
      var use_template = ( 
        template[project_id] && template[project_id][tracker_id] ? template[project_id][tracker_id] :
        template[project_id] ? template[project_id] :
        template
      );
      res.render('issue', {
        currentdata: body,
        project_id: project_id,
        tracker_id: tracker_id,
        template_name: use_template.filename,
        mapping_table: JSON.stringify( use_template.mapping_table )
      });
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
