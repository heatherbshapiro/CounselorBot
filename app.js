var restify = require('restify');
var builder = require('botbuilder');
var prompts = require('./prompts');

/** Use bot LUIS model for the root dialog. */

var server = restify.createServer();
server.use(restify.CORS());

server.listen(process.env.port || process.env.PORT|| 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 
});



var model = process.env.model;
var recognizer = new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/42d14854-ba6a-43be-9305-bda5458ec2bc?subscription-key=a7f7ce6bdcc74881a44bd9fcee70ea56');
var intents = new builder.IntentDialog({recognizers:[recognizer]});
var connector = new builder.ChatConnector({ MicrosoftAppId: process.env.MicrosoftAppId, MicrosoftAppPassword: process.env.MicrosoftAppPassword});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());
// var bot = new builder.BotConnectorBot({ appId: process.env.appId, appSecret: process.env.appSecret });

// bot.dialog('/', intents);
bot.recognizer(new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/42d14854-ba6a-43be-9305-bda5458ec2bc?subscription-key=a7f7ce6bdcc74881a44bd9fcee70ea56'));

var companyData = require('./companyData.json');



bot.dialog('helpDialog', function (session) {
    // Send help message and end dialog.
    session.endDialog(prompts.helpMessage);
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
        if(result.length>2){
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

// intents.matches('Brief', [askService, answerQuestion('description', prompts.answerDescription)]);
// intents.matches('moreInfo', [askService, answerQuestion('moreInfo',prompts.answerMoreInfo)]);
// // /** Answer help related questions like "what can I say?" */
// intents.matches(/^Help/i, builder.DialogAction.send(prompts.helpMessage));

// // /** Answer acquisition related questions like "how many companies has microsoft bought?" */
// intents.matches('Type', [askService, answerQuestion('type', prompts.answerType)]);

// // /** Answer IPO date related questions like "when did microsoft go public?" */
// intents.matches('Function', [askService, answerQuestion('function', prompts.answerFunction)]);

// // /** Answer description related questions like "tell me about microsoft" */
// // intents.on('Description', [askService, answerQuestion('description', prompts.answerDescription)]);

// // /** Answer headquarters related questions like "where is microsoft located?" */
// intents.matches('Location', [askService, answerQuestion('location', prompts.answerLocation)]);

// /** Answer website related questions like "how can I contact microsoft?" */
// // intents.on('Website', [askService, answerQuestion('website', prompts.answerWebsite)]);
// intents.matches('Website',[askService, answerQuestion('website', prompts.answerWebsite)]);


/** 
 * This function the first step in the waterfall for intent handlers. It will use the service mentioned
 * in the users question if specified and valid. Otherwise it will use the last service a user asked 
 * about. If it the service is missing it will prompt the user to pick one. 
 */
// function askService(session, args, next) {
//     // First check to see if we either got a service from LUIS or have a an existing service
//     // that we can multi-turn over.
//     var service;
//     var entity = builder.EntityRecognizer.findEntity(args.entities, 'CompanyName');
//     if (entity) {
//         // The user specified a service so lets look it up to make sure its valid.
//         // * This calls the underlying function Prompts.choice() uses to match a users response
//         //   to a list of choices. When you pass it an object it will use the field names as the
//         //   list of choices to match against. 
//         service = builder.EntityRecognizer.findBestMatch(data, entity.entity);
//     } else if (session.dialogData.service) {
//         // Just multi-turn over the existing service
//         service = session.dialogData.CompanyName;
//     }
   
//     // Prompt the user to pick a service if they didn't specify a valid one.
//     if (!service) {
//         // Lets see if the user just asked for a service we don't know about.
//         var txt = entity ? session.gettext(prompts.serviceUnknown, { service: entity.entity }) : prompts.serviceUnknown;

//         // Prompt the user to pick a service from the list. They can also ask to cancel the operation.
//         builder.Prompts.choice(session, txt, data);
//     } else {
//         // Great! pass the service to the next step in the waterfall which will answer the question.
//         // * This will match the format of the response returned from Prompts.choice().
//         next({ response: service })
//     }
// }

// // intents.onDefault([
// //     function (session, args, next) {
// //         if (!session.userData.name) {
// //             session.beginDialog('/profile');
// //         } else {
// //             next();
// //         }
// //     },
// //     function (session, results) {
// //         session.send('Hello %s!', session.userData.name);
// //     }
// // ]);

// // bot.dialog('/profile', [
// //     function (session) {
// //         builder.Prompts.text(session, 'Hi! What is your name?');
// //     },
// //     function (session, results) {
// //         session.userData.name = results.response;
// //         session.endDialog();
// //     }
// // ]);


// /**
//  * This function generates a generic answer step for an intent handlers waterfall. The service to answer
//  * a question about will be passed into the step and the specified field from the data will be returned to 
//  * the user using the specified answer template. 
//  */
// function answerQuestion(field, answerTemplate) {
//     return function (session, results) {
//         // Check to see if we have a service. The user can cancel picking a service so IPromptResult.response
//         // can be null. 
//         if (results.response) {
//             // Save service for multi-turn case and compose answer            
//             var service = session.dialogData.service = results.response;
//             var answer = { service: service.entity, value: data[service.entity][field] };
//             session.send(answerTemplate, answer);
//         } else {
//             session.send(prompts.cancel);
//         }
//     };
// }


/** 
 * Sample data 
 */
// var data = {
//   'Planned Parenthood': {
//       type: 'Family Care Centers',
//       function: 'sex education',
//       description: 'Planned Parenthood Federation of America (PPFA), or Planned Parenthood, is a nonprofit organization that provides reproductive health services in the United States and internationally.',
//       moreInfo:'A member association of the International Planned Parenthood Federation (IPPF), PPFA has its roots in Brooklyn, New York, where Margaret Sanger opened the first birth control clinic in the U.S. in 1916. In 1921, Sanger founded the American Birth Control League, which changed its name to Planned Parenthood in 1942. Planned Parenthood is made up of 58 affiliates, which operate more than 650 health clinics in the United States, and it also partners with organizations in 12 countries globally.  The organization directly provides a variety of reproductive health services and sexual education, contributes to research in reproductive technology, and does advocacy work aimed at protecting and expanding reproductive rights',
//       location: '650+ clinic locations, see website for more information',
//       website: 'https://www.plannedparenthood.org'
//   },
//     'Alcoholics Anonymous': {
//       type: 'Substance Abuse Center',
//       function: 'drug rehabilitation, substance abuse, and codepency support',
//       description: 'Alcoholics Anonymous (AA) is an international mutual aid fellowship founded in 1935 by Bill Wilson and Dr. Bob Smith in Akron, Ohio. AAs stated "primary purpose" is to help alcoholics "stay sober and help other alcoholics achieve sobriety"',
//       moreInfo:'AAs stated "primary purpose" is to help alcoholics "stay sober and help other alcoholics achieve sobriety".[2][3][4] With other early members Bill Wilson and Bob Smith developed AAs Twelve Step program of spiritual and character development. AAs initial Twelve Traditions were introduced in 1946 to help the fellowship be stable and unified while disengaged from "outside issues" and influences. The Traditions recommend that members and groups remain anonymous in public media, altruistically helping other alcoholics and avoiding official affiliations with other organization. The Traditions also recommend that those representing AA avoid dogma and coercive hierarchies. Subsequent fellowships such as Narcotics Anonymous have adopted and adapted the Twelve Steps and the Twelve Traditions to their respective primary purposes',
//       location: 'Locations can be found in almost every city.  For local listings try an internet search engine like http://bing.com',
//       website: 'http://www.aa.org/'
//   },
//     'Narcotics Anonymous': {
//       type: 'Substance Abuse Center',
//       function: 'drug rehabilitation, substance abuse, and codepency support',
//       description: 'Narcotics Anonymous (NA) describes itself as a "nonprofit fellowship or society of men and women for whom drugs had become a major problem".',
//       moreInfo: 'Narcotics Anonymous uses a traditional 12-step model that has been expanded and developed for people with varied substance abuse issues and is the second-largest 12-step organization.',
//       location: 'As of May 2014 there were more than 63,000 NA meetings in 132 countries.  For local listings try an internet search engine like http://bing.com',
//       website: 'https://www.na.org/'
//   },
//   'National Center for children and families': {
//       type: 'Local Child & Family Services',
//       function: 'Private Domestic Foster Care and Adoption Agencies',
//       description: 'Agencies included on this list have a verified child-placing license in the State or territory in which they are practicing at the time of inclusion in the National Foster Care & Adoption Directory.',
//       location: '220 I Street NE, Ste 120, Washington, District of Columbia 20002',
//       website: 'http://www.nccf-cares.org/'
//   },
//    'Progressive Life Center': {
//       type: 'Local Child & Family Services',
//       function: 'Kinship,Foster Care and Adoption Support Groups, Private Domestic Foster Care and Adoption Agencies, Private Intercountry Adoption Agencies',
//       description: 'Foster families allow PLC to provide the support and structure that a child needs at this time in a more loving and nurturing environment than an institution.',
//       location: '1933 Montana Ave., NE, Washington, District of Columbia 20002',
//       website: 'http://www.nccf-cares.org/'
//   },
//    'Lutheran Social Services': {
//       type: 'Local Child & Family Services',
//       function: 'Private Domestic Foster Care and Adoption Agencies, Private Intercountry Adoption Agencies',
//       description: 'Lutheran Social Services of the National Capital Area (LSS/NCA) has devoted nearly a century to walking with those in need throughout the Washington D.C. Metro Area.',
//       location: '4406 Georgia Avenue NW, Washington, District of Columbia 20011-7124',
//       website: 'http://lssnca.org/'
//   }

// };

// Setup Restify Server
// var server = restify.createServer();
// server.post('/api/messages', connector.listen());
// server.listen(process.env.port || process.env.PORT || 3978, function () {
//    console.log('%s listening to %s', server.name, server.url); 
// });