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

//Step 1: Log in.
function step1(){
  agent.post(apiurl)
    .type('form')
    .set('User-Agent', uaString)
    .send({
      action: 'login',
      lgusername: username,
      format: 'json'
    })
    .end(function(err,res){
      if(!err && res.login.result == 'NeedToken'){
        agent.post('http://'+wikihost+'/api.php')
          .type('form')
          .set('User-Agent', uaString)
          .send({
            action: 'login',
            lgusername: username,
            lgpassword: password,
            lgtoken: res.body.login.token,
            format: 'json'
          })
          .end(function(err,res){
            if (err) {
              console.error(err)
            } else if (res.login.result != 'Success'){
              console.error('Login was not Success but '+res.login.result)
            } else {
              getTransclusions(resumeFrom)
            }
          })
      } else if (err){
        console.error(err)
      } else {
        console.error('Initial response was not NeedToken but '+
          res.login.result)
      }
    })
}

//Step 2: Get list of pages transcluding target template.
function getTransclusions(eicontinue){
  agent.get(apiurl)
    .query({
      action: 'query',
      list: 'embeddedin',
      eititle: 'Template:Tv.com',
      eilimit: eilimit,
      })
  if(eicontinue){agent.query('eicontinue',eicontinue)}
  agent.end(handleTransclusions)
}

function handleTransculsions(err,res){
  
}
step1()