var socket = io.connectWithSession(window.location.protocol + '//' + window.location.host);

// Connect
//socket.send('sconnect');

setTimeout(function(){ socket.emit('display'); }, 1000);

socket.on('session.regenerate', function(data) {
	window.location.href = window.location.href;
});

socket.on('question', function(data) {
	$.mobile.changePage($('#page-game'));
	
	// Populate question
	$('h2.question').empty().append(data.question);
	
	// Populate answers
	$('ul.answers').empty();
	for (var index in data.answers) {
		$('ul.answers').append('<li>' + data.answers[index] + '</li>');
	}
});

socket.on('question.answered', function(data) {
	$.mobile.changePage($('#page-question-result'));
	$('.result').empty();
	
	for (var index in data.users) {
	  $('.result').append(data.users[index].user.name + ' got it ' + ( parseInt(data.users[index].answer) == data.correctAnswer ? 'right' : 'wrong') + '<br />');
  }	
});

socket.on('leaderboard', function(data) {
	$('.scores').empty();
	
	for (var index in data) {
		$('.scores').append('<dl><dt>' + data[index].score + '</dt><dd>' + data[index].name + '</dd></dl>');
	}
});

socket.on('question.time-left', function(data) {
	$('.time').empty().append(data.time);
});

socket.on('user.connected', function(data) {
	$('.messages').append(data.name +' is now playing...<br />');
});

socket.on('user.disconnected', function(data) {
	$('.messages').append(data.name +' has left the game...<br />');
});

socket.on('display.user-answered', function(data) {
	$('.messages').append(data.name + ' picked an answer...' + '<br />')
});