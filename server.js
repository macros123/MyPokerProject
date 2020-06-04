
const {curDeck, getOneCard} =  require('./poker')
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3011;

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});


// Chatroom

const smallBlind = 20
const bigBlind = 40

var numUsers = 0;
const users = []
let players = []
let table = {}
let dealer = 0
let myDeck = []

let bigestBet = bigBlind
let whosTurn = ''
let whoWillCheck = ''
io.on('connection', (socket) => {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
    
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (username) => {
    if (addedUser) return;
    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      user: {
        id: socket.id,
        username: socket.username,
        money: socket.money
      },
      numUsers: numUsers,
      canGameStart: numUsers > 1
    })
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers,
      canGameStart: numUsers > 1
    });
    
    
    addUser(socket.id, socket.username, socket)
  });

  socket.on('start game', () => {
    if (numUsers < 2) return;
    myDeck = curDeck

    players = users.slice()
    initNewRound()
    
    //logging
    socket.emit('new message', {
      username: 'System',
      message: 'Game is starting. Players:' + users.map(e => e.name)
    });
    socket.broadcast.emit('new message', {
      username: 'System',
      message: 'Game is starting. Players:' + users.map(e => e.name)
    });

    //initialise players
      socket.emit('init players', {
        players: players.map((e, i) => {return {id: e.id, name: e.name, money: e.money}}),
        canGameStart: false,
        whosTurn: players[getIndex(table.players.length, dealer+3)].id,
        dealer: players[dealer].id,
        table: table,
        smallBlind: smallBlind
      })
      socket.broadcast.emit('init players', {
        players: players.map((e, i) => {return {id: e.id, name: e.name, money: e.money}}),
        canGameStart: false,
        whosTurn: players[getIndex(table.players.length, dealer+3)].id,
        dealer: players[dealer].id,
        table: table,
        smallBlind: smallBlind
      })

    drowingCards()
    
    

    socket.emit('blinds', {
      players: players.map((e, i) => {return {id: e.id, name: e.name, money: e.money, isMyTurn: getIndex(players.length, dealer+3) === i }}),
      table: table
    })
    socket.broadcast.emit('blinds', {
      players: players.map((e, i) => {return {id: e.id, name: e.name, money: e.money, isMyTurn: getIndex(players.length, dealer+3) === i }}),
      table: table
    })
    whoWillCheck = players[getIndex(table.players.length, dealer+2)].id
  });

