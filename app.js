var restify = require('restify');
var builder = require('botbuilder');
var prompts = require('./prompts');

/** Use bot LUIS model for the root dialog. */

var builder = require('botbuilder');
var restify = require('restify');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.use(restify.CORS());
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    
    // appId: null,
    appId: 'b71b29d2-bcba-467c-a4f9-f1e2cbbe61e8',
    appPassword: 'KbCjMJkhzW0c5nSSaVC5ShT'
    // appPassword: null
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

var model = process.env.model;
var recognizer = new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/42d14854-ba6a-43be-9305-bda5458ec2bc?subscription-key=a7f7ce6bdcc74881a44bd9fcee70ea56');
var intents = new builder.IntentDialog({recognizers:[recognizer]});

bot.recognizer(new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/42d14854-ba6a-43be-9305-bda5458ec2bc?subscription-key=a7f7ce6bdcc74881a44bd9fcee70ea56'));

var companyData = require('./companyData.json');

bot.dialog('start',function (session) {
        session.send("Hi, I'm Amy!")
        setTimeout(function(){
            session.beginDialog('helpDialog');
        },1000);  
    }).triggerAction({matches:'Greetings'});

bot.dialog('end',function (session) {
        session.send("Hope you have a great day.")
        setTimeout(function(){
            session.endConversation("Chat with you soon :)")
        },1000);  
    }).triggerAction({matches:'Ending'});

var welcomeOptions = ["You got it!","Don't mention it :)","No worries :)","It was nothing!","No problem, I'm happy to help!", "Of course!", "That's what I'm here for!","I'm glad I could help", "You're welcome!"];
var rand;

bot.dialog('thanks',function(session,results){
    rand = welcomeOptions[Math.floor(Math.random() * welcomeOptions.length)],
    session.send(rand)
    session.send("Do you need help with anything else?")
    session.beginDialog('needMoreHelp');
}).triggerAction({matches: /^Thanks/i});
    
bot.dialog('needMoreHelp', new builder.IntentDialog()
    .matches(/^yes/i, [
            function (session) {
                session.send("Awesome!")
                session.beginDialog('helpDialog');
            }
    ])
    .matches(/^no/i, [
        function(session){
            session.beginDialog('end')
        }
    ]))

bot.dialog('learning', function(session){
    session.send("I'm sorry, I'm still learning. Please try asking a different way. :) ")
}).triggerAction({matches:'None'});

bot.dialog('helpDialog', function (session) {
    // Send help message and end dialog.
    if(session.privateConversationData.company){
        // session.endDialog(prompts.serviceUnknown,companyData);
        builder.Prompts.choice(session,prompts.serviceUnknown, companyData);
    }
    else{
        session.send(prompts.helpMessage.split(".")[0])
        session.send(prompts.helpMessage.split("topics.")[1].split("Once")[0])
        session.endDialog(prompts.helpMessage.split("topics.")[1].split("about?'")[1]);
    }
}).triggerAction({ matches: 'Help' });

bot.dialog('briefInfo',function(session,args){
    var entities = args.intent.entities;
    session.beginDialog('answerDialog',{
        company: builder.EntityRecognizer.findEntity(entities, 'CompanyName'),
        field: 'description',
        template: prompts.answerDescription
    });
}).triggerAction({matches: 'Brief'});

bot.dialog('moreInfo',function(session,args){
    var entities = args.intent.entities;
    session.beginDialog('answerDialog',{
        company: builder.EntityRecognizer.findEntity(entities, 'CompanyName'),
        field: 'moreInfo',
        template: prompts.answerMoreInfo
    });
}).triggerAction({matches: 'moreInfo'});

bot.dialog('function',function(session,args){
    var entities = args.intent.entities;
    session.beginDialog('answerDialog',{
        company: builder.EntityRecognizer.findEntity(entities, 'CompanyName'),
        field: 'function',
        template: prompts.answerFunction
    });
}).triggerAction({matches: 'Function'});

bot.dialog('type',function(session,args){
    var entities = args.intent.entities;
    session.beginDialog('answerDialog',{
        company: builder.EntityRecognizer.findEntity(entities, 'CompanyName'),
        field: 'type',
        template: prompts.answerType
    });
}).triggerAction({matches: 'Type'});

bot.dialog('Website',function(session,args){
    var entities = args.intent.entities;
    session.beginDialog('answerDialog',{
        company: builder.EntityRecognizer.findEntity(entities, 'CompanyName'),
        field: 'website',
        template: prompts.answerWebsite
    });
}).triggerAction({matches: 'Website'});

bot.dialog('Location',function(session,args){
    var entities = args.intent.entities;
    session.beginDialog('answerDialog',{
        company: builder.EntityRecognizer.findEntity(entities, 'CompanyName'),
        field: 'location',
        template: prompts.answerLocation
    });
}).triggerAction({matches: 'Location'});

bot.dialog('answerDialog',[
    function askService(session, args, next) {
    // First check to see if we either got a service from LUIS or have a an existing service
    // that we can multi-turn over.
        session.dialogData.args =args;
        var company, isValid;

        if(args.company){
            company = args.company.entity.toLowerCase();
            isValid = companyData.hasOwnProperty(company);
        }
        else if ( session.privateConversationData.company){
            company = session.privateConversationData.company;
            isValid = true;
        }

        if(!isValid){
            var txt = args.company ? session.gettext(prompts.serviceUnknown, { company: args.company }) : prompts.serviceMissing;
            builder.Prompts.choice(session,txt,companyData);
        }
        else{
            next({response:{entity: company}});
        }
    },

    function answerQuestion(session,results){
        var args = session.dialogData.args;
        var company = session.privateConversationData.company= results.response.entity;

        var answer = { company: company, value: companyData[company][args.field] };
        var result = answer.value.match( /[^\.!\?]+[\.!\?]+/g );
        if(result.length>3 && args.field == "moreInfo"){
            session.sendTyping();
            setTimeout(function()
            {
                session.send("I'm sorry this history might be a little long...");
            }, 1000);

            setTimeout(function(){
                session.send("But you asked for it =P");},2000);

            setTimeout(function(){
                session.endDialog(args.template,answer);
            },5000);
        }
        else{
            session.endDialog(args.template,answer);
        }
        
    }
]).cancelAction('cancelAnswer',"cancelMessage",{matches: /^cancel/i});
