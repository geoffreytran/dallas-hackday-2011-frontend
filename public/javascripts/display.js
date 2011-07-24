var socket = io.connectWithSession(window.location.protocol + '//' + window.location.host);

// Connect
//socket.send('sconnect');

setTimeout(function(){ socket.emit('display'); }, 1000);

socket.on('session.regenerate', function(data) {
	window.location.href = window.location.href;
});

socket.on('question', function(data) {
	$.mobile.changePage($('#page-game'), { transition: 'flip' });
	
	// Populate question
	$('h2.question').empty().append(data.question);
	
	// Populate answers
	$('ul.answers').empty();
	for (var index in data.answers) {
		$('ul.answers').append('<li>' + data.answers[index] + '</li>');
	}
});

socket.on('question.answered', function(data) {
	$.mobile.changePage($('#page-question-result'), { transition: 'flip' });
	$('.messages').empty().append('<li data-role="list-divider">Actions</li>').listview('refresh');
	$('.result').empty();
	
	// Populate question
	$('h2.question').empty().append(data.question);
	
	// Populate answers
	$('ul.answers').empty();
	for (var index in data.answers) {
		$('ul.answers').append('<li class="' + (data.correctAnswer == index ? 'correct' : '') + '">' + data.answers[index] + '</li>');
	}
	
	if (data.users.length <= 0) {
		$('.result').append('Join in and play the game...');
	} 
	for (var index in data.users) {
	  $('.result').append('<span class="name">' + data.users[index].user.name + '</span> got it ' + ( parseInt(data.users[index].answer) == data.correctAnswer ? '<span class="correct">right!</span> <b class="name">+1</b>' : '<span class="wrong">wrong...</span>') + '<br />');
  }	
});

socket.on('leaderboard', function(data) {
	$('.scores').empty();
	
	for (var index in data) {
		$('.scores').append('<dl><dt>' + data[index].score + '</dt><dd>' + data[index].name + '</dd></dl>');
	}
});

socket.on('question.time-left', function(data) {
	$('.time').empty().append(Math.abs(parseInt(data.time)));
});

socket.on('user.connected', function(data) {
	$('.messages').append('<li>' + data.name +' is now playing...</li>').listview('refresh');
});

socket.on('user.disconnected', function(data) {
	$('.messages').append('<li>' + data.name +' has left the game...</li>').listview('refresh');
});

socket.on('display.user-answered', function(data) {
	$('.messages').append('<li>' + data.name + ' picked an answer...</li>').listview('refresh');
});