const socketEmitting = (name, obj) => {
  players.forEach(e => {
    e.socket.emit(name, obj)
  })
}

  socket.on('press the button', payload => {
    switch (payload.button) {
      case 'Fold':            ////////
        //logging
        socketEmitting('new message', {username: socket.username, message: 'folded'})

        if(table.players.filter(e => e.isPlaying).length < 3) {  //round is over       
          //logging  
          socketEmitting('new message', {username: table.players.find(e => e.id !== payload.id).name, message: 'WIN'})

          //money goes to winner
          let tmp = 0
          table.players.forEach(e => {tmp += e.money})
          players.find(e => table.players.find(e => e.isPlaying).id === e.id).money += tmp

          //prepare for new round
          dealer = getIndex(players.length, dealer+1)
          initNewRound()
          drowingCards()
          //update player info
          socketEmitting('reload', {
            players: players.map((e, i) => {return {id: e.id, name: e.name, money: e.money}}),
            whosTurn: players[getIndex(table.players.length, dealer+3)].id,
            dealer: players[dealer].id,
            table: table,
            smallBlind: smallBlind
          })
          
        
        } else {  /////
          table.players.find(e => e.id === payload.id).isPlaying = false
          socketEmitting('reload', {
            players: players.map((e, i) => {return {id: e.id, name: e.name, money: e.money}}),
            whosTurn: idNextTurn(payload.id),
            dealer: players[dealer].id,
            table: table,
            smallBlind: smallBlind
          })
        }
        table.players.find(e => e.id === payload.id).isPlaying = false
        break;
      case 'Call':             ////////////
        socketEmitting('new message', {username: socket.username, message: 'called'})
        players.find(e => e.id === payload.id).money -= (bigestBet - table.players.find(e => e.id === payload.id).money)
        table.players.find(e => e.id === payload.id).money = bigestBet
        socketEmitting('reload', {
          players: players.map((e, i) => {return {id: e.id, name: e.name, money: e.money}}),
          whosTurn: idNextTurn(payload.id),
          dealer: players[dealer].id,
          table: table,
          smallBlind: smallBlind
        })
        break;
      case 'Check' :          //////////
        socketEmitting('new message', {username: socket.username, message: 'checked'})
        if(whoWillCheck === payload.id) {
          table.cards.push(getOneCard(myDeck))
          table.cards.push(getOneCard(myDeck))
          table.cards.push(getOneCard(myDeck))
          socketEmitting('reload', {
            players: players.map((e, i) => {return {id: e.id, name: e.name, money: e.money}}),
            whosTurn: idNextTurn(payload.id),
            dealer: players[dealer].id,
            table: table,
            smallBlind: smallBlind
          })
        } else {
          console.log('checked')
        }
        break;
      case 'Raise':           ////////
        console.log('raise to'+ payload.raise)
        break;
      default:
        console.log('Unnamed button')
    }
    
  }) 

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });

      removeUser(socket.id)
    }
  });
});

const addUser = (id, name, socket) => {
  users.push({
    id: id,
    name: name,
    money: 500,
    socket: socket
  })
}
const removeUser = id => {
  users.splice(users.findIndex(e => e.id === id), 1)
}

const getIndex = (length, num) => {
  return num >= length ? num % length : num
}

const initNewRound = () => {
  table.cards = []
  table.players = players.map(e => {return {id: e.id, name: e.name, money: 0, dealer: false, isMyTurn: false, isPlaying: true}})

  table.players[getIndex(table.players.length, dealer)].dealer = true
  table.players[getIndex(table.players.length, dealer+1)].money = smallBlind
  table.players[getIndex(table.players.length, dealer+2)].money = bigBlind
  players[getIndex(table.players.length, dealer+1)].money -= smallBlind
  players[getIndex(table.players.length, dealer+2)].money -= bigBlind
  table.players[getIndex(table.players.length, dealer+3)].isMyTurn = true


  whosTurn = players[getIndex(table.players.length, dealer+3)].id
  whoWillCheck = players[getIndex(table.players.length, dealer+2)].id
}

const drowingCards = () => {
  players.forEach((e, i) => {      
    e.socket.emit('drow cards', {
      drowCards: [getOneCard(myDeck), getOneCard(myDeck)],
      canICheck: bigestBet - table.players[i].money <= 0,
      howMuchToCall: bigestBet - table.players[i].money,
    })
  })
}

const myArray = [
  {
    id: 'vwlchdYH0eaf20TIAAAA',
    name: '123',
    money: 0,
    dealer: true,
    isMyTurn: true,
    isPlaying: false
  },
  {
    id: '280j7Ep6Ir_NprJ0AAAB',
    name: 'asd',
    money: 20,
    dealer: false,
    isMyTurn: false,
    isPlaying: true
  },
  {
    id: 'QEmJIxAtCvAvbW7HAAAC',
    name: 'zxc',
    money: 40,
    dealer: false,
    isMyTurn: false,
    isPlaying: true
  }
]

const idNextTurn = currentId => {
  let curIndex = table.players.findIndex((element) => element.id === currentId)
  for(let i of table.players) {
    if(table.players[getIndex(table.players.length, curIndex+1)].isPlaying) {
      return table.players[getIndex(table.players.length, curIndex+1)].id
    } else {
      curIndex++
    }
  }
  return curIndex
}
