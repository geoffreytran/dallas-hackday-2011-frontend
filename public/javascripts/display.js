var socket = io.connectWithSession(window.location.protocol + '//' + window.location.host);

// Connect
//socket.send('sconnect');

setTimeout(function(){ socket.emit('display'); }, 1000);

socket.on('session.regenerate', function(data) {
	window.location.href = window.location.href;
});

socket.on('question', function(data) {
  console.log('Question Create');
	$.mobile.changePage($('#page-game'), { transition: 'pop' });
	
	// Clear Leaderboard Icons
	$('.status li').removeClass('correct incorrect');
	
	// Populate question
	$('.question').empty().append(data.question).append('<div class="answer"></div>');
	
	// Populate answers
	/*
	$('ul.answers').empty();
	for (var index in data.answers) {
		$('ul.answers').append('<li>' + data.answers[index] + '</li>');
	}
	if (data.photo) {
	    $('.question-photo').html('<img src="' + data.photo + '" alt="" border="0">');
	} else {
	    $('.question-photo').html('');
	}
	*/
});

socket.on('question.answered', function(data) {
	$.mobile.changePage($('#page-question-result'), { transition: 'pop' });
	
	// Removed Answered from leaderboard
	$('.status .answered').removeClass('answered');
	
	$('.messages').empty().append('<li data-role="list-divider">Actions</li>').listview('refresh');
	$('.result').empty();
	
	// Populate question
	$('.question').empty().append(data.question).append('<div class="answer"></div>');
	
	// Populate answers
	$('.answer').empty();
	for (var index in data.answers) {
	  if (data.correctAnswer == index ? 'correct' : '') {
	    $('.answer').append('Answer: <span>' + data.answers[index] + '</span>');
	  }
	}
	
	if (data.users.length <= 0) {
		$('.result').append('Join in and play the game...');
	} 
	
	// Mark correct/incorrect on leaderboard
	for (var index in data.users) {
    	if ( parseInt(data.users[index].answer) == data.correctAnswer ) {
        	$('.status li[data-id="' + data.users[index].user.name + '"]').removeClass('answered').addClass('correct');
    	} else {
            $('.status li[data-id="' + data.users[index].user.name + '"]').removeClass('answered').addClass('incorrect');
    	}
    }	
});

socket.on('leaderboard', function(data) {
	//$('.status ul').empty();
	
	for (var index in data) {
    	console.log(data[index]);
		$('.status li[data-id="' + data[index].name + '"]').attr('data-score', data[index].score);
	}
});

socket.on('question.time-left', function(data) {
	$('.countdown').empty().append(Math.abs(parseInt(data.time)));
});

socket.on('user.connected', function(data) {
	$('.status ul').append('<li data-id="' + data.name + '" data-score="' + data.score + '">' + data.name + '</li>');
});

socket.on('user.disconnected', function(data) {
	$('.status li[data-id="' + data.name + '"]').remove();
});

socket.on('display.user-answered', function(data) {
	$('.status li[data-id="' + data.name + '"]').addClass('answered');
});