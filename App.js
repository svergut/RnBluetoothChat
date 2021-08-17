import {AppState, Text} from 'react-native'
import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { CHAT_SCREEN, CONNECTION_SCREEN, REQUEST_CREATE_CHAT, REQUEST_CREATE_MESSAGE, SAVED_TERMINAL_ADDRESS_STORAGE_KEY } from './src/misc/constants';
import { ChatScreen } from './src/screens/ChatScreen';
import { ConnectionScreen } from './src/screens/ConnectionScreen'
import { createStackNavigator } from '@react-navigation/stack'
import useInterval from 'react-useinterval'
import RNBluetoothClassic from 'react-native-bluetooth-classic'
import { disposeBluetoothServicees } from './src/api/bluetoothService';
import { BluetoothConnectionContext } from './src/misc/contexts';
import { bluetoothConnection as initialBluetoothConnection } from './src/models/bluetoothConnection'
import { bluetoothEventsEmitter, chatEventsEmitter } from './src/misc/emitters';
import AsyncStorage from '@react-native-community/async-storage';
import { createEmptyChat } from './src/api/messageService';


const Stack = createStackNavigator()

function App() {  
  const [bluetoothConnection, setBluetoothConnection] = useState(initialBluetoothConnection)
  const [requestInProgress, setRequestInProgress] = useState(false)

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

    setRequestInProgress(true)

    await RNBluetoothClassic.writeToDevice(recieverAddress, JSON.stringify({
      action: REQUEST_CREATE_CHAT, data: await createEmptyChat(recieverAddress, '')
    }) + '\r', "utf-8")

    let dataAvailable = await RNBluetoothClassic.availableFromDevice(recieverAddress)
    let timeLeft = 4000
    const timeStep = 100

    while (timeLeft > 0 && dataAvailable === 0) {
      await new Promise(resolve => setTimeout(resolve, timeStep))

      timeLeft -= timeStep

      dataAvailable = await RNBluetoothClassic.availableFromDevice(recieverAddress)
    }

    if (dataAvailable > 0) {
      const data = await RNBluetoothClassic.readFromDevice(recieverAddress)

      console.log(data)
    }
    else {
      throw new Error('No response from device ', recieverAddress, 'in 4 seconds!')
    }
  }

  const createMessage = async (chatId, message) => {

  }

  useEffect(async () => {
    chatEventsEmitter.on(REQUEST_CREATE_CHAT, createChat)
    chatEventsEmitter.on(REQUEST_CREATE_MESSAGE, createMessage)

    return () => {
      chatEventsEmitter.off(REQUEST_CREATE_CHAT, createChat)
      chatEventsEmitter.off(REQUEST_CREATE_MESSAGE, createMessage)
    }
  }, [])

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

      const dataAvailable = await terminal.available()

      if (!requestInProgress && dataAvailable > 0) {
        const data = await terminal.read()

        console.log('recieved', data, 'from terminal', terminal.address)
        console.log('sending answer')

        await terminal.write('respond' + '\r', 'utf-8')
      }
    }
  }, 1000)

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
    }
    else {
      await AsyncStorage.removeItem(SAVED_TERMINAL_ADDRESS_STORAGE_KEY)
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
  )
}

export default App;
