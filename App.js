import {Text} from 'react-native'
import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { CHAT_SCREEN, CONNECTION_SCREEN } from './src/misc/constants';
import { ChatScreen } from './src/screens/ChatScreen';
import { ConnectionScreen } from './src/screens/ConnectionScreen'
import { createStackNavigator } from '@react-navigation/stack'

function App() {  
  const Stack = createStackNavigator()

  return  (
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
  )
}

export default App;
