var express = require('express');
var router = express.Router();
var request = require('request-promise-native');

var config = require('../config/config');
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

var template = require('../config/template');

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

router.use('/', function (req, res, next) {
  if(req.query.switch_user) {
    headers['X-Redmine-Switch-User'] = req.query.switch_user;
    locals.switch_user = req.query.switch_user;
  }
  Promise.all([
    // projects
    requestAllData('projects')
    .then(function (data) {
      locals.json.projects = data.projects;
      console.log(new Date(), 'get /projects: done.'); //// console.log
    })
    .catch(function(err){
      console.log(new Date(), 'get /projects: failed.'); //// console.log
    }),
    // trackers
    request({ url: `${config.api_url}trackers${format}`, headers: headers, json: true })
    .then(function (data) {
      locals.json.trackers = data.trackers;
      console.log(new Date(), 'get /trackers: done.'); //// console.log
    })
    .catch(function(err){
      console.log(new Date(), 'get /trackers: failed.'); //// console.log
    }),
    // issue_statuses
    request({ url: `${config.api_url}issue_statuses${format}`, headers: headers, json: true })
    .then(function (data) {
      locals.json.issue_statuses = data.issue_statuses;
      console.log(new Date(), 'get /issue_statuses: done.'); //// console.log
    })
    .catch(function(err){
      console.log(new Date(), 'get /issue_statuses: failed.'); //// console.log
    }),
    // issue_priorities
    request({ url: `${config.api_url}enumerations/issue_priorities${format}`, headers: headers, json: true })
    .then(function (data) {
      locals.json.issue_priorities = data.issue_priorities;
      console.log(new Date(), 'get /enumerations/issue_priorities: done.'); //// console.log
    })
    .catch(function(err){
      console.log(new Date(), 'get /enumerations/issue_priorities: failed.'); //// console.log
    }),
    // custom_fields
    request({ url: `${config.api_url}custom_fields${format}`, headers: headers, json: true })
    .then(function (data) {
      locals.custom_fields = data.custom_fields;
      console.log(new Date(), 'get /custom_fields: done.'); //// console.log
    })
    .catch(function(err){
      console.log(new Date(), 'get /custom_fields: failed.'); //// console.log
    })
  ]).then(function(){
    next();
  });
});

// /issues/new
router.route('/new')
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
router.route('/:id(\\d+)')
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

//
function getLocals(project_id, tracker_id) {
  return new Promise(function(resolve, reject) {
    Promise.all([
      // issue_categories
      request({ url: `${config.api_url}projects/${project_id}/issue_categories${format}`, headers: headers, json: true })
      .then(function (data) {
        locals.json.issue_categories = data.issue_categories;
        console.log(new Date(), 'get /issue_categories: done.'); //// console.log
      })
      .catch(function(err){
        console.log(new Date(), 'get /issue_categories: failed.'); //// console.log
      }),
      // versions
      request({ url: `${config.api_url}projects/${project_id}/versions${format}`, headers: headers, json: true })
      .then(function (data) {
        locals.json.versions = data.versions;
        console.log(new Date(), 'get /versions: done.'); //// console.log
      })
      .catch(function(err){
        console.log(new Date(), 'get /versions: failed.'); //// console.log
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

module.exports = router;