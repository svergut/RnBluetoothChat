import {AppState, Text, ToastAndroid} from 'react-native'
import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { CHAT_NEW_MESSAGE, CHAT_SCREEN, CHAT_STATUS_CLOSED, CONNECTION_SCREEN, DEVICE_CONNECTED, REQUEST_CHAT_CLOSURE, REQUEST_CREATE_CHAT, REQUEST_CREATE_MESSAGE, REQUEST_HANDSHAKE, RESPONSE_CHAT_CLOSED, RESPONSE_CHAT_CREATED, RESPONSE_HANDSHAKE, RESPONSE_MESSAGE_CREATED, SAVED_TERMINAL_ADDRESS_STORAGE_KEY } from './src/misc/constants';
import { ChatScreen } from './src/screens/ChatScreen';
import { ConnectionScreen } from './src/screens/ConnectionScreen'
import { createStackNavigator } from '@react-navigation/stack'
import useInterval from 'react-useinterval'
import RNBluetoothClassic from 'react-native-bluetooth-classic'
import { disposeBluetoothServicees, sendBluetoothMessage } from './src/api/bluetoothService';
import { BluetoothConnectionContext, ChatContext } from './src/misc/contexts';
import { bluetoothConnection as initialBluetoothConnection } from './src/models/bluetoothConnection'
import { bluetoothEventsEmitter, chatEventsEmitter } from './src/misc/emitters';
import AsyncStorage from '@react-native-community/async-storage';
import { createEmptyChat, saveRecievedChat, createMessage as createMsg, getChatById, saveRecievedMessage, getExistingChat, saveMessageToStorage, addChatToStorage } from './src/api/messageService';


const Stack = createStackNavigator()

