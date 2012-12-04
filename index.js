var agent = require("superagent").agent();

//Step 0: Configure.
var uaString = 'Metapoint-Wikibot/0.1'
  + ' (http://github.com/stuartpb/metapoint-wikibot; stuart@testtrack4.com)';
var apiurl = 'http://en.wikipedia.org/w/api.php';
var username = process.argv[2];
var password = process.argv[3];
var resumeFrom = process.argv[4];
var eilimit = 500;
var maxlag = 5;
//Number of page contents to request in one query
var contentBatchSize = 25;
//Maximum number of pages to edit concurrently
var maxParallelEdits = 10;

//Helper functions
function wpApiCall(method,params,callback){
  var req;

  if (method=='get'){
    req = agent.get(apiurl);
    req.query('format','json')
      .query('maxlag',maxlag)
      .query(params);
  } else if (method=='post') {
    req = agent.post(apiurl);
  //Technically I don't have to use a form body for a POST,
  //but thousands-of-character-long query strings scare me.
    req.type('form')
      .send('format','json')
      .send('maxlag',maxlag)
      .send(params);
  } else {
    throw new Error('attempted API call with non-GET/POST method');
  }
  req.set('User-Agent', uaString)
    .end(function(err,res){
      if(err){
        console.error(err);
      } else if (!res.ok) {
        console.error('API call returned status ' + res.status);
      } else if (res.header['mediawiki-api-error']) {
        if(res.header['mediawiki-api-error'] == 'maxlag') {
          setTimeout(wpApiCall,
            res.header['retry-after'] * 1000,
            method,params,callback);
        } else {
          console.error('MediaWiki API returned error header '+
           res.header['mediawiki-api-error']);
        }
      } else {
        callback(res);
      }
    });
}

//Step 1: Log in.
function step1(){
    wpApiCall('post',{
      action: 'login',
      lgusername: username,
      format: 'json'
    },function(res){
      if(res.login.result != 'NeedToken'){
        console.error('Initial response was not NeedToken but '+
          res.login.result);
      } else {
        wpApiCall('post',{
            action: 'login',
            lgusername: username,
            lgpassword: password,
            lgtoken: res.body.login.token,
          },function(res){
            if (res.login.result != 'Success'){
              console.error('Login was not Success but '+res.login.result);
            } else {
              getEditToken();
            }
          });
      }
    });
}

//Step 1.5: Get edit token.
var editToken;
function getEditToken(){
  wpApiCall('get', {
    action: 'tokens',
    type: 'edit'
  }, function(res) {
    if (res.body.token) {
      editToken = res.body.token.edittoken;
      getTransclusions(resumeFrom);
    }
  });
}

//Step 2: Get list of pages transcluding target template.
function getTransclusions(eicontinue){
  var params = {
    action: 'query',
    list: 'embeddedin',
    eititle: 'Template:Tv.com',
    einamespace: 0, //let's not fix non-article usages, at least not right now
    eilimit: eilimit
  };
  if(eicontinue){params.eicontinue = eicontinue}
  wpApiCall('get',params,handleTransclusions);
}

function handleTransclusions(res){
  var pageList = res.body.query.embeddedin;
  var topPage = 0;
  function getContentBatch(){
    if(topPage < pageList.length) {
      var pageids = pageList.slice(topPage, topPage + contentBatchSize)
        .map(function(ei){return ei.pageid});
        getPageContents(pageids,getContentBatch);
    } else if (res.body['query-continue']) {
      getTransclusions(res.body['query-continue'].eicontinue);
    }
  }
}

var runningEdits = 0;
function getPageContents(ids,endCb){
  wpApiCall('get',{
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    pageids: ids.join('|')
  },function(res){
    
    //The index of the next page to update.
    var topPage = 0;
    
    //Spawn new edit (or request more contents.)
    function spawnNewEdit(){
      if (topPage < ids.length) {
        updatePage(res.body.pages[ids[topPage]],spawnNewEdit);
        ++topPage;
      } else {
        //All pages updated, call the end callback (request more contents)
        endCb();
      }
    }
    while(runningEdits < maxParallelEdits){
      spawnNewEdit();
    }
  });
}

function updatePage(page,endCb){
  
}

step1();