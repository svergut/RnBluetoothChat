import React from "react";
import { useContext } from "react";
import { useEffect } from "react";
import { ScrollView, Text, ToastAndroid, TouchableOpacity, View } from "react-native";
import { disposeBluetoothServicees, startWaitingForConnection } from "../api/bluetoothService";
import { BluetoothConnectionContext } from "../misc/contexts";
import RNBluetoothClassic from 'react-native-bluetooth-classic'
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { CHAT_SCREEN } from "../misc/constants";


export function ConnectionScreen() {
    const { bluetoothConnection, setBluetoothConnection } = useContext(BluetoothConnectionContext)
    
    const [ bondedDevices, setBondedDevices ] = useState([])

    const navigation = useNavigation()

    useEffect(async () => {
        const devices = await RNBluetoothClassic.getBondedDevices()

        setBondedDevices(devices)
    })

    const connectDevice = async (device) => {
        try {
            const connectedDevice = await RNBluetoothClassic.connectToDevice(device.address)

            setBluetoothConnection({...bluetoothConnection, terminal: connectedDevice})
        }
        catch (e) {
            ToastAndroid.show('Произошла ошибка при подключении: ' +  e.message, 5000)
        }
    }

    const disconnectDevice = async (device) => {
        await RNBluetoothClassic.disconnectFromDevice(device.address)

        if (bluetoothConnection.terminal?.address === device.address)
            setBluetoothConnection({...bluetoothConnection, terminal: null})
    }

    const startChat = async (device) => {
        navigation.navigate(CHAT_SCREEN, { recieverMac: device.address})
    }

    return (
        <ScrollView>
            <View>
                <Text style={{textAlign: 'center', marginTop: 7, marginBottom: 5, fontSize: 22}}>Подключенные устройства</Text>
                <View>
                    <ScrollView>
                    {
                        bluetoothConnection.terminal ?
                            (<DeviceRow onConnectPress={connectDevice} onStartChatPress={startChat} onDisconnectPress={disconnectDevice} key={bluetoothConnection.terminal.address} 
                                device={bluetoothConnection.terminal} />) : <Text style={{textAlign: 'center'}}>Нет подключенных устройств</Text>
                    }
                    </ScrollView>
                </View>
            </View>
            <View>
                <Text style={{textAlign: 'center', marginTop: 7, marginBottom: 5, fontSize: 22}}>Доступные устройства</Text>
                <View>
                    <ScrollView>
                    {
                        bondedDevices.map((device) => {
                            if (device.address !== bluetoothConnection.terminal?.address)
                                return <DeviceRow onConnectPress={connectDevice} onDisconnectPress={disconnectDevice} key={device.address} device={device} />
                        })
                    }
                    </ScrollView>
                </View>
            </View>
        </ScrollView>
    )
}


function DeviceRow(props) {
    const { bluetoothConnection } = useContext(BluetoothConnectionContext)    

    const { device, onConnectPress, onDisconnectPress, onStartChatPress } = props

    const deviceConnected = bluetoothConnection.terminal && bluetoothConnection.terminal.address === device.address
    const connectButtonColor = deviceConnected ? '#762fe0' : '#5ad664' 
    const disconnectButtonColor = deviceConnected ? '#c9001e' : null
    const connectButtonText = deviceConnected ? 'go to chat' : 'connect'    
    
    return (
        <View style={{flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 30, justifyContent: 'space-between'}}>
            <Text style={{width: '20%'}}>{device.name}</Text>
            <Text>{device.address}</Text>
            <CommonButton text={connectButtonText} color={connectButtonColor} onPress={() => deviceConnected ? onStartChatPress(device) : onConnectPress(device) }/>
            <CommonButton color={disconnectButtonColor} text={'disconnect'} onPress={() => onDisconnectPress(device)}/>
        </View>
    )
} 

function CommonButton(props) {
    const { onPress, text, color, disabled } = props

    const buttonColor = color ?? '#bfbfbf'    

    return (
        <TouchableOpacity onPress={!disabled ? onPress : () => {}}>
            <View style={{padding: 7, paddingHorizontal: 12, backgroundColor: buttonColor}}>
                <Text>{text}</Text>
            </View>
            
        </TouchableOpacity>
    )
}
