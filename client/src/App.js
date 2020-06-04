import React, { useState, useEffect } from 'react';

const io = require('socket.io-client');
const socket = io('http://localhost:3011');
function App() {
  
  const [inputValue, setInputValue] = useState('')
  const [messageList, addMessage] = useState([])
  const [auth, setAuth] = useState(false)
  const [numOfUsers, setUsers] = useState(0)
  const [canGameStart, setCanGameStart] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [myUser, setMyUser] = useState({})
  const [isMyTurn, setisMyTurn] = useState(false)
  const [canICheck, setCanICheck] = useState(false)
  const [howMuchToCall, setHowMuchToCall] = useState(0)
  const [smalBlind, setSmalBlind] = useState(0)
  const [handCards, sethandCards] = useState([])
  const [tablePlay, setTablePlay] = useState([])
  const [tableCard, setTableCard] = useState([])
  

  const updateDate = payload => {    
    setAllUsers(payload.players)
    setTablePlay(payload.table.players)
    setTableCard(payload.table.cards)
    setisMyTurn(payload.whosTurn === myUser.id)
    setSmalBlind(payload.smallBlind)
  }
  

  useEffect(() => { //логи и чат    
    socket.on('new message', payload => {
      addMessage(messageList.concat(payload.username +': '+ payload.message))
    });
    socket.on('user joined', payload => {
      addMessage(messageList.concat('User connected ' + payload.username))
      setUsers(payload.numUsers)
      setCanGameStart(payload.canGameStart)
    });
    socket.on('login', payload => {
      setUsers(payload.numUsers)
      setCanGameStart(payload.canGameStart)
      setMyUser(payload.user)
    });
    socket.on('user left', payload => {
      addMessage(messageList.concat('User disconected' + payload.username))
      setUsers(payload.numUsers)
    });
  }); 
  
  useEffect(() => { //init game   
    socket.on('init players', payload => {
      setCanGameStart(payload.canGameStart)
      updateDate(payload)
    });
    socket.on('drow cards', payload => {
      sethandCards(payload.drowCards)
      setCanICheck(payload.canICheck)
      setHowMuchToCall(payload.howMuchToCall)
    });
  }); 

  useEffect(() => { 
    const id1 =  myUser.id + ' '  
    socket.on('reload', payload => {
      console.log(id1)
      setAllUsers(payload.players)
      setTablePlay(payload.table.players)
      setTableCard(payload.table.cards)
      setisMyTurn(payload.whosTurn === myUser.id)
      setSmalBlind(payload.smallBlind)
    });
  })

  const handleNewMessage = () => {
    addMessage(messageList.concat('You: ' + inputValue))
    socket.emit('new message', inputValue);
    setInputValue('')
  }

  const handleLogin = () => {
    setAuth(true)
    socket.emit('add user', inputValue);
    setInputValue('')
  }

  const handleStartGame = () => {
    socket.emit('start game', 'start game');
    setCanGameStart(false)
  }

  const handleGameButton = event => {
    socket.emit('press the button', {
      button: event.target.name,
      id: myUser.id,
      raise: smalBlind*3
    })
  }
  const messages = messageList.map((e, i) => <li key={i}>{e}</li>)
  const users = allUsers.map((e, i) => <li key={i}>{e.name} - {e.money}</li>)
const hand = handCards.map((e, i) => <li key={i}>Масть {e.suit}/ Значение{e.rank}</li>)
const tableStatus = tablePlay.map((e, i) => <li key={i}>{e.name} Ставка {e.money} {e.dealer ? 'Диллер' : ''}{e.isMyTurn ? 'Ход' : ''}</li>)
const tableCardsShow = tableCard.map((e, i) => <li key={i}>Масть {e.suit}/ Значение{e.rank}</li>)
return (
    <div className={`App `}>
      <header className="App-header">
        <img  className="App-logo" alt="logo" />

        <h1>
          You Have Entered The Room {myUser.id}
        </h1>
        {
          isMyTurn && 
          <div>
            <button name='Fold' onClick={handleGameButton}>Fold</button>
            {
              canICheck ? 
              <div>
                <button name='Check' onClick={handleGameButton}>Check</button>
              </div> :
              <div>
                <button name='Call' onClick={handleGameButton}>Call {howMuchToCall}</button>
              </div>
            }
            <button name='Raise' onClick={handleGameButton}>Raise to {smalBlind*3}</button>
          </div>
          }
        {(canGameStart & auth) && <button onClick={handleStartGame}>Start game</button>}<br /><br />
        Рука
        <ul>
          {hand}
        </ul>
        <br />
        Игроки
    <ul>
      {users}</ul>
        <br /><br />
        Стол
    <ul>
      {tableStatus}</ul>
        <br />
    <ul>
      {tableCardsShow}</ul>
        
        <br />

        <input onChange={e => setInputValue(e.target.value)} value={inputValue} />
        {!auth ? 
        <button onClick={handleLogin}>
          Login
        </button> : 
        <button onClick={handleNewMessage}>
          Emit new message
        </button>}
        
          Количестов юзеров: 
          {numOfUsers}
        <ul>
        {messages}
        </ul>

        

      </header>
    </div>
  );
}

export default App;