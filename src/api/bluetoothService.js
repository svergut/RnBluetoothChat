import { REQUEST_CREATE_CHAT, REQUEST_CREATE_MESSAGE } from "../misc/constants";
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic'


export async function sendResponselessRequest() {
    
}

export async function sendRequest(reciever, request) {
    if (request.action === REQUEST_CREATE_MESSAGE) {
        
    }
    else if (request.action === REQUEST_CREATE_CHAT) {
        
    }
}

export async function sendBluetoothMessage(deviceAddress, message) {
    if (!deviceAddress) {
      console.log('Cannot send message: device is not connected')
      return;
    }

    await RNBluetoothClassic.writeToDevice(deviceAddress, message + '\r', "utf-8")
  }