function App() {  
  const [bluetoothConnection, setBluetoothConnection] = useState(initialBluetoothConnection)
  const [currentChat, setCurrentChat] = useState(null)
  const [terminalSubscription, setTerminalSubscription] = useState(null)

  useEffect(() => {
    AppState.addEventListener("change", _handleAppStateChange);

    return () => {
      AppState.removeEventListener("change", _handleAppStateChange);
    };
  }, []);

  //debug
  const _handleAppStateChange = async (nextAppState) => {
    if (nextAppState === 'background')
      await RNBluetoothClassic.cancelAccept()
  }

  const createChat = async (params) => {
    const { recieverAddress } = params

    const existingChatWithReciever = await getExistingChat(recieverAddress)

    if (existingChatWithReciever) {    
      setCurrentChat(existingChatWithReciever)
    } 
    else {
      sendBluetoothMessage(recieverAddress, JSON.stringify({
        action: REQUEST_CREATE_CHAT, payload: { chat: await createEmptyChat(recieverAddress, '')}
      }))
    }   
  }

  const createMessage = async (params) => {
    const { recieverAddress, chatId, text, recieverName } = params

    await sendBluetoothMessage(recieverAddress, JSON.stringify({
      action: REQUEST_CREATE_MESSAGE, payload: { message: await createMsg(text, chatId, 'OWN:DEVICE:MAC', 'Me', recieverAddress, recieverName)}
    }))
  }
  
  const onMessageRecieved = async (params) => {
    const { message } = params

    saveMessageToStorage(message.chatId, message)
  }

  const onDeviceConnected = async (props) => {
    const { deviceAddress } = props

    const device = await RNBluetoothClassic.getConnectedDevice(deviceAddress)

    if (device) {
      setBluetoothConnection({...bluetoothConnection, terminal: device})
    }
  }

  const closeChat = async (chatId) => {
    const oldChat = await getChatById(chatId)
    const chat = { ...oldChat, status: CHAT_STATUS_CLOSED }
          
    addChatToStorage(chat)

    setCurrentChat((previousChat) => {
      console.log(previousChat)
      console.log(chat)

      if (previousChat && previousChat.id === chatId)
        return chat
      else 
        return previousChat
    })
  }

  const requestCloseChat = async (props) => {
    const { deviceAddress, chatId} = props

    await sendBluetoothMessage(deviceAddress, JSON.stringify({ action: REQUEST_CHAT_CLOSURE, payload: { chatId: chatId} }))
  }

  useEffect(async () => {
    chatEventsEmitter.on(REQUEST_CREATE_CHAT, createChat)
    chatEventsEmitter.on(REQUEST_CREATE_MESSAGE, createMessage)  
    chatEventsEmitter.on(CHAT_NEW_MESSAGE, onMessageRecieved) 
    chatEventsEmitter.on(REQUEST_CHAT_CLOSURE, requestCloseChat)

    bluetoothEventsEmitter.on(DEVICE_CONNECTED, onDeviceConnected)

    return () => {
      chatEventsEmitter.off(REQUEST_CREATE_CHAT, createChat)
      chatEventsEmitter.off(REQUEST_CREATE_MESSAGE, createMessage)
      chatEventsEmitter.off(CHAT_NEW_MESSAGE, onMessageRecieved)
      chatEventsEmitter.off(REQUEST_CHAT_CLOSURE, requestCloseChat)

      bluetoothEventsEmitter.off(DEVICE_CONNECTED, onDeviceConnected)
    }
  }, [])

  useEffect(async () => {
    console.log('currentChat updated -> ', currentChat?.id, 'status:', currentChat?.status)
    
    if (currentChat?.id) {
      const chat = await getChatById(currentChat?.id)
    }    
  }, [currentChat])

  const handleDeviceData = async (device) => {
    const dataAvailable = await device.available()

    if (dataAvailable > 0) {
      const rawData = await device.read()

      if (!rawData)
        return;

      const data = JSON.parse(rawData)

      if (data > 1)
        throw new Error('Unexpected behaviour 0_0')

      if (!data.action)
        throw new Error('Invalid message format. Message: ' +  data)

      const { chatId } = data.payload ?? {}      

      switch (data.action) {        
        case RESPONSE_CHAT_CREATED:
          ToastAndroid.show('chat with device ' + device.name + ' initialized!', 3000)

          setCurrentChat(await getChatById(data.payload.chatId))

          break;
        case REQUEST_CREATE_CHAT: 
          const chat = { ...data.payload.chat, recieverMac: device.address, recieverName: 'other name' }          

          await saveRecievedChat(chat)

          await sendBluetoothMessage(device.address, JSON.stringify({
            action: RESPONSE_CHAT_CREATED, payload: { chatId: chat.id }}))

          setCurrentChat(chat)
          
          ToastAndroid.show('chat with device ' + device.name + ' initialized!', 3000)

          break;
        case REQUEST_CREATE_MESSAGE:
          const message = {...data.payload.message, senderName: device.name, recieverName: 'Me', senderMac: device.address }
          
          saveRecievedMessage(message)

          await sendBluetoothMessage(device.address, JSON.stringify({ action: RESPONSE_MESSAGE_CREATED, payload: { message: message }}))

          chatEventsEmitter.emit(CHAT_NEW_MESSAGE, { message: message })

          ToastAndroid.show('message recieved from device ' + device.name, 3000)

          break;

        case RESPONSE_MESSAGE_CREATED:  
          const msg = data.payload.message       
          console.log('message', msg)
          chatEventsEmitter.emit(CHAT_NEW_MESSAGE, { message: msg})

          ToastAndroid.show('message recieved on device ' + device.name, 3000)

          break;

        case REQUEST_HANDSHAKE:        
          await sendBluetoothMessage(device.address, JSON.stringify({ action: RESPONSE_HANDSHAKE }));

          bluetoothEventsEmitter.emit(DEVICE_CONNECTED, { deviceAddress: device.address })
        
          break;
        
        case RESPONSE_HANDSHAKE:
          bluetoothEventsEmitter.emit(DEVICE_CONNECTED, { deviceAddress: device.address })

          break;

        case REQUEST_CHAT_CLOSURE:         
          await closeChat(chatId)

          await sendBluetoothMessage(device.address, JSON.stringify({ action: RESPONSE_CHAT_CLOSED, payload: { chatId: chatId } }))

          break;
        
        case RESPONSE_CHAT_CLOSED:
          console.log('response: chat closed!')

          await closeChat(chatId)
      }
    }
  }

  //connection checking
  useInterval(async () => {
    const terminal = bluetoothConnection.terminal  
    
    if (terminal) {
      const terminalConnected = await terminal.isConnected()

      if (!terminalConnected)
      {
        setBluetoothConnection({...bluetoothConnection, terminal: null})
        return
      }      
    }

    const connectedDevices = await RNBluetoothClassic.getConnectedDevices()

    connectedDevices.forEach((device) => {
      handleDeviceData(device)
    })
  }, 500)

  useEffect(async () => { 
    const savedTerminalAddress = await AsyncStorage.getItem(SAVED_TERMINAL_ADDRESS_STORAGE_KEY)

    if (savedTerminalAddress) {
      let reconnectAttempts = 3

      while (reconnectAttempts > 0) {
        reconnectAttempts--

        try {
          const device = await RNBluetoothClassic.connectToDevice(savedTerminalAddress, {delimiter: '\r'})          

          if (device) 
          {
            reconnectAttempts = 0

            await sendBluetoothMessage(device.address, JSON.stringify({ action: REQUEST_HANDSHAKE }))            
          }
        }
        catch (e) {
          console.log('an exception during attempt to connect saved terminal:', e.message)
        }
      }
    }
  }, [])


  useEffect(async () => {
    const terminal = bluetoothConnection.terminal

    if (terminal) {
      await AsyncStorage.setItem(SAVED_TERMINAL_ADDRESS_STORAGE_KEY, terminal.address)

      //setTerminalSubscription(terminal.onDataReceived((data) => console.log('on data recieved data:', data)))
    }
    else {
      await AsyncStorage.removeItem(SAVED_TERMINAL_ADDRESS_STORAGE_KEY)

      terminalSubscription?.cancel()
      
      setTerminalSubscription(null)
    }
  }, [bluetoothConnection.terminal])
  
  useEffect(async () => {
    const acceptModeEnabled = bluetoothConnection.acceptModeEnabled

    if (!bluetoothConnection.acceptModeEnabled) {
      try {
        setBluetoothConnection({...bluetoothConnection, acceptModeEnabled: true})
      
        const connectedTerminal = await RNBluetoothClassic.accept({ delimiter: "\r" }) 

        await RNBluetoothClassic.cancelAccept()

        setBluetoothConnection({...bluetoothConnection, acceptModeEnabled: false, terminal: connectedTerminal})
      }
      catch (e) {
        console.log(e.message)
      }
    }

    return async () => {    
      await RNBluetoothClassic.cancelAccept()
    }
  }, [bluetoothConnection.acceptModeEnabled])  

  return  (    
    <ChatContext.Provider value={{ currentChat, setCurrentChat }}>
      <BluetoothConnectionContext.Provider value={{ bluetoothConnection, setBluetoothConnection }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={CONNECTION_SCREEN}
          headerMode="none">
          <Stack.Screen
            name={CHAT_SCREEN}
            component={ChatScreen}/>
          <Stack.Screen 
            name={CONNECTION_SCREEN}
            component={ConnectionScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </BluetoothConnectionContext.Provider>
    </ChatContext.Provider>
  )
}

export default App;
