var socket = io.connectWithSession(window.location.protocol + '//' + window.location.host);

// Connect
//socket.send('sconnect');

setTimeout(function(){ socket.emit('display'); }, 1000);

socket.on('session.regenerate', function(data) {
	//window.location.reload();
});

socket.on('question', function(data) {
	// Populate question
	$('h2.question').empty().append(data.question);
	
	// Populate answers
	$('ul.answers').empty();
	for (var index in data.answers) {
		$('ul.answers').append('<li>' + data.answers[index] + '</li>');
	}
});

socket.on('question.answered', function(data) {
	$('.result').empty().append(data.result);
});

socket.on('question.time-left', function(data) {
	$('.time').empty().append(data.time);
});

socket.on('user.connected', function(data) {
	$('.messages').append('User connected: ' + data.name +'<br />');
});

socket.on('user.disconnected', function(data) {
	$('.messages').append('User disconnected: ' + data.name +'<br />');
});