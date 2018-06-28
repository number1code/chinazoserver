var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

const PORT = process.env.PORT || 5000
var oldPort = 8080;

var numberOfPlayersGame = 3;
var currentTurn = 1;
var roundStarter = 1;
var playerNumberCounter = 1;
var dealerId;
var requestingPlayerId;
var allPlayersReady = false;
var haveBiddingPlayers = false;
var players = [];
var deck = [];

server.listen(PORT, function(){
	console.log("Server is now running...");
});

io.on('connection', function(socket){
	console.log("Player Connected");
	console.log("my socke id is: " + socket.id);
	socket.emit('initialize', { id: socket.id, "isDealer": checkIfDealer(), "myPlayerNumber": playerNumberCounter});
	socket.emit('getPlayers', players);
	socket.broadcast.emit('newPlayer', { id: socket.id, "playerNumber": playerNumberCounter});

	socket.on('playerFinishedTurn', function(){
		console.log("playerFinishedTurn");
	    if (haveBiddingPlayers){
	    	socket.to(getBidWinner()).emit('wonBid');
	    }
	    for (var i = 0; i < players.length; i++){
			players[i].bidForWellCard = false;
		}
	    haveBiddingPlayers = false;
	    socket.broadcast.emit('playerFinishedTheTurn');
	    if (currentTurn == numberOfPlayersGame){
	    	currentTurn = 1;
	    }else {
	    	currentTurn++;
	    }
	});

	socket.on('wonRound', function(){
		console.log("round was won by: " + socket.id);
		for (var i = 0; i < players.length; i++){
			players[i].bidForWellCard = false;
		}
	    haveBiddingPlayers = false;
	    if (roundStarter == numberOfPlayersGame){
	    	roundStarter = 1;
	    }else {
	    	roundStarter++;
	    }
	    socket.broadcast.emit('playerWonRound', {id: socket.id});
	});

	socket.on('playerScoreUpdate', function(data){
		console.log('got ' + socket.id + " score: " + data.score);
		socket.broadcast.emit('getScoreUpdate', {id: socket.id, "score": data.score});
	});

	socket.on('queryGameReady', function(data){
		console.log("is game ready queried");
		for (var i = 0; i < players.length; i++){
			if (players[i].id == socket.id){
				players[i].isReady = true;
			}
		}
		checkAllPlayersReady();
		if (allPlayersReady && checkGameIsReady()){
			io.emit('startGame', 'go for it');
		}
	});

	socket.on('handDealt', function(data){
		console.log("got hand info" + data);
		socket.to(data.id).emit('getHand', data);
	});

	socket.on('droppingHand', function(data){
		console.log("got dropped hand info" + data);
		data.id = socket.id;
		socket.broadcast.emit('playerDropped', data);
	});

	socket.on('cardPlacedInDroppedHand', function(data){
		console.log("got card placed in dropped hand");
		socket.broadcast.emit('playerPutCardInDroppedHand', data);
	});

	socket.on('startingWellCard', function(data){
		console.log("got starting well card " + data.card);
		socket.broadcast.emit('getStartingWellCard', data);
	});

	socket.on('tookWellCardOnTurn', function(){
		console.log("tookWellCardOnTurn");
		socket.broadcast.emit('wellCardTaken');
		for (var i = 0; i < players.length; i++){
			players[i].bidForWellCard = false;
		}
		haveBiddingPlayers = false;
	});

	socket.on('putCardInWell', function(data){
		console.log("player has put card in well" + data.card);
		if (haveBiddingPlayers){
	    	socket.to(getBidWinner()).emit('wonBid');
	    }
	    haveBiddingPlayers = false;
		socket.broadcast.emit('cardPutInWell', data);
	});

	socket.on('dealMeCard', function(){
		console.log('in dealMeCard, dealerId is: ' + dealerId); 
		socket.to(dealerId).emit('cardPlease', {'requestingPlayer': socket.id});
	});

	socket.on('dealingCard', function(data){
		console.log("dealing Card to: " + data.requestingPlayer);
		socket.to(data.requestingPlayer).emit('getCard', data);
	});

	socket.on('emittingBid', function(){
		console.log("got bid");
		for (var i = 0; i < players.length; i++){
			if (players[i].id == socket.id){
				players[i].bidForWellCard = true;
			}
		}
		haveBiddingPlayers = true;
	});

	socket.on('bidWinnerGotCard', function(){
		socket.broadcast.emit('wellCardTakenWonFromBid');
	});

	socket.on('disconnect', function(){
		console.log("Player Disconnected");
		socket.broadcast.emit('playerDisconnected', { id: socket.id });
		for (var i = 0; i < players.length; i++){
		    if (players[i].id == socket.id){
		        players.splice(i,1);
		    }
		}
		playerNumberCounter--;
		playerNumberCounter = Math.max(1, playerNumberCounter);
	});
	players.push(new player(socket.id));
	playerNumberCounter++;

});

function player(id){
    this.id = id;
    this.isReady = false;
    this.playerNumber = playerNumberCounter;
    // playerNumberCounter++;
    this.isDealer = checkIfDealer();
    this.bidForWellCard = false;
    //this.bidWinnerSoFar = false;
}

function getBidWinner(){
	console.log("fetching bid winner");
	var foundWinner = false;
	while (!foundWinner){
		for (var i = currentTurn - 1; i < players.length; i++){
			if (players[i].bidForWellCard == true){
				console.log("getBidWinner found " + players[i].id);
				return players[i].id;
				foundWinner = true;
				break;
			}
		}
		for (var i = 0; i < currentTurn - 1; i++){
			if (players[i].bidForWellCard == true){
				console.log("getBidWinner found " + players[i].id);
				return players[i].id;
				foundWinner = true;
				break;
			}
		}
	}
}

function checkIfDealer(){
	if (players.length == 0){
		return true;
	} else {
		return false;
	}
}

function checkGameIsReady(){
	dealerId = players[0].id;
	return players.length >= numberOfPlayersGame;
}

function checkAllPlayersReady(){
	var tempBool = true;
	for (var i = 0; i < players.length; i++){
		if (players[i].isReady == false){
			tempBool = false;
		}
	}
	allPlayersReady = tempBool;
}

function card(rank,suit){
    this.rank = rank;
    this.suit = suit;
}