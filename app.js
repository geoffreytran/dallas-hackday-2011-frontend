var gameLocation = 'http://hackday.geoffreytran.com:3000';
var questionsURL = 'http://hackday.geoffreytran.com/index.php'
var questionSeconds = 30;
var resultsSeconds = 10;

/**
 * Module dependencies.
 */

var express     = require('express');
var jqtpl       = require('jqtpl');
var io          = require('socket.io');
var sio         = require('socket.io-sessions');
var sys         = require('sys');
var rest        = require('restler');

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
  app.use(express.cookieParser());
  app.use(express.session({ secret: "AMCTrivia", store: sessionStore }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes
app.get('/', function(req, res){
  res.render('index.mobile.html', {
		layout: 'layout.mobile.html',
		timestamp: (new Date()).getTime()
	});
});

app.get('/display', function(req, res){
  res.render('index', {
    title: 'Express',
		timestamp: (new Date()).getTime(),
		gameLocation: gameLocation
  });
});



// Make Socket.IO session aware
var socket = sio.enable({
  socket:      io.listen(app),
  store:       sessionStore,
  parser:       express.cookieParser(),
  per_message: false
});

// Listen
app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);


var users = [];

var questions = [
/*
	{ 
		question: 'Who is the best agency in the world?',
		answers: [ 'JWT', 'IMC2', 'RAPP', 'Slingshot' ],
		correctAnswer: 2,
		users: []
	},
	
	{
		question: 'Who is more awesome?',
		answers: [ 'Geoffrey Tran', 'Jake Smith', 'Sean Scogin', 'Ben Gatzke' ],
		correctAnswer: 0,
		users: []
	},
	
	{
		question: 'Why is the sky blue?',
		answers: ['Because I like it that way', 'Atmospheric refractoring of light', 'Magic', 'Because the viking said so' ],
		correctAnswer: 3,
		users: []
	},
	
	{
		question: 'Who wrote Hamlet?',
		answers: [ 'Geoffrey Tran', 'Shakespeare', 'Jake Smith', 'The Viking' ],
		correctAnswer: 1,
		users: []
	},
	
	{
		question: 'Which one is the intern?',
		answers: [ 'Blake', 'Sam', 'Jake', 'The Viking' ],
		correctAnswer: 1,
		users: []
	},
	
	{
		question: 'Which is the smallest ocean?',
		answers: [ 'Atlantic', 'Indian', 'Pacific', 'Artic' ],
		correctAnswer: 3,
		users: []
	},
	
	{
		question: 'Who was iced?',
		answers: [ 'Jake Smith', 'Sean Scogin', 'The Viking', 'Ben Gatzke' ],
		correctAnswer: 1,
		users: []
	},
*/
];

var currentQuestion;
var currentQuestionTimeLeft = questionSeconds;
var displaying = 0;

if (questions.length <= 0) {
    // Get Initial Question
	rest.get(questionsURL + '/question').on('complete', function(data) {
        questions.push(JSON.parse(data));
    });
}

socket.on('sconnection', function (client, session) {
	client.on('display', function (data) {
		if (currentQuestion == null) {
			currentQuestion = 0;
		}
		questions[currentQuestion].users = [];
		console.log(questions[currentQuestion]);
		client.emit('question', questions[currentQuestion]);
		
		var updateTime = function(){	
		  console.log(questions);
		  console.log(users);					
			if (currentQuestionTimeLeft <= 0) {
				if (currentQuestionTimeLeft <= -resultsSeconds && questions[currentQuestion + 1]) {
					questions[currentQuestion + 1].users = [];
					currentQuestion++;
					currentQuestionTimeLeft = questionSeconds;
					
					client.emit('question', questions[currentQuestion]);
					client.broadcast.emit('question', questions[currentQuestion]);
				} else if (currentQuestionTimeLeft <= -resultsSeconds) {
				    // Get Next Question
        			 rest.get(questionsURL + '/question').on('complete', function(data) {
                        sys.puts('NEW REQUEST: ' + data);
                        questions.push(JSON.parse(data));
                     });
				} else {
					// Calculate scores
					for (var index in questions[currentQuestion].users) {
						for (var i in users) {
							if (users[i].name.replace(/ /g,'').toLowerCase() == questions[currentQuestion].users[index].user.name.replace(/ /g,'').toLowerCase()) {
								console.log("Correct: " + questions[currentQuestion].correctAnswer + " | Answered: " + questions[currentQuestion].users[index].answer);
								if (questions[currentQuestion].users[index].scored) {
									continue;
								}

								if (questions[currentQuestion].users[index].answer == questions[currentQuestion].correctAnswer) {
    								users[i].score++;
								} else {
    								if (users[i].score) {
        								users[i].score--;
    								}
								}

								
								questions[currentQuestion].users[index].scored = true;
							}
						}
					}
										
					client.emit('question.answered', questions[currentQuestion]);
					client.broadcast.emit('question.answered', questions[currentQuestion]);
				}
			}
			
			sys.puts('Current Number of Questions: ' + questions.length);
			sys.puts('Current Question Index: ' + currentQuestion);
			users.sort(function(a, b) {
				return b.score - a.score;
			});
			
			client.emit('leaderboard', users);
			client.broadcast.emit('leaderboard', users);

			client.emit('question.time-left', { time: currentQuestionTimeLeft });
			currentQuestionTimeLeft--;			
		};
		
		if (displaying++ <= 0) {
		  var interval = setInterval(updateTime, 1000);
	  }
	
		client.on('disconnect',function(){
			if (--displaying <= 0) {
			  clearInterval(interval);
		  }
			console.log('Display has disconnected');
		});
		
		client.emit('leaders', {});
	});
	
	client.on('user.connect', function(data) {		
		session.user = data;
		session.user.score = 0;
		
		var existingUser = false;
		for (var i in users) {
			if (users[i].name.replace(/ /g,'').toLowerCase() == data.name.replace(/ /g,'').toLowerCase()) {
				existingUser = true;
				break;
			}
	  }
	
	  if (!existingUser) {
		  users.push(session.user);
	  }

		if (!questions[currentQuestion]) {
			client.emit('game.invalid');
			return;
		}
		
		client.emit('question', questions[currentQuestion]);
		client.broadcast.emit('user.connected', data);
	});
	
	client.on('user.answered', function(data) {		
 		var existingUser = false;
		for (var i in questions[currentQuestion].users) {
			if (users[i].name.replace(/ /g,'').toLowerCase() == session.user.name.replace(/ /g,'').toLowerCase()) {
				existingUser = true;
				questions[currentQuestion].users[i].answer = data.answer;
				break;
			}
	  }
	
	  if (!existingUser) {
		  client.broadcast.emit('display.user-answered', session.user);
		  console.log(questions[currentQuestion]);
		  console.log(questions);
			questions[currentQuestion].users.push({ user: session.user, answer: data.answer });
	  }
	});	
});

socket.on('sinvalid', function(client){
  // Session invalid or not found in the store.
  // Send the client some instructions to refresh.
	client.emit('session.regenerate');
});

