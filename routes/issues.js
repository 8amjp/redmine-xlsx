var express = require('express');
var router = express.Router();
var request = require('request-promise-native');
var template = require('es6-template-strings');

var config = require('../config/config');
var xltx = require('../config/template');

var locals = {
  'json': {
    'issue': {},
    'template': {},
    'defaults': config.defaults,
    'projects': {},
    'trackers': {},
    'issue_statuses': {},
    'issue_priorities': {},
    'issue_categories': {},
    'versions': {}
  },
  'workbookname': '',
  'project': {},
  'tracker': {},
  'host_name': config.host_name || 'http://localhost/redmine/',
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
    request({ url: `${config.api_base_url}trackers${format}`, headers: headers, json: true })
    .then(function (data) {
      locals.json.trackers = data.trackers;
      console.log(new Date(), 'get /trackers: done.'); //// console.log
    })
    .catch(function(err){
      console.log(new Date(), 'get /trackers: failed.'); //// console.log
    }),
    // issue_statuses
    request({ url: `${config.api_base_url}issue_statuses${format}`, headers: headers, json: true })
    .then(function (data) {
      locals.json.issue_statuses = data.issue_statuses;
      console.log(new Date(), 'get /issue_statuses: done.'); //// console.log
    })
    .catch(function(err){
      console.log(new Date(), 'get /issue_statuses: failed.'); //// console.log
    }),
    // issue_priorities
    request({ url: `${config.api_base_url}enumerations/issue_priorities${format}`, headers: headers, json: true })
    .then(function (data) {
      locals.json.issue_priorities = data.issue_priorities;
      console.log(new Date(), 'get /enumerations/issue_priorities: done.'); //// console.log
    })
    .catch(function(err){
      console.log(new Date(), 'get /enumerations/issue_priorities: failed.'); //// console.log
    })
  ]).then(function(){
    next();
  });
});

// /issues/new
router.route('/new')
.get(function(req, res) {
  locals.json.issue = {};
  if(req.query.project_id) locals.json.defaults.project_id = req.query.project_id;
  if(req.query.tracker_id) locals.json.defaults.tracker_id = req.query.tracker_id;
  getLocals(locals.json.defaults.project_id, locals.json.defaults.tracker_id)
  .then(function(){
    res.render('new', locals)
  })
})
.post(function(req, res) {
  request({ method: 'POST', url: `${config.api_base_url}issues${format}`, resolveWithFullResponse: true, headers: headers, json: true, body: req.body })
  .then(function (response) {
    res.send(response);
  })
  .catch(function (err) {
    res.send(err);
  });
});

// /issues/:id
router.route('/:id(\\d+)')
.get(function(req, res) {
  let id = req.params.id;
  request({ url: `${config.api_base_url}issues/${id}${format}?include=attachments`, headers: headers, json: true })
  .then(function (data) {
    locals.json.issue = data.issue;
    locals.workbookname = template(config.workbookname, { issue: data.issue });
    getLocals(data.issue.project.id, data.issue.tracker.id)
    .then(function () {
      res.render('issue', locals);
    })
  })
})
.post(function(req, res) {
  let id = req.params.id;
  request({ method: 'PUT', url: `${config.api_base_url}issues/${id}${format}`, resolveWithFullResponse: true, headers: headers, json: true, body: req.body })
  .then(function (response) {
    res.send(response);
  })
  .catch(function (err) {
    res.send(err);
  });
});

//
function getLocals(project_id, tracker_id) {
  return new Promise(function(resolve, reject) {
    Promise.all([
      // issue_categories
      request({ url: `${config.api_base_url}projects/${project_id}/issue_categories${format}`, headers: headers, json: true })
      .then(function (data) {
        locals.json.issue_categories = data.issue_categories;
        console.log(new Date(), 'get /issue_categories: done.'); //// console.log
      })
      .catch(function(err){
        console.log(new Date(), 'get /issue_categories: failed.'); //// console.log
      }),
      // versions
      request({ url: `${config.api_base_url}projects/${project_id}/versions${format}`, headers: headers, json: true })
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
        xltx[project_id] && xltx[project_id][tracker_id] ? xltx[project_id][tracker_id] :
        xltx[project_id] ? xltx[project_id] :
        xltx
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
      request({ url: `${config.api_base_url}${param || key}${format}?offset=${offset}&limit=100`, headers: headers, json: true })
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