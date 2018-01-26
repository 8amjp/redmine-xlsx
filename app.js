var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request-promise-native');

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

var template = require('./template');

var locals = {
  'json': {
    'currentdata': {},
    'postdata': {},
    'template': {},
    'projects': {},
    'trackers': {},
    'issue_statuses': {},
    'issue_priorities': {},
    'issue_categories': {},
    'versions': {}
  },
  'project': {},
  'trackers': {},
  'custom_fields': {},
  'host_name': config.host_name,
  'switch_user': ''
};
var headers = {
  'Content-Type': 'application/json',
  'X-Redmine-API-Key': config.api_key
};
var format = '.json';

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

app.use('/issues/', function (req, res, next) {
  if(req.query.switch_user) {
    headers['X-Redmine-Switch-User'] = req.query.switch_user;
    locals.switch_user = req.query.switch_user;
  }
  Promise.all([
    // projects
    requestAllData('projects')
    .then(function (data) {
      locals.json.projects = data.projects;
      console.log(new Date(), 'get /projects: done.');
    })
    .catch(function(err){
      console.log(new Date(), 'get /projects: failed.');
    }),
    // trackers
    request({ url: `${config.api_url}trackers${format}`, headers: headers, json: true })
    .then(function (data) {
      locals.json.trackers = data.trackers;
      console.log(new Date(), 'get /trackers: done.');
    })
    .catch(function(err){
      console.log(new Date(), 'get /trackers: failed.');
    }),
    // issue_statuses
    request({ url: `${config.api_url}issue_statuses${format}`, headers: headers, json: true })
    .then(function (data) {
      locals.json.issue_statuses = data.issue_statuses;
      console.log(new Date(), 'get /issue_statuses: done.');
    })
    .catch(function(err){
      console.log(new Date(), 'get /issue_statuses: failed.');
    }),
    // issue_priorities
    request({ url: `${config.api_url}enumerations/issue_priorities${format}`, headers: headers, json: true })
    .then(function (data) {
      locals.json.issue_priorities = data.issue_priorities;
      console.log(new Date(), 'get /enumerations/issue_priorities: done.');
    })
    .catch(function(err){
      console.log(new Date(), 'get /enumerations/issue_priorities: failed.');
    }),
    // custom_fields
    request({ url: `${config.api_url}custom_fields${format}`, headers: headers, json: true })
    .then(function (data) {
      locals.custom_fields = data.custom_fields;
      console.log(new Date(), 'get /custom_fields: done.');
    })
    .catch(function(err){
      console.log(new Date(), 'get /custom_fields: failed.');
    })
  ]).then(function(){
    next();
  });
});

// /issues/new
app.route('/issues/new')
.get(function(req, res) {
  let project_id = req.query.project_id || config.default_project_id;
  let tracker_id = req.query.tracker_id || config.default_tracker_id;
  locals.json.currentdata = {};
  locals.json.postdata = {
    'issue' : {
      'project_id' : project_id,
      'tracker_id' : tracker_id
    }
  }
  getLocals(project_id, tracker_id)
  .then(function(){
    res.render('new', locals)
  })
})
.post(function(req, res) {
  request({
    url: `${config.api_url}issues${format}`,
    method: 'POST',
    headers: headers,
    json: true,
    form: req.body
  }, function (error, response, body) {
    res.send(response);
  })
});

// /issues/:id
app.route('/issues/:id(\\d+)')
.get(function(req, res) {
  request({ url: `${config.api_url}issues/${req.params.id}${format}${config.include_param}`, headers: headers, json: true })
  .then(function (data) {
    locals.json.currentdata = data;
    locals.json.postdata = {};
    getLocals(data.issue.project.id, data.issue.tracker.id)
    .then(function () {
      res.render('issue', locals);
    })
  })
})
.post(function(req, res) {
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

//
function getLocals(project_id, tracker_id) {
  return new Promise(function(resolve, reject) {
    Promise.all([
      // issue_categories
      request({ url: `${config.api_url}projects/${project_id}/issue_categories${format}`, headers: headers, json: true })
      .then(function (data) {
        locals.json.issue_categories = data.issue_categories;
        console.log(new Date(), 'get /issue_categories: done.');
      })
      .catch(function(err){
        console.log(new Date(), 'get /issue_categories: failed.');
      }),
      // versions
      request({ url: `${config.api_url}projects/${project_id}/versions${format}`, headers: headers, json: true })
      .then(function (data) {
        locals.json.versions = data.versions;
        console.log(new Date(), 'get /versions: done.');
      })
      .catch(function(err){
        console.log(new Date(), 'get /versions: failed.');
      }),
      
    ])
    .then(function(){
      locals.json.template = ( 
        template[project_id] && template[project_id][tracker_id] ? template[project_id][tracker_id] :
        template[project_id] ? template[project_id] :
        template
      );
      locals.project = (0 !== Object.keys(locals.json.projects).length) ? locals.json.projects.filter( function(e) { return (e.id == project_id); })[0] : {};
      locals.tracker = (0 !== Object.keys(locals.json.trackers).length) ? locals.json.trackers.filter( function(e) { return (e.id == tracker_id); })[0] : {};
      resolve();
    })
    .catch(function(err){});
  });
}

//
function requestAllData(key, param) {
  return new Promise(function(resolve, reject) {
    var items = [];
    var offset = 0;
    function loop(offset) {
      request({ url: `${config.api_url}${param || key}${format}?offset=${offset}&limit=100`, headers: headers, json: true })
      .then(function(json){
        Array.prototype.push.apply(items, json[key]);
        if (items.length >= json.total_count || !json.total_count) {
          json[key] = items;
          resolve(json);
        } else {
          loop(offset += 100);
        }
      })
      .catch(function(err){});
    }
    loop(offset);
  });
}

module.exports = app;
