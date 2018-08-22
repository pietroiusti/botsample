
var ssml = require('./ssml');
var restify = require('restify');
var builder = require('botbuilder');

// require('dotenv').config()

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// const speechOptions = {
//     speechRecognizer: new CognitiveServices.SpeechRecognizer({ subscriptionKey: 'YOUR_COGNITIVE_SPEECH_API_KEY' }),
//     speechSynthesizer: new CognitiveServices.SpeechSynthesizer({
//       gender: CognitiveServices.SynthesisGender.Female,
//       subscriptionKey: 'YOUR_COGNITIVE_SPEECH_API_KEY',
//       voiceName: 'Microsoft Server Speech Text to Speech Voice (en-US, JessaRUS)'
//     })
//   };
// Listen for messages from users 
server.post('/api/messages', connector.listen());


var inMemoryStorage = new builder.MemoryBotStorage();

// var bot = new builder.UniversalBot(connector, function (session, args) {
//     session.send('You reached the default message handler. You said \'%s\'.', session.message.text);
// });

// // Main menu
var menuItems = {
    "Order dinner": {
        item: "orderDinner"
    },
    "Dinner reservation": {
        item: "dinnerReservation"
    },
    "Schedule shuttle": {
        item: "scheduleShuttle"
    },
    "Request wake-up call": {
        item: "wakeupCall"
    },
}

// This is a dinner reservation bot that uses multiple dialogs to prompt users for input.
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send("Welcome to the dinner reservation.");
        session.beginDialog('askForDateTime');
    },
    function (session, results) {
        session.dialogData.reservationDate = builder.EntityRecognizer.resolveTime([results.response]);
        session.beginDialog('askForPartySize');
    },
    function (session, results) {
        session.dialogData.partySize = results.response;
        session.beginDialog('askForReserverName');
    },
    function (session, results) {
        session.dialogData.reservationName = results.response;

        // Process request and display reservation details
        session.send(`Reservation confirmed. Reservation details: <br/>Date/Time: ${session.dialogData.reservationDate} <br/>Party size: ${session.dialogData.partySize} <br/>Reservation name: ${session.dialogData.reservationName}`);
        session.endDialog();
    }
])

    .beginDialogAction('showCartAction', 'showDinnerCart', {
        matches: /^show cart$/i
    })
    .set('storage', inMemoryStorage); // Register in-memory storage 

bot.dialog('showDinnerCart', function (session) {
    for (var i = 1; i < session.conversationData.orders.length; i++) {
        session.send(`You dialogData: ${session.dialogData}.`);
    }
    session.endDialog(`Your reservationDate: $${session.reservationDate}`);
});

// Dialog to ask for a date and time
bot.dialog('askForDateTime', [
    function (session) {
        builder.Prompts.time(session, "Please provide a reservation date and time (e.g.: June 6th at 5pm)");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]).reloadAction('startOver', 'Ok, starting over.', {
    matches: /^start over$/i
})
    .cancelAction('cancelAction', 'Ok, cancel order.', {
        matches: /^nevermind$|^cancel$|^cancel.*order/i
    });

// Dialog to ask for number of people in the party
bot.dialog('askForPartySize', [
    function (session) {
        builder.Prompts.text(session, "How many people are in your party?");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
])

// Dialog to ask for the reservation name.
bot.dialog('askForReserverName', [
    function (session) {
        builder.Prompts.text(session, "Who's name will this reservation be under?");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
])
    .triggerAction({
        matches: /^Reserver$/i
    });


bot.dialog("mainMenu", [
    function (session) {
        builder.Prompts.choice(session, "Main Menu:", menuItems);
    },
    function (session, results) {
        if (results.response) {
            session.beginDialog(menuItems[results.response.entity].item);
        }
    }
])
    .triggerAction({
        // The user can request this at any time.
        // Once triggered, it clears the stack and prompts the main menu again.
        matches: /^cancel$/i,
        confirmPrompt: "This will cancel your request. Are you sure?"
    });


bot.customAction({
    matches: /remind|reminder/gi,
    onSelectAction: (session, args, next) => {
        // Set reminder...
        session.send("Reminder is set.");
    }
})

// //Luis
// // Make sure you add code to validate these fields
// var luisAppId = process.env.LuisAppId;
// var luisAPIKey = process.env.LuisAPIKey;
// var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

// // const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;
const LuisModelUrl = '	https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/bd8bbdef-e01b-4943-b2bd-b2544097a96a?subscription-key=5fe543e899d44e168691823cf0caa16c';

console.log(LuisModelUrl)
// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(recognizer);

// Add a dialog for each intent that the LUIS app recognizes.
// See https://docs.microsoft.com/en-us/bot-framework/nodejs/bot-builder-nodejs-recognize-intent-luis 
bot.dialog('GreetingDialog',
    (session) => {
        session.say('Hi there', 'Hi, what’s your name?', {
            inputHint: builder.InputHint.expectingInput
        });
        // var msg = new builder.Message(session)
        //     .speak('This is the text that will be spoken.')
        //     .inputHint(builder.InputHint.acceptingInput);
        // session.send(msg).endDialog();



        // session.send('You reached the Greeting intent. You said \'%s\'.', session.message.text);
        //     ssml.speak('what is your name')
        //     var msg = new builder.Message(session)
        //     .speak(speak(session, 'hello what is your name'))
        //     .inputHint(builder.InputHint.acceptingInput);
        // session.send(msg).endDialog();        

        // session.endDialog();
    }
).triggerAction({
    matches: 'Greeting'
})

bot.dialog('HelpDialog',
    (session) => {
        session.send('You reached the Help intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Help'
})



bot.dialog('CancelDialog',
    (session) => {
        session.send('You reached the Cancel intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Cancel'
})

function speak(session, prompt) {
    var localized = session.gettext(prompt);
    return ssml.speak(localized);
}