import {AppState, Text, ToastAndroid} from 'react-native'
import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { CHAT_SCREEN, CONNECTION_SCREEN, REQUEST_CREATE_CHAT, REQUEST_CREATE_MESSAGE, RESPONSE_CHAT_CREATED, RESPONSE_MESSAGE_CREATED, SAVED_TERMINAL_ADDRESS_STORAGE_KEY } from './src/misc/constants';
import { ChatScreen } from './src/screens/ChatScreen';
import { ConnectionScreen } from './src/screens/ConnectionScreen'
import { createStackNavigator } from '@react-navigation/stack'
import useInterval from 'react-useinterval'
import RNBluetoothClassic from 'react-native-bluetooth-classic'
import { disposeBluetoothServicees } from './src/api/bluetoothService';
import { BluetoothConnectionContext, ChatContext } from './src/misc/contexts';
import { bluetoothConnection as initialBluetoothConnection } from './src/models/bluetoothConnection'
import { bluetoothEventsEmitter, chatEventsEmitter } from './src/misc/emitters';
import AsyncStorage from '@react-native-community/async-storage';
import { createEmptyChat, saveRecievedChat, createMessage as createMsg, getChatById, saveRecievedMessage } from './src/api/messageService';


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

    await RNBluetoothClassic.writeToDevice(recieverAddress, JSON.stringify({
      action: REQUEST_CREATE_CHAT, payload: { chat: await createEmptyChat(recieverAddress, '')}
    }) + '\r', "utf-8") //save waiting
  }

  const createMessage = async (params) => {
    const { recieverAddress, chatId, text } = params
    
    console.log('create message')

    await RNBluetoothClassic.writeToDevice(recieverAddress, JSON.stringify({
      action: REQUEST_CREATE_MESSAGE, payload: { message: await createMsg(text, chatId, 'replace with mac???', recieverAddress)}
    }) + '\r', "utf-8")
  }

  const onMessageRecieved = async () => {

  }

  useEffect(async () => {
    chatEventsEmitter.on(REQUEST_CREATE_CHAT, createChat)
    chatEventsEmitter.on(REQUEST_CREATE_MESSAGE, createMessage)

    return () => {
      chatEventsEmitter.off(REQUEST_CREATE_CHAT, createChat)
      chatEventsEmitter.off(REQUEST_CREATE_MESSAGE, createMessage)
    }
  }, [])

  useEffect(async () => {
    console.log('currentChat updated -> ', currentChat?.id)
    
    if (currentChat?.id) {
      const chat = await getChatById(currentChat?.id)

      console.log(chat)
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

      switch (data.action) {        
        case RESPONSE_CHAT_CREATED:
          ToastAndroid.show('chat with device ' + device.name + ' initialized!', 3000)

          setCurrentChat(await getChatById(data.payload.chatId))

          break;
        case REQUEST_CREATE_CHAT: 
          const chat = data.payload.chat

          await saveRecievedChat(chat)

          await RNBluetoothClassic.writeToDevice(device.address, JSON.stringify({
            action: RESPONSE_CHAT_CREATED, payload: { chatId: chat.id }}) + '\r');

          setCurrentChat(chat)
          
          ToastAndroid.show('chat with device ' + device.name + ' initialized!', 3000)

          break;
        case REQUEST_CREATE_MESSAGE:
          const message = data.payload.message
          
          saveRecievedMessage(message)

          await RNBluetoothClassic.writeToDevice(device.address, JSON.stringify({ action: RESPONSE_MESSAGE_CREATED, payload: { messageId: message.id }}) + '\r')

          ToastAndroid.show('message recieved from device ' + device.name, 3000)

          break;

        case RESPONSE_MESSAGE_CREATED: 
          ToastAndroid.show('message recieved on device ' + device.name, 3000)

          break;
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

      handleDeviceData(terminal)
    }
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

            setBluetoothConnection({...bluetoothConnection, terminal: device})
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
    console.log(acceptModeEnabled)

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
