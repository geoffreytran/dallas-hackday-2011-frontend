
/**
 * Module dependencies.
 */

var express     = require('express');
var jqtpl       = require("jqtpl");
var io          = require('socket.io');
var sio         = require('socket.io-sessions');


// Create the app
var app = module.exports = express.createServer();

// Session
var sessionStore = new express.session.MemoryStore; 
var cookieParser = express.cookieParser();

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set("view engine", "html");
  app.register(".html", jqtpl.express);

  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(cookieParser);
  app.use(express.session({ secret: "DallasHackDay2011", store: sessionStore }));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes
app.get('/', function(req, res){
  res.render('index', {
    title: 'Express',
		timestamp: (new Date()).getTime()
  });
});

app.get('/m', function(req, res){
  res.render('index.mobile.html', {
		layout: 'layout.mobile.html',
		timestamp: (new Date()).getTime()
	});
});


// Make Socket.IO session aware
var socket = sio.enable({
  socket:      io.listen(app),
  store:       sessionStore,
  parser:      cookieParser,
  per_message: false
});

// Listen
app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);


var users = [];

var questions = [
	{ 
		question: 'Who is the best agency in the world?',
		answers: ['RAPP', 'JWT', 'IMC2'],
		correctAnswer: 0
	},
	
	{
		question: 'Who is more awesome?',
		answers: ['Geoffrey Tran', 'Jake Smith', 'Sean Scogin'],
		correctAnswer: 0
	},
	
	{
		question: 'Why is the sky blue?',
		answers: ['Because I like it that way', 'Meh'],
		correctAnswer: 0
	}
];

var currentQuestion;
var currentQuestionTimeLeft = 10;

socket.on('sconnection', function (client, session) {
	client.on('display', function (data) {
		if (currentQuestion == null) {
			currentQuestion = 0;
		}
		
		client.emit('question', questions[currentQuestion]);
		
		var updateTime = function(){
			console.log(currentQuestion);
			
			if (currentQuestionTimeLeft <= 0) {
				if (questions[currentQuestion + 1]) {
					currentQuestion++;
					currentQuestionTimeLeft = 10;
				} else {
					currentQuestionTimeLeft = 10;
					currentQuestion = 0;
				}
				
				client.emit('question', questions[currentQuestion]);
				client.broadcast.emit('question', questions[currentQuestion]);
			}
			
			client.emit('question.time-left', { time: currentQuestionTimeLeft });
			currentQuestionTimeLeft--;
			
			setTimeout(updateTime, 1000);
		};
		
		setTimeout(updateTime, 1000);
		
		client.emit('leaders', {});
	});
	
	client.on('user.connect', function(data) {		
		users.push(data);
		session.user = data;
		console.log(questions[currentQuestion]);

		if (!questions[currentQuestion]) {
			client.emit('game.invalid');
			return;
		}
		
		client.emit('question', questions[currentQuestion]);
		client.broadcast.emit('user.connected', data);
	});
	
	client.on('user.answered', function(data) {
		client.broadcast.emit('display.user-answered', session.user);
		
		if (questions[currentQuestion].correctAnswer == data.answer) {
		}
	});	
});

socket.on('sinvalid', function(client){
  // Session invalid or not found in the store.
  // Send the client some instructions to refresh.
	client.emit('session.regenerate');
});

