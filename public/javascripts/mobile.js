var socket = io.connectWithSession(window.location.protocol + '//' + window.location.host);

socket.on('session.regenerate', function(data) {
	//window.location.reload();
});

socket.on('game.invalid', function(){ alert('game is not currently running') });

socket.on('question', function(data) {
	  // Populate answers
		$('div.answers').empty();
		for (var index in data.answers) {
			$('div.answers').append('<input type="radio" name="answer" id="answer-' + index + '" value="' + index + '" />'
															+ '<label for="answer-' + index + '">' + data.answers[index] + '</label>');
		}
		
		$('div.answers input[type="radio"]').change(function(e){
			socket.emit('user.answered', { answer: $(this).val() });
		});
		
		$.mobile.changePage($('#page-game'), { reloadPage: true });
});

$(function(){	
  $('#entry').submit(function(e){
  	e.preventDefault();

	  var data = {};
	  $(e.target).find('input').each(function() {
			if (this.name) {
	      data[this.name] = $(this).val();
		    $.cookie('user.' + this.name, $(this).val());
	    }
	  });

	  socket.emit('user.connect', data);
  });


  $('#entry').find('input').each(function() {
	  if (this.name) {
		  this.value = $.cookie('user.' + this.name);
	  }
	});
});