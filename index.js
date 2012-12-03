var agent = require("superagent").agent()

//Step 0: Configure.
var uaString = 'Metapoint-Wikibot/0.1'
  + ' (http://github.com/stuartpb/metapoint-wikibot; stuart@testtrack4.com)'
var wikihost = 'en.wikipedia.org'
var apiurl = 'http://'+wikihost+'/api.php'
var username = process.argv[2]
var password = process.argv[3]
var resumeFrom = process.argv[4]
var eilimit = 500

function wpApiPost(params,callback){
  var req = agent.post(apiurl)
  req.type('form')
    .set('User-Agent', uaString)
    .send('format','json')
    .send('maxlag','5')
    .send(params)
    .end(function(err,res){
      if(err){
        console.error(err)
      //TODO: handle maxlag
      } else {
        callback(res)
      }
    })
}

function wpApiGet(params,callback){
  var req = agent.get(apiurl)
  req.set('User-Agent', uaString)
    .query('format','json')
    .query('maxlag','5')
    .query(params)
    .end(function(err,res){
      if(err){
        console.error(err)
      //TODO: handle maxlag
      } else {
        callback(res)
      }
    })
}

//Step 1: Log in.
function step1(){
    wpApiPost({
      action: 'login',
      lgusername: username,
      format: 'json'
    },function(res){
      if(res.login.result != 'NeedToken'){
        console.error('Initial response was not NeedToken but '+
          res.login.result)
      } else {
        wpApiPost({
            action: 'login',
            lgusername: username,
            lgpassword: password,
            lgtoken: res.body.login.token,
          },function(res){
            if (res.login.result != 'Success'){
              console.error('Login was not Success but '+res.login.result)
            } else {
              getTransclusions(resumeFrom)
            }
          })
      }
    })
}

//Step 2: Get list of pages transcluding target template.
function getTransclusions(eicontinue){
  var params = {
    action: 'query',
    list: 'embeddedin',
    eititle: 'Template:Tv.com',
    eilimit: eilimit
  }
  if(eicontinue){params.eicontinue = eicontinue}
  wpApiGet(params,handleTransclusions)
}

function handleTransclusions(res){
  
}

step1()